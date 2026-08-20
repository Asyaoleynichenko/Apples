import { EDITORIAL, PRODUCTS, flaconForProducts, flaconForQuery, formatPrice, plural } from '../data/products';
import { parse, extractSlots } from './intent';
import {
  EMPTY_SLOTS,
  alreadyBought,
  buildRoutine,
  cheaperThan,
  effectiveTexture,
  giftPicks,
  mostMentioned,
  namedAvoid,
  recommend,
  similarTo,
  similarityNote,
  suitability,
} from './recommend';
import type { Sheet } from './store';
import { uid } from './uid';
import type {
  BeautyProfile,
  ChatContext,
  ChatMessage,
  Conversation,
  ProductGroup,
  QuickReply,
  Slots,
  TextureKey,
} from './types';

export type AiTurn = {
  userText?: string;
  messages: ChatMessage[];
  replies: QuickReply[];
  sheet?: Sheet;
  /** Lines added to the beauty profile's "что я запомнила". */
  learn?: string[];
  profile?: Partial<BeautyProfile>;
  conversation?: Partial<Conversation>;
  /** A second beat, pushed after the first — used for the "смотрю варианты…" pause. */
  then?: AiTurn;
};

export type Ctx = {
  profile: BeautyProfile;
  conv: Conversation;
  chatContext: ChatContext;
};

export const EMPTY_CONVERSATION: Conversation = {
  state: 'IDLE',
  intent: null,
  slots: EMPTY_SLOTS,
  pending: [],
  focusId: null,
  lastIds: [],
  compareIds: [],
  relaxed: false,
  repeatOffered: [],
};

/* ------------------------------------------------------------- shorthands */

const t = (text: string, link?: { label: string; action: string }): ChatMessage => ({
  id: uid('a'),
  role: 'ai',
  kind: 'text',
  text,
  link,
});

/** Flacon first; свотчи float up when the client asked for them. */
function rankContent(id: string, wantSwatch: boolean): number {
  const e = EDITORIAL[id];
  if (!e) return 99;
  let score = 20;
  if (e.kind === 'flacon') score -= 10;
  else if (e.kind === 'video') score -= 4;
  if (wantSwatch && e.topic === 'swatch') score -= 6;
  else if (!wantSwatch && e.topic === 'review') score -= 3;
  return score;
}

const cards = (productIds: string[], notes?: Record<string, string>, bestId?: string): ChatMessage => ({
  id: uid('p'),
  role: 'ai',
  kind: 'products',
  productIds,
  notes,
  bestId,
});

const checks = (title: string, items: { ok: boolean; text: string }[]): ChatMessage => ({
  id: uid('c'),
  role: 'ai',
  kind: 'checks',
  title,
  items,
});

const reply = (label: string, action: string, value?: string): QuickReply => ({ label, action, value });

/* --------------------------------------------------------- reply presets */

const AFTER_RECOMMEND: QuickReply[] = [
  reply('почему именно он?', 'why'),
  reply('сравнить', 'compare'),
  reply('есть дешевле', 'cheaper'),
  reply('показать похожие', 'similar'),
  reply('откуда данные', 'sources'),
  reply('не хочу этот', 'reject'),
  reply('задать другой вопрос', 'new-question'),
  reply('позвать консультанта', 'human'),
];

const AFTER_PRODUCT: QuickReply[] = [
  reply('подойдёт мне?', 'suitability'),
  reply('есть похожий?', 'similar'),
  reply('есть дешевле?', 'cheaper'),
  reply('отзывы', 'reviews'),
  reply('есть обзоры?', 'content'),
  reply('свотчи', 'content', 'свотчи'),
];

const AFTER_WHY: QuickReply[] = [
  reply('посмотреть отзывы', 'reviews'),
  reply('посмотреть источники', 'sources'),
  reply('сравнить', 'compare'),
  reply('вернуться к подборке', 'back-to-list'),
];

const AFTER_SOURCES: QuickReply[] = [
  reply('сравнить', 'compare'),
  reply('вернуться к подборке', 'back-to-list'),
  reply('позвать консультанта', 'human'),
];

const UNKNOWN_REPLIES: QuickReply[] = [
  reply('что мне купить?', 'q:buy'),
  reply('позвать консультанта', 'human'),
  reply('задать другой вопрос', 'new-question'),
];

const NO_MATCH_REPLIES: QuickReply[] = [
  reply('увеличить бюджет', 'widen'),
  reply('убрать ограничение', 'drop-constraint'),
  reply('показать ближайшие варианты', 'closest'),
  reply('позвать консультанта', 'human'),
];

const START_REPLIES: QuickReply[] = [
  reply('что мне купить?', 'q:buy'),
  reply('помоги выбрать', 'q:buy'),
  reply('сравни продукты', 'compare'),
  reply('найди что-нибудь новое', 'popular'),
  reply('позвать консультанта', 'human'),
];

/* ---------------------------------------------------------- clarifiers */

const GROUP_REPLIES: QuickReply[] = [
  // "уход" rather than "уход за лицом": the catalogue the assistant knows
  // covers cleansing and body care, and it should not promise more than that.
  reply('уход', 'slot:group', 'care'),
  reply('макияж', 'slot:group', 'makeup'),
  reply('волосы', 'slot:group', 'hair'),
  reply('парфюм', 'slot:group', 'fragrance'),
  reply('что-нибудь новое', 'slot:group', 'new'),
];

const PRIORITY_REPLIES: QuickReply[] = [
  reply('эффект', 'slot:priority', 'эффект'),
  reply('цена', 'slot:priority', 'цена'),
  reply('состав', 'slot:priority', 'состав'),
  reply('текстура', 'slot:priority', 'текстура'),
  reply('отзывы', 'slot:priority', 'отзывы'),
  reply('новинка', 'slot:priority', 'новинка'),
];

const GIFT_BUDGET_REPLIES: QuickReply[] = [
  reply('до 1 000 ₽', 'gift-budget', '1000'),
  reply('до 3 000 ₽', 'gift-budget', '3000'),
  reply('до 5 000 ₽', 'gift-budget', '5000'),
  reply('до 10 000 ₽', 'gift-budget', '10000'),
  reply('не ограничен', 'gift-budget', 'any'),
];

const AFTER_GIFT: QuickReply[] = [
  reply('задать новый вопрос', 'new-question'),
  reply('купить подарочную карту', 'giftcard'),
  reply('не подходит', 'reject'),
  reply('позвать консультанта', 'human'),
];

const GIFT_BUDGET_LABEL: Record<string, string> = {
  '1000': 'до 1 000 ₽',
  '3000': 'до 3 000 ₽',
  '5000': 'до 5 000 ₽',
  '10000': 'до 10 000 ₽',
  any: 'не ограничен',
};

function presentGifts(slots: Slots): AiTurn {
  const ids = giftPicks(slots.budgetMax, 3, slots);
  const notes = Object.fromEntries(
    ids.map((id) => [id, PRODUCTS[id].tags.includes('подарочно') ? 'беспроигрышный подарок' : `${PRODUCTS[id].rating} из 5`]),
  );
  return {
    messages: [
      t('Я думаю ей понравятся эти продукты. А ещё ты всегда можешь подарить карту золотого яблока!', {
        label: 'подарить карту золотого яблока',
        action: 'giftcard',
      }),
      cards(ids, notes),
    ],
    replies: AFTER_GIFT,
    conversation: {
      state: 'RECOMMENDING',
      lastIds: ids,
      focusId: ids[0],
      compareIds: ids.slice(0, 2),
      slots,
    },
  };
}

const BUDGET_REPLIES: QuickReply[] = [
  reply('до 2 000 ₽', 'slot:budget', '2000'),
  reply('2–5 тыс. ₽', 'slot:budget', '5000'),
  reply('5–10 тыс. ₽', 'slot:budget', '10000'),
  reply('неважно', 'slot:budget', 'any'),
];

const AVOID_REPLIES: QuickReply[] = [
  reply('сильные отдушки', 'slot:avoid', 'сильные отдушки'),
  reply('плотные текстуры', 'slot:avoid', 'плотные текстуры'),
  reply('определённые ингредиенты', 'slot:avoid', 'определённые ингредиенты'),
  reply('ничего', 'slot:avoid', 'none'),
];

const TEXTURE_REPLIES: QuickReply[] = [
  reply('лёгкую', 'slot:texture', 'light'),
  reply('плотную', 'slot:texture', 'rich'),
  reply('неважно', 'slot:texture', 'any'),
];

const CLARIFIERS: Record<string, { question: string; replies: QuickReply[] }> = {
  group: { question: 'Давай разберёмся 💛 Что сейчас хочется подобрать?', replies: GROUP_REPLIES },
  priority: { question: 'А что для тебя сейчас важнее всего?', replies: PRIORITY_REPLIES },
  budget: { question: 'А по бюджету как обычно?', replies: BUDGET_REPLIES },
  avoid: { question: 'Есть что-то, что тебе точно не нравится?', replies: AVOID_REPLIES },
  texture: {
    question: 'Только уточню: хочется лёгкую текстуру или наоборот что-то более насыщенное?',
    replies: TEXTURE_REPLIES,
  },
};

/* ---------------------------------------------------------------- helpers */

