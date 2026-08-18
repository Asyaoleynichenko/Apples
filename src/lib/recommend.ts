import { CATALOG, PRODUCTS, formatPrice } from '../data/products';
import type { BeautyProfile, Product, Slots } from './types';

export type Match = {
  /** ok — everything fits. relaxed — budget had to stretch. soft — nothing fits, showing closest. none — impossible. */
  kind: 'ok' | 'relaxed' | 'soft' | 'none';
  ids: string[];
  bestId: string | null;
  notes: Record<string, string>;
  /** Explanation the assistant reads out when it cannot fully satisfy the request. */
  reason: string;
};

export const EMPTY_SLOTS: Slots = {
  group: null,
  type: null,
  need: null,
  needLabel: null,
  priority: null,
  budgetMax: null,
  budgetLabel: null,
  texture: null,
  avoid: [],
  giftFor: null,
};

/** Real constraints only — `'none'` means the user skipped the question. */
export function namedAvoid(slots: Slots, profile: BeautyProfile) {
  return [...slots.avoid, ...profile.dislikes].filter((a) => a && a !== 'none');
}

/* ------------------------------------------------------------- filtering */

/** Constraints the assistant refuses to break, because the user named them. */
function passesHardFilters(p: Product, slots: Slots, profile: BeautyProfile): boolean {
  if (profile.dislikedProducts.includes(p.id)) return false;

  const avoid = namedAvoid(slots, profile);
  const avoidsFragrance = avoid.some((a) => /отдушк|запах|аромат/i.test(a));
  const avoidsRich = avoid.some((a) => /плотн|густ|тяжёл|тяжел/i.test(a));

  if (avoidsFragrance && p.fragrance === 'strong') return false;
  if (avoidsRich && p.texture === 'rich') return false;
  if (slots.group && p.group !== slots.group) return false;
  if (slots.type && p.type !== slots.type) return false;
  return true;
}

function score(p: Product, slots: Slots, profile: BeautyProfile): number {
  let s = p.rating * 1.2 + Math.log10(Math.max(p.reviews, 1)) * 1.4;

  if (slots.texture && p.texture === slots.texture) s += 4;
  else if (slots.texture === 'light' && p.texture === 'rich') s -= 3;
  else if (slots.texture === 'rich' && p.texture === 'light') s -= 2;

  const skin = slots.need ?? profile.skinType;
  if (skin) {
    if (p.skinTypes.includes(skin)) s += 3;
    else if (!p.skinTypes.includes('все типы')) s -= 2;
  }

  const budget = slots.budgetMax ?? profile.budgetMax;
  if (budget) s += p.price <= budget ? 2.5 : -Math.min(4, (p.price - budget) / budget * 4);

  switch (slots.priority ?? profile.priorities[0]) {
    case 'Цена':
      s += Math.max(0, 4 - p.price / 2500);
      break;
    case 'Отзывы':
      s += Math.log10(Math.max(p.reviews, 1)) * 1.6;
      break;
    case 'Эффект':
      s += p.effects.length * 0.8;
      break;
    case 'Состав':
      s += p.ingredients.length * 0.8;
      break;
    case 'Текстура':
      s += p.texture === 'light' ? 1.5 : 0;
      break;
    case 'Новинка':
      s += p.tags.includes('новинка') ? 3 : 0;
      break;
  }

  // Anything the assistant has already learned nudges the order.
  if (profile.likedProducts.some((id) => PRODUCTS[id]?.texture === p.texture)) s += 1.5;
  if (profile.likedProducts.some((id) => PRODUCTS[id]?.brand === p.brand)) s += 1;
  if (profile.dislikedProducts.some((id) => PRODUCTS[id]?.brand === p.brand)) s -= 2;
  if (p.reviews < 20) s -= 1.5;

  return s;
}

/** One short line per card, explaining why it made the list. */
function noteFor(p: Product, slots: Slots, profile: BeautyProfile, widenedFrom: Slots['type'] = null): string {
  const budget = slots.budgetMax ?? profile.budgetMax;
  if (widenedFrom && p.type !== widenedFrom) return `${p.category.toLowerCase()} — соседняя категория`;
  if (budget && p.price > budget) return `дороже бюджета на ${formatPrice(p.price - budget)}`;
  if (slots.texture && p.texture === slots.texture) return `${p.textureLabel} — как ты просила`;
  if (slots.need && p.skinTypes.includes(slots.need)) return `подходит для «${slots.need}»`;
  if (p.fragrance === 'none') return p.fragranceLabel;
  if (p.reviews > 1000) return `${p.rating} из ${p.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')} отзывов`;
  if (p.tags.includes('бюджетно')) return 'самый доступный в подборке';
  if (p.reviews < 20) return 'новинка, отзывов пока мало';
  return `${p.textureLabel}, ${p.rating} из 5`;
}

/* ---------------------------------------------------------------- public */