const GROUP_WORD: Record<ProductGroup, string> = {
  care: 'уход',
  makeup: 'макияж',
  hair: 'уход за волосами',
  fragrance: 'парфюм',
};

const TYPE_WORD: Record<NonNullable<Slots['type']>, string> = {
  cream: 'крем',
  cleanser: 'очищение',
  lipstick: 'помада',
  foundation: 'тональный',
  mist: 'мист-спрей',
};

/** "Поняла: крем для сухой кожи, до 3 000 ₽." — proves the request was heard. */
function recap(slots: Slots): string | null {
  const subject = [slots.type ? TYPE_WORD[slots.type] : slots.group ? GROUP_WORD[slots.group] : null, slots.needLabel]
    .filter(Boolean)
    .join(' ');
  const bits = [subject].filter(Boolean);
  if (slots.texture) bits.push(slots.texture === 'light' ? 'лёгкая текстура' : 'плотная текстура');
  if (slots.budgetLabel) bits.push(slots.budgetLabel);
  if (!bits.length) return null;
  return `Поняла: ${bits.join(', ')}.`;
}

/**
 * Scenario 22 — the assistant says out loud what it remembered, so skipping a
 * question reads as memory rather than as a shortcut. A lesson learned from
 * feedback wins over the profile, since it is the newer thing to demonstrate.
 */
function memoryLine(slots: Slots, profile: BeautyProfile): string | null {
  const dislike = profile.learned.find((l) => /не любит/i.test(l));
  if (dislike) return `Я помню: ${dislike.replace(/^Не любит/, 'не любишь').toLowerCase()} — такие варианты я убрала.`;

  // Only mention what the profile answered on her behalf this turn.
  const used: string[] = [];
  if (!slots.budgetMax && profile.budget) used.push(`бюджет ${profile.budget.toLowerCase()}`);
  if (!slots.avoid.length && profile.dislikes.length) used.push(`${profile.dislikes.join(' и ').toLowerCase()} — не твоё`);
  if (!slots.texture && effectiveTexture(slots, profile)) {
    used.push(effectiveTexture(slots, profile) === 'light' ? 'лёгкие текстуры — как ты любишь' : 'плотные текстуры — как ты любишь');
  }
  if (!used.length) return null;
  return `Беру из твоего профиля: ${used.join(', ')}.`;
}

const mentionsNote = (n: number) => `${n} ${plural(n, 'упоминание', 'упоминания', 'упоминаний')}`;

function withSlots(conv: Conversation, patch: Partial<Slots>): Partial<Conversation> {
  return { slots: { ...conv.slots, ...patch } };
}

/**
 * Which questions are still worth asking. A type or skin need is already a
 * request — don't add a texture interrogation on top. Vague "что купить"
 * only asks group, then budget/avoid if the profile does not already know them.
 */
function plan(slots: Slots, profile: BeautyProfile): string[] {
  if (slots.type || slots.need) return [];

  const steps: string[] = [];
  if (!slots.group) steps.push('group');
  if (!slots.budgetMax && slots.budgetLabel !== 'неважно' && !profile.budgetMax) steps.push('budget');
  if (!slots.avoid.length && !profile.dislikes.length) steps.push('avoid');
  return steps;
}

function ask(step: string, extra: ChatMessage[] = []): AiTurn {
  const c = CLARIFIERS[step];
  const control =
    step === 'group'
      ? [reply('задать другой вопрос', 'new-question'), reply('позвать консультанта', 'human')]
      : [reply('пропустить', 'skip'), reply('задать другой вопрос', 'new-question')];
  return {
    messages: [...extra, t(c.question)],
    replies: [...c.replies, ...control],
    conversation: { state: 'CLARIFYING', pending: [step] },
  };
}

/** Moves to the next unanswered question, or produces the recommendation. */
function advance(conv: Conversation, profile: BeautyProfile, extra: ChatMessage[] = []): AiTurn {
  // No point walking someone through four questions when the shelf is already
  // empty — say so straight away instead.
  if ((conv.slots.group || conv.slots.type) && recommend(conv.slots, profile).kind === 'none')
    return present(conv, profile, extra);

  const steps = plan(conv.slots, profile);
  if (steps.length) return { ...ask(steps[0], extra), conversation: { state: 'CLARIFYING', pending: steps } };
  return present(conv, profile, extra);
}

/* ---------------------------------------------------- recommendation beat */

/**
 * The "Поняла. Ищу варианты" → "Смотрю варианты…" → results sequence, so the
 * assistant visibly works instead of pasting an answer.
 */
function present(conv: Conversation, profile: BeautyProfile, extra: ChatMessage[] = []): AiTurn {
  const result = recommend(conv.slots, profile);

  if (result.kind === 'none') {
    return {
      messages: [
        ...extra,
        t('Я не нашла вариант, которому готова уверенно сказать «да».'),
        t(result.reason),
      ],
      replies: NO_MATCH_REPLIES,
      conversation: { state: 'NO_MATCH' },
    };
  }

  // The caller often already said its own version of "ищу варианты".
  const rec = recap(conv.slots);
  const alreadyRecapped = extra.some((m) => m.kind === 'text' && /поняла/i.test(m.text));
  const lead: ChatMessage[] = extra.length ? [...extra] : [t('Поняла. Тогда ищу варианты именно под это.')];
  if (rec && !alreadyRecapped) lead.unshift(t(rec));
  const memory = memoryLine(conv.slots, profile);
  if (memory) lead.push(t(memory));

  const best = result.bestId ? PRODUCTS[result.bestId] : null;
  const tail: ChatMessage[] = [];

  if (result.kind === 'soft') tail.push(t(result.reason));
  else if (result.kind === 'relaxed') tail.push(t(result.reason));
  else tail.push(t('Я бы начала с этих.'));

  // A near-miss should not wear a "BEST MATCH" badge.
  tail.push(cards(result.ids, result.notes, result.kind === 'soft' ? undefined : result.bestId ?? undefined));

  if (best) {
    tail.push(
      t(
        result.kind === 'soft'
          ? `${best.brand} — ближайшее к запросу. ${best.why[0]}.`
          : `Вот этот я бы выбрала первым. ${best.why[0]}.`,
      ),
    );
  }

  const replies =
    result.kind === 'soft'
      ? [reply('поднять бюджет', 'widen'), ...AFTER_RECOMMEND]
      : AFTER_RECOMMEND;

  // Scenario 20 — she has bought the top pick before.
  if (best && alreadyBought(best.id, profile) && !conv.repeatOffered.includes(best.id)) {
    return {
      messages: lead,
      replies: [],
      conversation: { state: 'RECOMMENDING' },
      then: {
        messages: [
          ...tail,
          t(`Снова этот? 💛 Ты уже покупала ${best.name} раньше.`),
        ],
        replies: [
          reply('повторить покупку', `repeat:${best.id}`),
          reply('посмотреть альтернативы', 'similar'),
          ...AFTER_RECOMMEND.slice(0, 3),
        ],
        conversation: {
          state: 'RECOMMENDING',
          lastIds: result.ids,
          focusId: best.id,
          compareIds: result.ids.slice(0, 2),
          relaxed: result.kind !== 'ok',
          repeatOffered: [...conv.repeatOffered, best.id],
        },
      },
    };
  }

  return {
    messages: lead,
    replies: [],
    conversation: { state: 'RECOMMENDING' },
    then: {
      messages: tail,
      replies,
      conversation: {
        state: result.kind === 'soft' ? 'NO_MATCH' : 'RECOMMENDING',
        lastIds: result.ids,
        focusId: result.bestId,
        compareIds: result.ids.slice(0, 2),
        relaxed: result.kind !== 'ok',
      },
    },
  };
}

/* ------------------------------------------------------------ entry copy */

export function openingLine(ctx: ChatContext): string | null {
  switch (ctx.from) {
    case 'pdp':
      return `Вижу, ты смотришь ${PRODUCTS[ctx.productId]?.name ?? 'этот продукт'}. Спроси — подойдёт ли он тебе, и я разберу состав, отзывы и цену.`;
    case 'search': {
      const known = extractSlots(ctx.query);
      if (known.need || known.budgetMax) {
        return `Ищешь «${ctx.query}»? Я уже вижу задачу — могу подобрать без лишних вопросов.`;
      }
      return `Ищешь «${ctx.query}»? Расскажи, для чего он нужен — и сузим выбор.`;
    }
    case 'content':
      return `Ты пришла из материала «${ctx.title}». Могу подобрать то, о чём там речь.`;
    default:
      return null;
  }
}

/** The greeting the assistant opens a fresh conversation with. */
export function greeting(ctx: ChatContext): AiTurn {
  const opening = openingLine(ctx);
  const messages = [
    t('Привет! 💛 Давай я помогу тебе выбрать.'),
    t('Можешь просто рассказать, что ищешь — как подруге.'),
  ];
  if (opening) messages.push(t(opening));

  const contextual: QuickReply[] =
    ctx.from === 'pdp'
      ? [reply('подойдёт мне?', 'suitability'), reply('есть дешевле?', 'cheaper'), reply('отзывы', 'reviews'), ...START_REPLIES.slice(0, 2)]
      : ctx.from === 'content'
        ? [reply('есть что-то похожее?', 'similar'), reply('что мне купить?', 'q:buy'), reply('есть обзоры?', 'content')]
        : START_REPLIES;

  return { messages, replies: contextual, conversation: { state: 'UNDERSTANDING_REQUEST' } };
}

/* ------------------------------------------------------------- the machine */

export function runAction(action: string, value: string | undefined, ctx: Ctx): AiTurn {
  const { profile, conv, chatContext } = ctx;
  const [head, arg] = action.split(':');
  const focus =
    conv.focusId ??
    (chatContext.from === 'pdp' ? chatContext.productId : null) ??
    conv.lastIds[0] ??
    profile.viewed[profile.viewed.length - 1] ??
    null;

  switch (head) {
    /* ------------------------------------------------ starting the funnel */

    case 'q': {
      // A new request drops the old slots but keeps everything the profile learned,
      // and keeps what the entry point already told us (search query, PDP, article).
      const fresh = { ...EMPTY_SLOTS, ...slotsFromEntry(chatContext) };
      const turn = advance({ ...conv, slots: fresh }, profile);
      const focusKeep =
        chatContext.from === 'pdp' ? chatContext.productId : conv.focusId;
      return {
        userText: 'Что мне купить?',
        ...turn,
        conversation: { ...turn.conversation, slots: fresh, intent: 'buy', focusId: turn.conversation?.focusId ?? focusKeep ?? null },
      };
    }

    /* ------------------------------------------------------ slot answers */

    case 'slot': {
      const label = labelOf(action, value);
      if (arg === 'group') {
        if (value === 'new') {
          const ids = mostMentioned();
          return {
            userText: label,
            messages: [
              t('Если хочется попробовать что-то новое, вот что чаще всего попадается в контенте Золотого Яблока и Flacon.'),
              cards(ids, Object.fromEntries(ids.map((id) => [id, `${mentionsNote(PRODUCTS[id].mentions)} в контенте`])), ids[0]),
              t('Я не называю это трендом — просто показываю, что чаще сохраняют и обсуждают.'),
            ],
            replies: AFTER_RECOMMEND,
            conversation: { state: 'RECOMMENDING', lastIds: ids, focusId: ids[0], compareIds: ids.slice(0, 2) },
          };
        }
        const group = value as ProductGroup;
        const next = { ...conv, slots: { ...conv.slots, group } };
        const turn = advance(next, profile);
        return { userText: label, ...turn, conversation: { ...turn.conversation, ...withSlots(conv, { group }) } };
      }

      if (arg === 'priority') {
        const next = { ...conv, slots: { ...conv.slots, priority: value ?? null } };
        const turn = advance(next, profile);
        return {
          userText: label,
          ...turn,
          conversation: { ...turn.conversation, ...withSlots(conv, { priority: value ?? null }) },
          profile: { priorities: dedupe([...profile.priorities, value!]) },
        };
      }

      if (arg === 'budget') {
        const budgetMax = value === 'any' ? null : Number(value);
        const budgetLabel = value === 'any' ? 'неважно' : BUDGET_LABELS[value!] ?? `до ${formatPrice(Number(value))}`;
        const next = { ...conv, slots: { ...conv.slots, budgetMax, budgetLabel } };
        const turn = advance(next, profile);
        return {
          userText: label,
          ...turn,
          conversation: { ...turn.conversation, ...withSlots(conv, { budgetMax, budgetLabel }) },
          profile: { budget: budgetLabel, budgetMax },
        };
      }

      if (arg === 'avoid') {
        const avoid = value === 'none' ? ['none'] : [value!];
        const next = { ...conv, slots: { ...conv.slots, avoid } };
        const turn = advance(next, profile);
        return {
          userText: label,
          ...turn,
          conversation: { ...turn.conversation, ...withSlots(conv, { avoid }) },
          profile: value === 'none' ? undefined : { dislikes: dedupe([...profile.dislikes, ...avoid]) },
          learn: value === 'none' ? undefined : [`Не любит ${avoid[0].toLowerCase()}`],
        };
      }

      if (arg === 'texture') {
        const texture = value === 'any' ? null : (value as TextureKey);
        const next = { ...conv, slots: { ...conv.slots, texture } };
        const turn = present(next, profile, [t('Отлично. Тогда я бы начала с этих вариантов.')]);
        return {
          userText: label,
          ...turn,
          conversation: { ...turn.conversation, ...withSlots(conv, { texture }) },
          profile: texture ? { preferences: dedupe([...profile.preferences, texture === 'light' ? 'лёгкие текстуры' : 'плотные текстуры']) } : undefined,
        };
      }
      break;
    }

    /* ------------------------------------------------- explaining a pick */

    case 'why': {
      if (!focus) return needContext();
      const p = PRODUCTS[focus];
      return {
        userText: 'Почему именно он?',
        messages: [
          t(explainLead(focus, conv.slots, profile)),
          { id: uid('e'), role: 'ai', kind: 'evidence', productId: focus },
          t(
            p.cons.length
              ? `В минусах чаще всего пишут: ${p.cons[0].toLowerCase()}. Если для тебя это важно — я бы ещё посмотрела отзывы.`
              : 'Если хочется проверить — можно посмотреть отзывы и источники.',
          ),
        ],
        replies: [reply('развернуть подробно', `why-sheet:${focus}`), ...AFTER_WHY],
        conversation: { state: 'EXPLAINING', focusId: focus, compareIds: dedupe([focus, ...conv.lastIds]).slice(0, 2) },
      };
    }

    // Opens the design's full-screen breakdown of the answer already in chat.
    case 'why-sheet':
      return {
        messages: [],
        replies: [],
        sheet: { name: 'why', productIds: [arg ?? focus ?? ''] },
        conversation: { state: 'EXPLAINING' },
      };

    case 'sources': {
      if (!focus) return noSourcesYet();
      return {
        userText: 'Откуда ты это знаешь?',
        messages: [
          t('Не обязательно верить мне на слово 💛 Вот на чём основана рекомендация.'),
          { id: uid('s'), role: 'ai', kind: 'sources', productId: focus },
          t('Я использую эти данные, чтобы не просто предложить продукт, а объяснить, почему он может тебе подойти.'),
        ],
        replies: AFTER_SOURCES,
        conversation: { state: 'SHOWING_EVIDENCE', focusId: focus },
      };
    }

    case 'trust': {
      const items = [
        { ok: true, text: 'твои ответы в профиле — бюджет, текстура, что не нравится' },
        { ok: true, text: 'отзывы покупательниц' },
        { ok: true, text: 'рейтинг товара' },
        { ok: true, text: 'характеристики и состав' },
        { ok: true, text: 'материалы Flacon и видео Золотого Яблока' },
        { ok: true, text: 'твоя история покупок' },
      ];
      return {
        userText: 'Почему я должна тебе доверять?',
        messages: [
          t('Не должна 💛'),
          t('Я лучше покажу, на чём основана рекомендация.'),
          checks('на чём я строю ответ', items),
          t('Ты можешь сама проверить каждый пункт.'),
        ],
        replies: [reply('посмотреть источники', 'sources'), reply('сравнить', 'compare'), reply('позвать консультанта', 'human')],
        conversation: { state: 'SHOWING_EVIDENCE' },
      };
    }

    /* ---------------------------------------------------------- compare */

    case 'compare': {
      const pair = conv.compareIds.length >= 2 ? conv.compareIds : conv.lastIds.slice(0, 2);
      if (pair.length < 2) {
        const fromFlacon = flaconForQuery(value ?? '');
        if (fromFlacon.length && !conv.lastIds.length) return flaconCiteTurn(value ?? 'Сравнить', fromFlacon);
        if (!conv.slots.group && !conv.slots.type && !conv.lastIds.length) return needContext();
        const fallback = recommend(conv.slots, profile).ids.slice(0, 2);
        if (fallback.length < 2) return needContext();
        return compareTurn(fallback, conv, profile);
      }
      return compareTurn(pair, conv, profile);
    }

    /* -------------------------------------------------- cheaper / similar */

    case 'cheaper': {
      if (!focus) return needContext();
      const ids = cheaperThan(focus, profile);
      if (!ids.length) {
        return {
          userText: 'Есть что-нибудь дешевле?',
          messages: [t(`Дешевле ${PRODUCTS[focus].brand} в этой подборке у меня ничего нет — не буду выдумывать.`)],
          replies: [reply('показать похожие', 'similar'), reply('убрать ограничение', 'drop-constraint'), reply('позвать консультанта', 'human')],
          conversation: { state: 'NO_MATCH' },
        };
      }
      const notes = Object.fromEntries(ids.map((id) => [id, `дешевле на ${formatPrice(PRODUCTS[focus].price - PRODUCTS[id].price)}`]));
      const [first, second] = ids;
      const tail = [t(`Первый ближе всего к твоему запросу.`)];
      if (second)
        tail.push(
          t(
            PRODUCTS[second].texture === 'rich'
              ? 'Второй дешевле, но текстура немного плотнее.'
              : `Второй дешевле, но ${PRODUCTS[second].cons[0]?.toLowerCase() ?? 'отзывов по нему меньше'}.`,
          ),
        );
      return {
        userText: 'Есть что-нибудь дешевле?',
        messages: [
          t(`Да. Нашла ${ids.length === 1 ? 'один похожий вариант' : `${ids.length} похожих варианта`}.`),
          cards(ids, notes, first),
          ...tail,
        ],
        replies: [reply('сравнить', 'compare'), ...AFTER_PRODUCT.slice(0, 3), reply('почему именно он?', 'why')],
        conversation: { state: 'RECOMMENDING', lastIds: ids, focusId: first, compareIds: [focus, first] },
      };
    }

    case 'similar': {
      if (!focus) return needContext();
      const ids = similarTo(focus, profile);
      const notes = Object.fromEntries(ids.map((id) => [id, similarityNote(focus, id)]));
      return {
        userText: 'Есть что-то похожее?',
        messages: [
          t(`Да. Если тебе нравится ${PRODUCTS[focus].brand}, я бы посмотрела ещё эти варианты.`),
          cards(ids, notes, ids[0]),
        ],
        replies: AFTER_RECOMMEND,
        conversation: { state: 'RECOMMENDING', lastIds: ids, focusId: ids[0], compareIds: [focus, ids[0]] },
      };
    }

    /* ------------------------------------------------- reviews & content */

    case 'reviews': {
      if (!focus) return needContext();
      const p = PRODUCTS[focus];
      return {
        userText: 'Что люди говорят про этот продукт?',
        messages: [
          t(
            p.reviews < 20
              ? 'Отзывов пока совсем мало — покажу, что есть, но выводы делать рано.'
              : p.rating >= 4.5
                ? 'В целом отзывы очень хорошие.'
                : 'Отзывы неоднозначные — показываю как есть.',
          ),
          { id: uid('r'), role: 'ai', kind: 'reviews', productId: focus },
          t(
            profile.preferences.includes('лёгкие текстуры') || conv.slots.texture === 'light'
              ? 'Если ориентироваться на твои предпочтения, я бы обратила внимание именно на отзывы про текстуру.'
              : 'Смотри на то, что чаще повторяется — единичные отзывы мало о чём говорят.',
          ),
        ],
        replies: [reply('посмотреть источники', 'sources'), reply('сравнить', 'compare'), reply('есть обзоры?', 'content'), reply('вернуться к подборке', 'back-to-list')],
        conversation: { state: 'SHOWING_EVIDENCE', focusId: focus },
      };
    }

    case 'content': {
      if (!focus) {
        const fromQuery = flaconForQuery(value ?? '');
        if (fromQuery.length) return flaconCiteTurn(value ?? 'Есть обзоры?', fromQuery);
        return needContext();
      }
      const p = PRODUCTS[focus];
      const fromProduct = p.contentIds.filter((id) => EDITORIAL[id]);
      const extras = flaconForProducts([focus]).filter((id) => !fromProduct.includes(id));
      const ids = [...fromProduct.filter((id) => EDITORIAL[id]?.kind === 'flacon'), ...fromProduct.filter((id) => EDITORIAL[id]?.kind !== 'flacon'), ...extras];
      if (!ids.length)
        return {
          userText: 'Есть обзоры?',
          messages: [t(`Материалов именно по ${p.brand} у меня нет. Не хочу выдумывать — могу показать отзывы покупательниц.`)],
          replies: [reply('отзывы', 'reviews'), reply('посмотреть источники', 'sources'), reply('задать другой вопрос', 'new-question')],
          conversation: { state: 'UNKNOWN', focusId: focus },
        };
      const wantSwatch = /свотч|на коже|оттенк|как смотр/.test((value ?? '').toLowerCase());
      const ranked = [...ids].sort((a, b) => rankContent(a, wantSwatch) - rankContent(b, wantSwatch));
      const hasFlacon = ranked.some((id) => EDITORIAL[id]?.kind === 'flacon');
      return {
        userText: wantSwatch ? 'Покажи свотчи' : 'Есть обзоры?',
        messages: [
          t(
            hasFlacon
              ? 'Беру из Flacon — это медиа Золотого Яблока. Обзоры и гайды оттуда, ничего не додумываю.'
              : 'В Flacon по этому средству пока пусто. Показываю видео Золотого Яблока — там как раз свотчи и носка.',
          ),
          { id: uid('ed'), role: 'ai', kind: 'content', contentIds: ranked.slice(0, 3) },
        ],
        replies: [reply('отзывы', 'reviews'), reply('посмотреть источники', 'sources'), reply('сравнить', 'compare'), reply('вернуться к подборке', 'back-to-list')],
        conversation: { state: 'SHOWING_EVIDENCE', focusId: focus },
      };
    }

    /* -------------------------------------------------------- suitability */

    case 'suitability': {
      if (!focus) return needContext();
      const p = PRODUCTS[focus];
      const s = suitability(focus, conv.slots, profile);
      const lead =
        s.verdict === 'yes' ? 'Скорее да 💛' : s.verdict === 'maybe' ? 'В целом да, но с одной оговоркой.' : 'Я бы не брала его первым.';
      const messages: ChatMessage[] = [t(lead), checks(`${p.brand} и твой профиль`, s.items)];
      if (s.blockers.length) messages.push(t(`Единственный момент — ${s.blockers[0].text}.`));

      // Scenario 20 — she has this one in her order history already.
      if (alreadyBought(focus, profile)) {
        messages.push(t(`И ещё: снова этот? 💛 Ты уже покупала ${p.name} раньше.`));
        return {
          userText: 'Подойдёт ли мне этот продукт?',
          messages,
          replies: [
            reply('повторить покупку', `repeat:${focus}`),
            reply('посмотреть альтернативы', 'similar'),
            reply('почему?', 'why'),
          ],
          conversation: { state: 'PRODUCT_DETAIL', focusId: focus, repeatOffered: dedupe([...conv.repeatOffered, focus]) },
        };
      }

      return {
        userText: 'Подойдёт ли мне этот продукт?',
        messages,
        replies:
          s.verdict === 'no'
            ? [reply('показать альтернативы', 'similar'), reply('всё равно посмотреть', `open:${focus}`), reply('почему именно так?', 'why')]
            : [reply('всё равно добавить', `add:${focus}`), reply('показать альтернативы', 'similar'), reply('почему?', 'why'), reply('отзывы', 'reviews')],
        conversation: { state: 'PRODUCT_DETAIL', focusId: focus },
      };
    }

    /* ---------------------------------------------- not pushing the sale */

    case 'reject': {
      return {
        userText: 'Не хочу этот',
        messages: [t('Окей. А что именно не подошло?')],
        replies: [
          reply('дорого', 'reject-why', 'price'),
          reply('не нравится бренд', 'reject-why', 'brand'),
          reply('не нравится состав', 'reject-why', 'ingredients'),
          reply('не нравится текстура', 'reject-why', 'texture'),
          reply('просто хочу другое', 'reject-why', 'other'),
        ],
        conversation: { state: 'LEARNING' },
      };
    }

    case 'reject-why': {
      const rejected = focus;
      const patch: Partial<Slots> = {};
      let learned: string | null = null;
      let said = 'Просто хочу другое';
      let dislikeLine: string | null = null;

      if (value === 'price' && rejected) {
        patch.budgetMax = Math.max(500, Math.floor(PRODUCTS[rejected].price * 0.8));
        patch.budgetLabel = `до ${formatPrice(patch.budgetMax)}`;
        learned = 'Чувствительна к цене';
        said = 'Дорого';
      }
      if (value === 'texture' && rejected) {
        const rich = PRODUCTS[rejected].texture === 'rich';
        patch.texture = rich ? 'light' : 'rich';
        dislikeLine = rich ? 'плотные текстуры' : 'лёгкие текстуры';
        learned = rich ? 'Не любит плотные текстуры' : 'Не любит слишком лёгкие текстуры';
        said = 'Не нравится текстура';
      }
      if (value === 'brand') {
        learned = rejected ? `Не подходит бренд ${PRODUCTS[rejected].brand}` : null;
        said = 'Не нравится бренд';
      }
      if (value === 'ingredients') {
        patch.avoid = dedupe([...conv.slots.avoid, 'определённые ингредиенты']);
        learned = 'Внимательно смотрит на состав';
        said = 'Не нравится состав';
      }

      const next: Conversation = { ...conv, slots: { ...conv.slots, ...patch } };
      const nextProfile: BeautyProfile = {
        ...profile,
        dislikedProducts: rejected ? dedupe([...profile.dislikedProducts, rejected]) : profile.dislikedProducts,
        ...(dislikeLine ? { dislikes: dedupe([...profile.dislikes, dislikeLine]) } : {}),
        ...(value === 'price' && patch.budgetMax
          ? { budgetMax: patch.budgetMax, budget: patch.budgetLabel ?? profile.budget }
          : {}),
      };
      const turn = present(next, nextProfile, [t('Поняла. Пересобираю подборку.')]);
      return {
        userText: said,
        ...turn,
        conversation: { ...turn.conversation, ...withSlots(conv, patch) },
        profile: rejected
          ? {
              dislikedProducts: dedupe([...profile.dislikedProducts, rejected]),
              ...(dislikeLine ? { dislikes: dedupe([...profile.dislikes, dislikeLine]) } : {}),
              ...(value === 'price' && patch.budgetMax
                ? { budgetMax: patch.budgetMax, budget: patch.budgetLabel ?? profile.budget }
                : {}),
            }
          : undefined,
        learn: learned ? [learned] : undefined,
      };
    }

    /* ------------------------------------------------------- no match ctas */

    case 'widen': {
      const current = conv.slots.budgetMax ?? profile.budgetMax ?? 3000;
      const next = nextBudgetTier(current);
      const patch: Partial<Slots> = { budgetMax: next, budgetLabel: next ? `до ${formatPrice(next)}` : 'неважно' };
      const conversation = { ...conv, slots: { ...conv.slots, ...patch } };
      const turn = present(conversation, profile, [
        t(next ? `Окей, расширяю бюджет до ${formatPrice(next)}.` : 'Окей, снимаю ограничение по бюджету.'),
      ]);
      return {
        userText: next ? `Давай до ${formatPrice(next)}` : 'Бюджет неважен',
        ...turn,
        conversation: { ...turn.conversation, ...withSlots(conv, patch) },
        profile: { budget: patch.budgetLabel!, budgetMax: next },
      };
    }

    case 'drop-constraint': {
      const patch: Partial<Slots> = { avoid: [], texture: null };
      const conversation = { ...conv, slots: { ...conv.slots, ...patch } };
      const turn = present(conversation, profile, [
        t('Снимаю ограничения по текстуре и отдушке — покажу шире, а оговорки проговорю честно.'),
      ]);
      return { userText: 'Убрать ограничение', ...turn, conversation: { ...turn.conversation, ...withSlots(conv, patch) } };
    }

    case 'closest': {
      const patch: Partial<Slots> = { budgetMax: null, budgetLabel: null };
      const conversation = { ...conv, slots: { ...conv.slots, ...patch } };
      const turn = present(conversation, profile, [
        t('Показываю ближайшее к твоим условиям. Полного совпадения нет, поэтому говорю с оговорками.'),
      ]);
      return { userText: 'Показать ближайшие варианты', ...turn, conversation: { ...turn.conversation, ...withSlots(conv, patch) } };
    }

    /* ------------------------------------------------------------ human */

    case 'human': {
      return {
        userText: 'Можно с консультантом?',
        messages: [
          t('Конечно.'),
          t('Я передам ему контекст, чтобы тебе не пришлось рассказывать всё заново.'),
          { id: uid('h'), role: 'ai', kind: 'handoff' },
          t('Готово. Консультант получил информацию.'),
        ],
        replies: [reply('продолжить с консультантом', 'consultant-go'), reply('остаться с тобой', 'new-question'), reply('вернуться к подборке', 'back-to-list')],
        sheet: { name: 'consultant' },
        conversation: { state: 'HUMAN_HANDOFF' },
      };
    }

    case 'consultant-go':
      return {
        userText: 'Продолжить с консультантом',
        messages: [t('Мария подключится к этому чату через минуту. Я останусь рядом — если что-то понадобится, зови.')],
        replies: [reply('вернуться к подборке', 'back-to-list'), reply('задать другой вопрос', 'new-question')],
        conversation: { state: 'HUMAN_HANDOFF' },
      };

    /* --------------------------------------------------- gift & routine */

    case 'gift': {
      const giftFor = conv.slots.giftFor ?? 'подруге';
      const budgetMax = conv.slots.budgetMax ?? profile.budgetMax;
      const budgetLabel = conv.slots.budgetLabel ?? profile.budget;
      if (budgetMax != null || budgetLabel) {
        return {
          userText: 'Что подарить подруге?',
          ...presentGifts({ ...conv.slots, giftFor, budgetMax, budgetLabel }),
        };
      }
      if (!conv.slots.giftFor)
        return {
          userText: 'Помоги выбрать подарок на день рождения подруги',
          messages: [t('Отлично! Расскажи какой бюджет подарка')],
          replies: [...GIFT_BUDGET_REPLIES, reply('задать другой вопрос', 'new-question')],
          conversation: { state: 'CLARIFYING', intent: 'gift', ...withSlots(conv, { giftFor: 'подруге' }) },
        };
      return {
        userText: 'Что подарить подруге?',
        messages: [t('Отлично! Расскажи какой бюджет подарка')],
        replies: [...GIFT_BUDGET_REPLIES, reply('задать другой вопрос', 'new-question')],
        conversation: { state: 'CLARIFYING', intent: 'gift' },
      };
    }

    case 'gift-budget': {
      const budgetMax = value === 'any' ? null : Number(value);
      const budgetLabel = GIFT_BUDGET_LABEL[value ?? 'any'] ?? formatPrice(Number(value));
      const slots = { ...conv.slots, giftFor: conv.slots.giftFor ?? 'подруге', budgetMax, budgetLabel };
      return {
        userText: budgetLabel,
        messages: [t('Расскажи больше о ней, какие у подруги предпочтения')],
        replies: [
          reply('а что популярно', 'gift-popular'),
          reply('может у неё есть вишлист', 'gift-wishlist'),
          reply('не знаю', 'gift-go'),
        ],
        conversation: { state: 'CLARIFYING', intent: 'gift', slots },
      };
    }

    case 'gift-popular':
      return { userText: 'а что популярно', ...presentGifts({ ...conv.slots, giftFor: conv.slots.giftFor ?? 'подруге' }) };

    case 'gift-wishlist': {
      const turn = presentGifts(conv.slots);
      return {
        userText: 'может у неё есть вишлист',
        messages: [t('В открытом доступе её вишлиста нет — поэтому собрала по тому, что ты описала.'), ...turn.messages],
        replies: turn.replies,
        conversation: turn.conversation,
      };
    }

    case 'gift-go':
      return { userText: 'не знаю', ...presentGifts(conv.slots) };

    case 'cream': {
      const slots: Slots = { ...conv.slots, type: 'cream', group: 'care' };
      const turn = advance({ ...conv, slots }, profile, [t(recap(slots) ?? 'Поняла: крем.')]);
      return { userText: 'посоветуй крем', ...turn, conversation: { ...turn.conversation, slots, intent: 'buy' } };
    }

    case 'shade-help': {
      const slots: Slots = { ...conv.slots, type: 'foundation', group: 'makeup' };
      const turn = advance({ ...conv, slots }, profile, [t('Поняла: подберём оттенок тонального.')]);
      return { userText: 'подбери оттенок', ...turn, conversation: { ...turn.conversation, slots, intent: 'buy' } };
    }

    case 'giftcard':
      return {
        userText: 'Подарочная карта',
        messages: [t('Карта Золотого Яблока — беспроигрышный вариант: подруга выберет сама. Номинал любой.')],
        replies: [reply('вернуться к подборке', 'back-to-list'), reply('задать другой вопрос', 'new-question')],
        conversation: { state: 'RECOMMENDING' },
      };

    case 'routine': {
      if (!profile.skinType && !conv.slots.need)
        return {
          userText: 'Собери мне уход',
          messages: [t('С удовольствием. Давай сначала поймём, что тебе нужно.'), t('Какой у тебя тип кожи?')],
          replies: [
            reply('сухая', 'routine-skin', 'сухая'),
            reply('жирная', 'routine-skin', 'жирная'),
            reply('чувствительная', 'routine-skin', 'чувствительная'),
            reply('комбинированная', 'routine-skin', 'комбинированная'),
          ],
          conversation: { state: 'CLARIFYING', intent: 'routine' },
        };
      return runAction('routine-skin', profile.skinType ?? conv.slots.need ?? 'сухая', ctx);
    }

    case 'routine-skin': {
      const skin = value ?? 'сухая';
      const lines = buildRoutine({ ...profile, skinType: skin });
      return {
        userText: skin,
        messages: [
          t(`Окей, собираю уход для типа «${skin}».`),
          { id: uid('rt'), role: 'ai', kind: 'routine', lines },
          t('Не обязательно покупать всё сразу. Я бы начала с первых двух шагов.'),
        ],
        replies: [reply('почему именно эти?', 'why'), reply('есть дешевле', 'cheaper'), reply('сравнить', 'compare'), reply('задать другой вопрос', 'new-question')],
        profile: { skinType: skin },
        learn: [`Тип кожи: ${skin}`],
        conversation: {
          state: 'RECOMMENDING',
          lastIds: dedupe(lines.map((l) => l.productId).filter(Boolean) as string[]),
          focusId: lines.find((l) => l.productId)?.productId ?? null,
        },
      };
    }

    /* ------------------------------------------------------------ trends */

    case 'popular': {
      const ids = mostMentioned();
      return {
        userText: 'Что сейчас в тренде?',
        messages: [
          t('Если хочется попробовать что-то новое, вот что сейчас чаще всего попадается в контенте Золотого Яблока и Flacon.'),
          cards(
            ids,
            Object.fromEntries(
              ids.map((id) => [id, `${mentionsNote(PRODUCTS[id].mentions)} · ${PRODUCTS[id].saves.toLocaleString('ru-RU').replace(/,/g, ' ')} сохранений`]),
            ),
            ids[0],
          ),
          t('Словом «тренд» не бросаюсь — это просто то, что чаще сохраняют и обсуждают.'),
        ],
        replies: AFTER_RECOMMEND,
        conversation: { state: 'RECOMMENDING', lastIds: ids, focusId: ids[0], compareIds: ids.slice(0, 2) },
      };
    }

    /* ------------------------------------------------------- transactions */

    case 'open':
    case 'add':
    case 'repeat':
      return {
        userText: head === 'repeat' ? 'Повторить покупку' : head === 'add' ? 'Всё равно добавить' : 'Всё равно посмотреть',
        messages: [t(head === 'open' ? 'Конечно. Тогда покажу подробнее.' : 'Готово. Добавила в корзину.')],
        replies: [reply('как тебе покупка?', `feedback:${arg}`), reply('вернуться к подборке', 'back-to-list'), reply('задать другой вопрос', 'new-question')],
        conversation: { state: head === 'open' ? 'PRODUCT_DETAIL' : 'PURCHASE', focusId: arg },
      };

    /* ---------------------------------------------------------- feedback */

    case 'feedback': {
      const pid = arg ?? focus;
      if (!pid) return needContext();
      return {
        userText: 'Как тебе покупка?',
        messages: [t('Ну как тебе?')],
        replies: [reply('моё 💚', `fb-like:${pid}`), reply('не моё', `fb-dislike:${pid}`)],
        sheet: { name: 'feedback', productId: pid },
        conversation: { state: 'FEEDBACK', focusId: pid },
      };
    }

    case 'fb-like': {
      const pid = arg!;
      const nextProfile: BeautyProfile = {
        ...profile,
        likedProducts: dedupe([...profile.likedProducts, pid]),
      };
      const turn = present(conv, nextProfile, [
        t('Запомнила 💛 Буду искать похожее по текстуре и эффекту.'),
        { id: uid('m'), role: 'ai', kind: 'memory', text: `Понравилось: ${PRODUCTS[pid].name}` },
      ]);
      return {
        userText: 'Моё 💚',
        ...turn,
        profile: { likedProducts: nextProfile.likedProducts },
        learn: [`Понравилось: ${PRODUCTS[pid].name}`],
        conversation: { ...turn.conversation, focusId: pid },
      };
    }

    case 'fb-dislike': {
      const pid = arg!;
      return {
        userText: 'Не моё',
        messages: [t('Что не зашло?')],
        replies: [
          reply('запах', `fb-reason:${pid}`, 'запах'),
          reply('текстура', `fb-reason:${pid}`, 'текстура'),
          reply('эффект', `fb-reason:${pid}`, 'эффект'),
          reply('цена', `fb-reason:${pid}`, 'цена'),
          reply('другое', `fb-reason:${pid}`, 'другое'),
        ],
        conversation: { state: 'FEEDBACK', focusId: pid },
      };
    }

    case 'fb-reason': {
      const pid = arg!;
      const reason = (value ?? 'другое').toLowerCase();
      const product = PRODUCTS[pid];
      const textureDislike =
        product?.texture === 'light' ? 'лёгкие текстуры' : 'плотные текстуры';
      const memory =
        reason === 'текстура'
          ? `Не любит ${textureDislike}`
          : REASON_MEMORY[reason] ?? 'Учту этот опыт';
      const patch: Partial<Slots> =
        reason === 'запах'
          ? { avoid: dedupe([...conv.slots.avoid, 'сильные отдушки']) }
          : reason === 'текстура'
            ? { avoid: dedupe([...conv.slots.avoid, textureDislike]) }
            : reason === 'цена' && product
              ? {
                  budgetMax: Math.max(500, Math.floor(product.price * 0.85)),
                  budgetLabel: `до ${formatPrice(Math.max(500, Math.floor(product.price * 0.85)))}`,
                }
              : {};
      const nextBudget = patch.budgetMax;
      const nextProfile: BeautyProfile = {
        ...profile,
        dislikedProducts: dedupe([...profile.dislikedProducts, pid]),
        dislikes:
          reason === 'запах'
            ? dedupe([...profile.dislikes, 'сильные отдушки'])
            : reason === 'текстура'
              ? dedupe([...profile.dislikes, textureDislike])
              : profile.dislikes,
        ...(reason === 'цена' && nextBudget
          ? { budgetMax: nextBudget, budget: patch.budgetLabel ?? profile.budget }
          : {}),
      };
      const next: Conversation = { ...conv, slots: { ...conv.slots, ...patch }, focusId: pid };
      const turn = present(next, nextProfile, [
        t('Поняла. Убираю это из подборки и подберу заново.'),
        { id: uid('m'), role: 'ai', kind: 'memory', text: memory },
      ]);
      return {
        userText: reason,
        ...turn,
        profile: {
          dislikedProducts: nextProfile.dislikedProducts,
          dislikes: nextProfile.dislikes,
          ...(reason === 'цена' && nextBudget
            ? { budgetMax: nextBudget, budget: patch.budgetLabel ?? profile.budget }
            : {}),
        },
        learn: [memory],
        conversation: { ...turn.conversation, ...withSlots(conv, patch), focusId: pid },
      };
    }

    /* ------------------------------------------------------------- misc */

    case 'skip':
      if (conv.state === 'CLARIFYING' && conv.pending[0] && conv.pending[0] !== 'group') {
        return skipCurrentQuestion(ctx);
      }
      return {
        userText: 'Не хочу отвечать на вопросы',
        messages: [
          t('Окей. Можешь просто написать, что ищешь — попробую подобрать без профиля.'),
          t('Или нажми «продолжить», и я покажу то, что чаще всего берут.'),
        ],
        replies: [reply('продолжить', 'popular'), reply('что мне купить?', 'q:buy'), reply('позвать консультанта', 'human')],
        profile: { metAssistant: true },
        conversation: { state: 'IDLE' },
      };

    case 'back-to-list': {
      if (!conv.lastIds.length) return runAction('q:buy', undefined, ctx);
      const notes = recommend(conv.slots, profile).notes;
      return {
        userText: 'Вернуться к подборке',
        messages: [t('Возвращаю подборку — всё, что мы обсуждали, на месте.'), cards(conv.lastIds, notes, conv.lastIds[0])],
        replies: AFTER_RECOMMEND,
        conversation: { state: 'RECOMMENDING' },
      };
    }

    case 'new-question':
      return {
        userText: 'Задать другой вопрос',
        messages: [t('Слушаю. Спроси что угодно — или выбери из подсказок ниже.')],
        replies: [
          reply('что мне купить?', 'q:buy'),
          reply('собери мне уход', 'routine'),
          reply('что сейчас популярно', 'popular'),
          reply('что подарить подруге?', 'gift'),
          reply('позвать консультанта', 'human'),
        ],
        conversation: {
          ...EMPTY_CONVERSATION,
          state: 'IDLE',
          lastIds: conv.lastIds,
          focusId: conv.focusId,
          compareIds: conv.compareIds,
        },
      };

    case 'profile':
      return {
        userText: 'Посмотреть профиль',
        messages: [t('Открываю профиль — там видно всё, что я о тебе запомнила.')],
        replies: [reply('вернуться к подборке', 'back-to-list'), reply('задать другой вопрос', 'new-question')],
        conversation: { state: 'LEARNING' },
      };
  }

  return unknownTurn(value ?? action);
}