export function recommend(slots: Slots, profile: BeautyProfile, limit = 3): Match {
  let pool = CATALOG.filter((p) => passesHardFilters(p, slots, profile));

  // One survivor is not a choice. Step out of the narrow product type into the
  // wider shelf so there is something to compare against.
  let widened = false;
  if (pool.length < 2 && slots.type) {
    const wider = CATALOG.filter((p) => passesHardFilters(p, { ...slots, type: null }, profile));
    if (wider.length > pool.length) {
      pool = wider;
      widened = true;
    }
  }

  if (!pool.length) {
    return { kind: 'none', ids: [], bestId: null, notes: {}, reason: impossibleReason(slots, profile) };
  }

  const ranked = [...pool].sort((a, b) => score(b, slots, profile) - score(a, slots, profile));
  const budget = slots.budgetMax ?? profile.budgetMax;
  const inBudget = budget ? ranked.filter((p) => p.price <= budget) : ranked;

  let kind: Match['kind'] = 'ok';
  let picked: Product[];
  let reason = '';

  if (!budget || inBudget.length >= 2) {
    picked = inBudget.slice(0, limit);
  } else if (inBudget.length === 1) {
    kind = 'relaxed';
    const rest = ranked.filter((p) => p.price > budget).slice(0, limit - 1);
    picked = [inBudget[0], ...rest];
    reason = `В бюджет до ${formatPrice(budget)} попадает только один вариант — показываю его первым, а рядом ещё ${rest.length === 1 ? 'один' : 'два'} чуть дороже, чтобы было с чем сравнить.`;
  } else {
    kind = 'soft';
    picked = ranked.slice(0, limit);
    const cheapest = ranked.reduce((a, b) => (a.price < b.price ? a : b));
    reason = `Честно: строго до ${formatPrice(budget)} варианта, которому я готова сказать уверенное «да», сейчас нет. Самое близкое — ${cheapest.brand} за ${formatPrice(cheapest.price)}.`;
  }

  if (widened && slots.type) {
    const near = picked.filter((p) => p.type !== slots.type).length;
    if (near) {
      const extra = `Строго в категории «${TYPE_LABEL[slots.type]}» подходящего почти нет, поэтому смотрю шире — по задаче, а не по полке.`;
      reason = reason ? `${reason} ${extra}` : extra;
      if (kind === 'ok') kind = 'relaxed';
    }
  }

  const notes: Record<string, string> = {};
  for (const p of picked) notes[p.id] = noteFor(p, slots, profile, widened ? slots.type : null);

  return { kind, ids: picked.map((p) => p.id), bestId: picked[0]?.id ?? null, notes, reason };
}

function impossibleReason(slots: Slots, profile: BeautyProfile): string {
  const parts: string[] = [];
  if (slots.group === 'fragrance') parts.push('парфюмерии в подборке, которую я знаю, пока нет');
  else if (slots.type) parts.push(`подходящего варианта в категории «${TYPE_LABEL[slots.type]}»`);
  const avoid = namedAvoid(slots, profile);
  if (avoid.length) parts.push(`без ${avoid.join(' и ').toLowerCase()}`);
  if (slots.budgetMax) parts.push(`до ${formatPrice(slots.budgetMax)}`);
  return parts.length
    ? `Одновременно ${parts.join(', ')} — не складывается.`
    : 'Под все условия сразу ничего не подходит.';
}

const TYPE_LABEL: Record<NonNullable<Slots['type']>, string> = {
  cream: 'кремы',
  cleanser: 'очищение',
  lipstick: 'помады',
  foundation: 'тональные',
  mist: 'спреи и мисты',
};

/**
 * Scenario 8 — cheaper alternatives. Stays inside the same shelf while it can,
 * so "дешевле этой помады" never answers with a body cream.
 */
export function cheaperThan(productId: string, profile: BeautyProfile, limit = 2): string[] {
  const base = PRODUCTS[productId];
  const eligible = CATALOG.filter(
    (p) => p.id !== base.id && p.price < base.price && !profile.dislikedProducts.includes(p.id),
  );
  const sameShelf = eligible.filter((p) => p.group === base.group);
  return (sameShelf.length ? sameShelf : eligible)
    .sort((a, b) => b.price - a.price)
    .slice(0, limit)
    .map((p) => p.id);
}

/** Scenario 9 — same idea, different product. */
export function similarTo(productId: string, profile: BeautyProfile, limit = 3): string[] {
  const base = PRODUCTS[productId];
  const eligible = CATALOG.filter((p) => p.id !== base.id && !profile.dislikedProducts.includes(p.id));
  const sameShelf = eligible.filter((p) => p.group === base.group);
  return (sameShelf.length >= 2 ? sameShelf : eligible)
    .map((p) => {
      let s = 0;
      if (p.group === base.group) s += 4;
      if (p.type === base.type) s += 3;
      if (p.texture === base.texture) s += 2;
      s += p.effects.filter((e) => base.effects.includes(e)).length;
      s -= Math.abs(p.price - base.price) / 4000;
      return { id: p.id, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.id);
}

/** Why a similar product is in the list — the labels the brief asks for. */
export function similarityNote(baseId: string, otherId: string): string {
  const a = PRODUCTS[baseId];
  const b = PRODUCTS[otherId];
  if (b.price < a.price * 0.7) return 'более бюджетный';
  if (b.texture === a.texture) return 'похож по текстуре';
  if (b.effects.some((e) => a.effects.includes(e))) return 'похож по эффекту';
  return 'из той же категории';
}

/** Scenario 11 — never called a trend, only what the content actually shows. */
export function mostMentioned(limit = 3): string[] {
  return [...CATALOG].sort((a, b) => b.mentions - a.mentions).slice(0, limit).map((p) => p.id);
}

/** Scenario 12 — gift picks inside a budget, biased toward what she actually described. */
export function giftPicks(budgetMax: number | null, limit = 3, slots?: Slots): string[] {
  const pool = CATALOG.filter((p) => p.giftReady && (!budgetMax || p.price <= budgetMax));
  const source = pool.length >= 2 ? pool : CATALOG.filter((p) => p.giftReady);
  return [...source]
    .sort((a, b) => {
      const score = (p: typeof a) =>
        (slots?.type && p.type === slots.type ? 4 : 0) +
        (slots?.group && p.group === slots.group ? 2 : 0) +
        p.rating;
      return score(b) - score(a);
    })
    .slice(0, limit)
    .map((p) => p.id);
}

/** Scenario 10 — does this specific product suit the user? */
export function suitability(productId: string, slots: Slots, profile: BeautyProfile) {
  const p = PRODUCTS[productId];
  const budget = slots.budgetMax ?? profile.budgetMax;
  const skin = slots.need ?? profile.skinType;
  const avoid = namedAvoid(slots, profile);

  const items: { ok: boolean; text: string }[] = [];

  if (budget) items.push({ ok: p.price <= budget, text: p.price <= budget ? `в твой бюджет ${formatPrice(budget)}` : `дороже бюджета на ${formatPrice(p.price - budget)}` });
  if (skin) items.push({ ok: p.skinTypes.includes(skin) || p.skinTypes.includes('все типы'), text: p.skinTypes.includes(skin) || p.skinTypes.includes('все типы') ? `подходит для типа «${skin}»` : `не для типа «${skin}»` });
  if (slots.texture) items.push({ ok: p.texture === slots.texture, text: p.texture === slots.texture ? `текстура та, что ты любишь — ${p.textureLabel}` : `текстура другая — ${p.textureLabel}` });

  const fragranceClash = avoid.some((a) => /отдушк|запах|аромат/i.test(a)) && p.fragrance === 'strong';
  const textureClash = avoid.some((a) => /плотн|густ/i.test(a)) && p.texture === 'rich';
  if (fragranceClash) items.push({ ok: false, text: `отдушка ${p.fragranceLabel}, а ты её обычно не любишь` });
  if (textureClash) items.push({ ok: false, text: `текстура плотная, а ты просила без плотных` });

  if (!items.length) {
    items.push({ ok: p.rating >= 4.5, text: `рейтинг ${p.rating} из ${p.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')} отзывов` });
    items.push({ ok: true, text: `${p.textureLabel}` });
  }

  const bad = items.filter((i) => !i.ok);
  const verdict: 'yes' | 'maybe' | 'no' = bad.length === 0 ? 'yes' : bad.length === 1 ? 'maybe' : 'no';
  return { items, verdict, blockers: bad };
}

/** Scenario 13 — a routine assembled only from products that actually exist here. */
export function buildRoutine(profile: BeautyProfile) {
  const skin = profile.skinType ?? 'сухая';
  const cleanser = CATALOG.find((p) => p.routineStep === 'cleanser');
  const cream = [...CATALOG]
    .filter((p) => p.routineStep === 'cream' && p.skinTypes.includes(skin))
    .sort((a, b) => a.price - b.price)[0];

  return [
    {
      time: 'am' as const,
      step: 'очищение',
      productId: cleanser?.id,
      note: cleanser ? `${cleanser.textureLabel}, ${cleanser.fragranceLabel}` : '',
    },
    {
      time: 'am' as const,
      step: 'крем',
      productId: cream?.id,
      note: cream ? `${cream.textureLabel} — база на день` : '',
    },
    {
      time: 'am' as const,
      step: 'SPF',
      note: 'отдельного SPF в подборке, которую я знаю, нет — не буду выдумывать',
    },
    {
      time: 'pm' as const,
      step: 'очищение',
      productId: cleanser?.id,
      note: cleanser ? 'та же пенка, вечером обязательна' : '',
    },
    {
      time: 'pm' as const,
      step: 'крем',
      productId: cream?.id,
      note: cream ? 'вечером можно слоем плотнее' : '',
    },
  ];
}

/** Scenario 20 — has she bought this before? */
export const alreadyBought = (productId: string, profile: BeautyProfile) =>
  profile.purchases.includes(productId);