/* ---------------------------------------------------------- free text in */

export function runFreeText(input: string, ctx: Ctx): AiTurn {
  const { profile, conv, chatContext } = ctx;
  const { intent, slots: found, isCorrection } = parse(input);
  const focus =
    conv.focusId ??
    (chatContext.from === 'pdp' ? chatContext.productId : null) ??
    conv.lastIds[0] ??
    profile.viewed[profile.viewed.length - 1] ??
    null;
  const slotUpdate = Boolean(
    found.group || found.type || found.need || found.budgetMax || found.texture || found.avoid?.length,
  );
  const inFlight = conv.state !== 'IDLE' && conv.state !== 'UNDERSTANDING_REQUEST';

  // Scenario 26 — an adjustment must not restart the conversation.
  if (intent === 'change' || (isCorrection && slotUpdate) || (inFlight && (intent === 'unknown' || intent === 'choose') && slotUpdate)) {
    const merged = { ...conv.slots, ...found };
    const said: string[] = [];
    if (found.budgetMax) said.push(`расширяю бюджет до ${formatPrice(found.budgetMax)}`);
    if (found.texture) said.push(`беру текстуру ${found.texture === 'light' ? 'полегче' : 'поплотнее'}`);
    if (found.group) said.push(`переключаюсь на ${GROUP_WORD[found.group]}`);
    if (found.type && !found.group) said.push(`смотрю ${TYPE_WORD[found.type]}`);
    const lead = said.length ? `Окей, ${said.join(', ')}.` : 'Окей, поправила.';
    const turn = present({ ...conv, slots: merged }, profile, [t(lead)]);
    return {
      ...turn,
      conversation: { ...turn.conversation, slots: merged },
      profile: found.budgetMax ? { budget: found.budgetLabel ?? null, budgetMax: found.budgetMax } : undefined,
    };
  }

  const escaping =
    intent === 'trust' ||
    intent === 'human' ||
    intent === 'skip' ||
    intent === 'reject' ||
    intent === 'feedback';

  // Out of scope always wins — even mid-gift — so we never invent an answer.
  // If Flacon has a piece on the topic, cite it instead of a blank refusal.
  if (
    intent === 'unknown' &&
    !clarifierValue(conv.pending[0], input, found) &&
    !found.group &&
    !found.type &&
    !found.budgetMax &&
    !found.need &&
    !found.texture &&
    !found.avoid?.length
  ) {
    const fromFlacon = flaconForQuery(input);
    if (fromFlacon.length) return flaconCiteTurn(input, fromFlacon);
    return unknownTurn(input);
  }

  // Gift flow from Figma: after budget, the next free-text answer is preferences.
  // Escapes (human / skip / I-don't-know) must still get out.
  if (conv.intent === 'gift' && conv.state === 'CLARIFYING' && !escaping) {
    if (found.budgetMax && !conv.slots.budgetLabel) {
      return runAction('gift-budget', String(found.budgetMax), ctx);
    }
    if (conv.slots.budgetMax != null || conv.slots.budgetLabel || profile.budgetMax) {
      return presentGifts({ ...conv.slots, ...found, budgetMax: conv.slots.budgetMax ?? found.budgetMax ?? profile.budgetMax });
    }
  }

  // A typed answer can fill the open chip AND the rest of the request in one go.
  if (conv.state === 'CLARIFYING' && conv.pending[0] && !escaping) {
    const step = conv.pending[0];
    const value = clarifierValue(step, input, found);
    if (value === 'new') return runAction('slot:group', 'new', ctx);
    const extra = Boolean(
      found.type ||
        found.need ||
        (found.budgetMax && step !== 'budget') ||
        (found.avoid?.length && step !== 'avoid') ||
        (found.texture && step !== 'texture'),
    );
    if (value && extra) {
      const merged: Slots = { ...conv.slots, ...found };
      if (step === 'group') merged.group = value as ProductGroup;
      if (step === 'priority') merged.priority = value;
      if (step === 'budget') {
        merged.budgetMax = value === 'any' ? null : Number(value);
        merged.budgetLabel = value === 'any' ? 'неважно' : (BUDGET_LABELS[value] ?? merged.budgetLabel);
      }
      if (step === 'avoid') merged.avoid = value === 'none' ? ['none'] : [value];
      if (step === 'texture') merged.texture = value === 'any' ? null : (value as TextureKey);
      const turn = advance({ ...conv, slots: merged }, profile, [t(recap(merged) ?? 'Поняла.')]);
      return { ...turn, conversation: { ...turn.conversation, slots: merged, intent: conv.intent ?? 'buy' } };
    }
    if (value) return runAction(`slot:${step}`, value, ctx);
  }

  switch (intent) {
    case 'trust':
      return runAction('trust', undefined, ctx);
    case 'human':
      return runAction('human', undefined, ctx);
    case 'sources':
      return runAction('sources', undefined, ctx);
    case 'reviews':
      return runAction('reviews', undefined, ctx);
    case 'content':
      return runAction('content', input, ctx);
    case 'compare':
      return runAction('compare', input, ctx);
    case 'cheaper':
      return runAction('cheaper', undefined, ctx);
    case 'similar':
      return runAction('similar', undefined, ctx);
    case 'suitability':
      return runAction('suitability', undefined, ctx);
    case 'why':
      return runAction('why', undefined, ctx);
    case 'routine':
      return runAction('routine', undefined, ctx);
    case 'popular':
      return runAction('popular', undefined, ctx);
    case 'skip':
      return runAction('skip', undefined, ctx);
    case 'reject':
      return runAction('reject', undefined, ctx);
    case 'feedback':
      return focus ? runAction(`fb-dislike:${focus}`, undefined, ctx) : runAction('reject', undefined, ctx);

    case 'gift': {
      const merged = { ...conv.slots, ...found, giftFor: found.giftFor ?? conv.slots.giftFor ?? 'подруге' };
      const hasBudget =
        merged.budgetMax != null ||
        merged.budgetLabel != null ||
        conv.slots.budgetLabel != null ||
        profile.budgetMax != null;
      if (conv.intent === 'gift' && (conv.slots.budgetMax != null || conv.slots.budgetLabel || profile.budgetMax)) {
        return presentGifts({ ...merged, budgetMax: merged.budgetMax ?? profile.budgetMax, budgetLabel: merged.budgetLabel ?? profile.budget });
      }
      if (merged.budgetMax && !conv.slots.giftFor) {
        return runAction('gift-budget', String(merged.budgetMax), { ...ctx, conv: { ...conv, slots: merged } });
      }
      if (hasBudget && conv.intent === 'gift') return presentGifts(merged);
      return {
        messages: [t('Отлично! Расскажи какой бюджет подарка')],
        replies: GIFT_BUDGET_REPLIES,
        conversation: { state: 'CLARIFYING', intent: 'gift', slots: merged },
      };
    }

    /* Scenario 2 — a rich request fills slots and only the gap gets asked. */
    case 'buy': {
      const merged: Slots = { ...conv.slots, ...found };
      const known = Boolean(found.type || found.need || found.budgetMax || found.group);
      const lead = known ? [t(recap(merged) ?? 'Поняла.')] : [];
      const next: Conversation = { ...conv, slots: merged };
      const turn = advance(next, profile, lead);
      return { ...turn, conversation: { ...turn.conversation, slots: merged, intent: 'buy' } };
    }

    /* Scenario 25 — understood roughly, narrow it down. */
    case 'choose':
      if (conv.slots.group || conv.slots.type) {
        const lead = [t('Поняла примерно. Тогда подберу по тому, что уже есть.')];
        const rec = recap(conv.slots);
        if (rec) lead.unshift(t(rec));
        return advance(conv, profile, lead);
      }
      return {
        messages: [t('Поняла примерно 😄 Давай сузим выбор.'), t('Что ищем?')],
        replies: GROUP_REPLIES,
        conversation: { state: 'CLARIFYING', pending: ['group'], intent: 'choose' },
      };

    default:
      return unknownTurn(input);
  }
}

function skipCurrentQuestion(ctx: Ctx): AiTurn {
  const { conv, profile } = ctx;
  const step = conv.pending[0];
  const patch: Partial<Slots> = {};
  if (step === 'budget') {
    patch.budgetMax = null;
    patch.budgetLabel = 'неважно';
  } else if (step === 'avoid') {
    patch.avoid = ['none'];
  } else if (step === 'texture') {
    patch.texture = null;
  } else if (step === 'priority') {
    patch.priority = 'неважно';
  }
  const next: Conversation = { ...conv, slots: { ...conv.slots, ...patch }, pending: conv.pending.slice(1) };
  const turn = advance(next, profile, [t('Хорошо, этот вопрос пропускаю.')]);
  return { userText: 'Пропустить', ...turn, conversation: { ...turn.conversation, slots: next.slots } };
}

/** Map a typed answer onto the open clarifier chip value. */
function clarifierValue(step: string | undefined, input: string, found: Partial<Slots>): string | null {
  if (!step) return null;
  const q = input.toLowerCase().trim();
  if (step === 'group') {
    if (found.group) return found.group;
    if (/нов/i.test(q)) return 'new';
    return null;
  }
  if (step === 'priority') {
    const hit = PRIORITY_REPLIES.find((r) => q.includes(r.label) || q.includes((r.value ?? '').toLowerCase()));
    return hit?.value ?? null;
  }
  if (step === 'budget') {
    if (/неважн|любой|без разницы|не ограничен/i.test(q)) return 'any';
    if (found.budgetMax) {
      if (found.budgetMax <= 2000) return '2000';
      if (found.budgetMax <= 5000) return '5000';
      if (found.budgetMax <= 10000) return '10000';
      return 'any';
    }
    return null;
  }
  if (step === 'avoid') {
    if (/ничего|нет|нема|не важн/i.test(q)) return 'none';
    if (found.avoid?.[0]) return found.avoid[0];
    if (/отдушк|запах|аромат/i.test(q)) return 'сильные отдушки';
    if (/плотн/i.test(q)) return 'плотные текстуры';
    if (/ингредиент|состав/i.test(q)) return 'определённые ингредиенты';
    return null;
  }
  if (step === 'texture') {
    if (found.texture) return found.texture;
    if (/неважн|любая|без разницы/i.test(q)) return 'any';
    if (/лёгк|легк/i.test(q)) return 'light';
    if (/плотн|насыщен/i.test(q)) return 'rich';
    return null;
  }
  return null;
}

function slotsFromEntry(ctx: ChatContext): Partial<Slots> {
  if (ctx.from === 'search') return extractSlots(ctx.query);
  if (ctx.from === 'content') return extractSlots(ctx.title);
  if (ctx.from === 'pdp') {
    const p = PRODUCTS[ctx.productId];
    if (!p) return {};
    return { group: p.group, type: p.type };
  }
  return {};
}

/* ------------------------------------------------------------- fragments */

function compareTurn(pair: string[], conv: Conversation, profile: BeautyProfile): AiTurn {
  const [a, b] = pair.map((id) => PRODUCTS[id]);
  const winner = pickWinner(a.id, b.id, conv.slots, profile);
  const w = PRODUCTS[winner];
  const l = PRODUCTS[winner === a.id ? b.id : a.id];
  const articles = flaconForProducts([a.id, b.id], 2);
  const messages: ChatMessage[] = [
    t('Давай.'),
    { id: uid('cm'), role: 'ai', kind: 'compare', productIds: [a.id, b.id] },
    t(`Если выбирать именно для тебя, я бы взяла ${w.brand}. ${compareReason(w.id, l.id, conv.slots, profile)}`),
  ];
  if (articles.length) {
    messages.push(
      t('Чтобы не гадать, вот статьи Flacon по этой категории — медиа Золотого Яблока. Я опираюсь на них, а не додумываю.'),
      { id: uid('ed'), role: 'ai', kind: 'content', contentIds: articles },
    );
  }

  return {
    userText: 'Сравни эти два',
    messages,
    replies: [
      reply(`выбрать ${w.brand}`, `open:${w.id}`),
      reply(`посмотреть ${l.brand}`, `open:${l.id}`),
      reply('почему?', 'why'),
      reply('статьи Flacon', 'content'),
      reply('откуда данные', 'sources'),
    ],
    conversation: { state: 'COMPARING', compareIds: [a.id, b.id], focusId: w.id },
  };
}

function flaconCiteTurn(userText: string, contentIds: string[]): AiTurn {
  const first = EDITORIAL[contentIds[0]];
  return {
    userText,
    messages: [
      t(`Не буду выдумывать то, чего нет в карточке товара. Во Flacon есть разбор: «${first?.title ?? 'статья'}».`),
      { id: uid('ed'), role: 'ai', kind: 'content', contentIds },
    ],
    replies: [reply('сравнить', 'compare'), reply('позвать консультанта', 'human'), reply('задать другой вопрос', 'new-question')],
    conversation: { state: 'SHOWING_EVIDENCE' },
  };
}

/** Reuses the recommendation ranking so the verdict never contradicts the list. */
function pickWinner(a: string, b: string, slots: Slots, profile: BeautyProfile): string {
  const ranked = recommend({ ...slots, group: null, type: null }, profile, 8).ids;
  const ia = ranked.indexOf(a);
  const ib = ranked.indexOf(b);
  if (ia === -1) return ib === -1 ? a : b;
  if (ib === -1) return a;
  return ia <= ib ? a : b;
}

function compareReason(winner: string, loser: string, slots: Slots, profile: BeautyProfile): string {
  const w = PRODUCTS[winner];
  const l = PRODUCTS[loser];
  const budget = slots.budgetMax ?? profile.budgetMax;
  const avoidsFragrance = namedAvoid(slots, profile).some((d) => /отдушк|запах/i.test(d));

  if (avoidsFragrance && w.fragrance !== 'strong' && l.fragrance === 'strong')
    return 'Ты говорила, что сильные отдушки — не твоё, а у второго аромат заметный.';
  if (budget && w.price <= budget && l.price > budget)
    return `Он остаётся в твоём бюджете, а второй выходит за него на ${formatPrice(l.price - budget)}.`;
  if (slots.texture && w.texture === slots.texture)
    return `Он лучше совпадает с твоей любимой текстурой — ${w.textureLabel}.`;
  if (w.rating > l.rating) return `У него выше рейтинг: ${w.rating} против ${l.rating}.`;
  if (w.price < l.price) return `При похожих характеристиках он дешевле на ${formatPrice(l.price - w.price)}.`;
  return `Он собрал больше отзывов — ${w.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')} против ${l.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')}.`;
}

/** The single strongest reason, so the explanation matches why it actually won. */
function explainLead(productId: string, slots: Slots, profile: BeautyProfile): string {
  const p = PRODUCTS[productId];
  const avoid = namedAvoid(slots, profile);

  if (avoid.some((a) => /отдушк|запах|аромат/i.test(a)) && p.fragrance !== 'strong')
    return p.fragrance === 'none'
      ? 'Потому что ты сказала, что сильные отдушки — не твоё, а он вообще без отдушки.'
      : `Потому что ты сказала, что сильные отдушки — не твоё, а у него аромат ${p.fragranceLabel}.`;
  if (slots.texture && p.texture === slots.texture)
    return `Потому что ты сказала, что тебе важна ${slots.texture === 'light' ? 'лёгкая' : 'плотная'} текстура.`;
  if (effectiveTexture(slots, profile) && p.texture === effectiveTexture(slots, profile))
    return `Потому что ты сказала, что тебе важна ${effectiveTexture(slots, profile) === 'light' ? 'лёгкая' : 'плотная'} текстура.`;
  if (profile.likedProducts.some((id) => PRODUCTS[id]?.texture === p.texture))
    return 'Потому что ты уже хорошо относилась к продуктам с такой же текстурой.';
  if (profile.preferences.length) return `Потому что ты говорила про ${profile.preferences[0]}.`;
  if (slots.priority) return `Потому что для тебя сейчас важнее всего — ${slots.priority.toLowerCase()}.`;
  return `Потому что при твоих условиях он собрал лучший баланс: ${p.why[0].toLowerCase()}.`;
}

/** Scenario 16 — refuse rather than invent. */
function unknownTurn(userText: string): AiTurn {
  return {
    userText: userText || undefined,
    messages: [
      t('Не хочу придумывать ответ.'),
      t('У меня недостаточно данных, чтобы уверенно это сказать.'),
    ],
    replies: UNKNOWN_REPLIES,
    conversation: { state: 'UNKNOWN' },
  };
}

function needContext(): AiTurn {
  return {
    messages: [t('Давай сначала определимся, о чём речь — тогда отвечу точно.'), t('Что ищем?')],
    replies: GROUP_REPLIES,
    conversation: { state: 'CLARIFYING', pending: ['group'] },
  };
}

function noSourcesYet(): AiTurn {
  return {
    messages: [
      t('Пока не на что ссылаться — мы ещё ничего не выбрали.'),
      t('Расскажи, что ищешь, и я покажу источники по каждому выводу.'),
    ],
    replies: [reply('что мне купить?', 'q:buy'), reply('что сейчас популярно', 'popular'), reply('позвать консультанта', 'human')],
    conversation: { state: 'IDLE' },
  };
}

/* --------------------------------------------------------------- tables */

const BUDGET_LABELS: Record<string, string> = {
  '2000': 'до 2 000 ₽',
  '5000': '2–5 тыс. ₽',
  '10000': '5–10 тыс. ₽',
};

const REASON_MEMORY: Record<string, string> = {
  запах: 'Не любит сильные отдушки',
  текстура: 'Не любит плотные текстуры',
  эффект: 'Ждёт заметный эффект от ухода',
  цена: 'Чувствительна к цене',
  другое: 'Этот продукт не подошёл',
};

const BUDGET_TIERS = [2000, 5000, 10000, null];

function nextBudgetTier(current: number): number | null {
  for (const tier of BUDGET_TIERS) {
    if (tier === null) return null;
    if (tier > current) return tier;
  }
  return null;
}

function labelOf(action: string, value?: string): string {
  const all = [...GROUP_REPLIES, ...PRIORITY_REPLIES, ...BUDGET_REPLIES, ...AVOID_REPLIES, ...TEXTURE_REPLIES];
  return all.find((r) => r.action === action && r.value === value)?.label ?? value ?? '';
}

const dedupe = <T,>(xs: T[]) => Array.from(new Set(xs));

/** Kept for the profile screen, which lists what the assistant would suggest next. */
export function recommendedIds(profile: BeautyProfile): string[] {
  return recommend(EMPTY_SLOTS, profile).ids;
}

/* ---------------------------------------------------- shared sheet copy */

/** Scenario 19 — the exact packet handed to a human, shown in chat and in the sheet. */
export function handoffContext(
  conv: Conversation,
  profile: BeautyProfile,
  chatContext: ChatContext,
): [string, string][] {
  const { slots, lastIds } = conv;
  const viewed = dedupe([...lastIds, ...profile.viewed]);
  const request = slots.giftFor
    ? `подарок ${slots.giftFor}`
    : [slots.needLabel, slots.texture ? (slots.texture === 'light' ? 'лёгкая текстура' : 'плотная текстура') : null]
        .filter(Boolean)
        .join(', ') ||
      (lastIds.length ? `подбор: ${PRODUCTS[lastIds[0]]?.category.toLowerCase()}` : 'подбор ещё не начат');

  return [
    ['запрос', request],
    ['бюджет', slots.budgetLabel ?? profile.budget ?? 'не назван'],
    ['тип продукта', slots.type ? TYPE_WORD[slots.type] : slots.group ? GROUP_WORD[slots.group] : 'не уточнён'],
    ['предпочтения', dedupe([...profile.preferences, ...profile.priorities]).join(', ') || 'не указаны'],
    ['не подходит', namedAvoid(slots, profile).join(', ').toLowerCase() || 'не указано'],
    ['смотрела', viewed.map((i) => PRODUCTS[i]?.name).filter(Boolean).join(', ') || 'пока ничего'],
    ['точка входа', chatContext.from],
  ];
}

/** The verdict under the comparison table, shared by the inline block and the sheet. */
export function compareVerdict(ids: string[], conv: Conversation, profile: BeautyProfile) {
  const [a, b] = ids;
  if (!a || !b) return { winnerId: a ?? null, text: '' };
  const winnerId = pickWinner(a, b, conv.slots, profile);
  const loserId = winnerId === a ? b : a;
  return {
    winnerId,
    text: `Если выбирать именно для тебя, я бы взяла ${PRODUCTS[winnerId].brand}. ${compareReason(winnerId, loserId, conv.slots, profile)}`,
  };
}

/** The tick list the "почему" sheet opens with — mirrors the in-chat evidence. */
export function preferenceChecks(productId: string, conv: Conversation, profile: BeautyProfile) {
  return suitability(productId, conv.slots, profile).items;
}

export { plural };
