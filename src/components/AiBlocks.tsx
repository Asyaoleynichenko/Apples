import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Bag, MinusBadge, PlusBadge, StarRating, TickOk, TickWarn } from './Icons';
import { EDITORIAL, PRODUCTS, formatPrice, plural, sourcesFor } from '../data/products';
import { useStore } from '../lib/store';
import type { CheckItem, RoutineLine } from '../lib/types';

const rise = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

/** Shared shell for every structured answer, matching the handoff card. */
function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <motion.div className="aicard" {...rise}>
      {title && <div className="aicard__title t-caption-12">{title}</div>}
      {children}
    </motion.div>
  );
}

/** A tick / warning list — the "твои предпочтения" pattern from the design. */
export function ChecksBlock({ title, items }: { title: string; items: CheckItem[] }) {
  return (
    <Card title={title}>
      <ul className="why__list">
        {items.map((it) => (
          <li key={it.text} className="t-body-14">
            {it.ok ? <TickOk /> : <TickWarn />}
            {it.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Scenario 4 — preferences, product facts and what buyers actually say. */
export function EvidenceBlock({ productId }: { productId: string }) {
  const { profile, conversation } = useStore();
  const p = PRODUCTS[productId];
  const slots = conversation.slots;

  const prefs: string[] = [];
  if (slots.texture) prefs.push(slots.texture === 'light' ? 'лёгкая текстура' : 'плотная текстура');
  profile.preferences.forEach((x) => prefs.push(x));
  const budget = slots.budgetMax ?? profile.budgetMax;
  if (budget) prefs.push(`бюджет ${formatPrice(budget)}`);
  const skin = slots.need ?? profile.skinType;
  if (skin) prefs.push(`${skin} кожа`);
  if (slots.priority) prefs.push(`важен ${slots.priority.toLowerCase()}`);
  if (!prefs.length) prefs.push('пока опираюсь на отзывы и рейтинг — профиль ещё пустой');

  return (
    <Card>
      <div className="aicard__section">
        <div className="aicard__title t-caption-12">твои предпочтения</div>
        <ul className="why__list">
          {Array.from(new Set(prefs)).map((x) => (
            <li key={x} className="t-body-14">
              <TickOk />
              {x}
            </li>
          ))}
        </ul>
      </div>

      <div className="aicard__section">
        <div className="aicard__title t-caption-12">о продукте</div>
        <div className="aicard__rating">
          <span className="aicard__star">
            <StarRating size={20} />
            {p.rating}
          </span>
          <span className="t-body-14 aicard__reviews">
            {p.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')} {plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}
          </span>
        </div>
        <div className="t-body-14 aicard__muted">
          {p.textureLabel}. Отдушка: {p.fragranceLabel}.
        </div>
      </div>

      <div className="aicard__section">
        <div className="aicard__title t-caption-12">покупатели чаще отмечают</div>
        {p.pros.map((x) => (
          <div key={x} className="aicard__sign t-body-14">
            <span className="aicard__icon">
              <PlusBadge />
            </span>
            {x}
          </div>
        ))}
        {p.cons.map((x) => (
          <div key={x} className="aicard__sign t-body-14">
            <span className="aicard__icon">
              <MinusBadge />
            </span>
            {x}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Scenario 14 — the review digest. */
export function ReviewsBlock({ productId }: { productId: string }) {
  const p = PRODUCTS[productId];
  return (
    <Card title={`${p.brand} · отзывы`}>
      <div className="aicard__rating">
        <span className="aicard__star">
          <StarRating size={20} />
          {p.rating}
        </span>
        <span className="t-body-14 aicard__reviews">
          {p.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')} {plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}
        </span>
      </div>
      <div className="aicard__section">
        <div className="aicard__title t-caption-12">позитив</div>
        {p.pros.map((x) => (
          <div key={x} className="aicard__sign t-body-14">
            <span className="aicard__icon">
              <PlusBadge />
            </span>
            {x}
          </div>
        ))}
      </div>
      <div className="aicard__section">
        <div className="aicard__title t-caption-12">негатив</div>
        {p.cons.length ? (
          p.cons.map((x) => (
            <div key={x} className="aicard__sign t-body-14">
              <span className="aicard__icon">
                <MinusBadge />
              </span>
              {x}
            </div>
          ))
        ) : (
          <div className="t-body-14 aicard__muted">повторяющихся минусов в отзывах нет</div>
        )}
      </div>
    </Card>
  );
}

const KIND_LABEL: Record<string, string> = {
  community: 'отзывы покупательниц',
  lab: 'характеристики',
  content: 'редакция и контент',
  profile: 'твой профиль',
};

/** Scenario 5 — the six evidence buckets, each openable. */
export function SourcesBlock({ productId }: { productId: string }) {
  const { profile, openSheet } = useStore();
  const list = sourcesFor(productId, profile);
  return (
    <motion.div className="aicard aicard--flush" {...rise}>
      {list.map((s) => (
        <div className="source" key={s.id}>
          <div className={`source__kind source__kind--${s.kind}`}>{KIND_LABEL[s.kind]}</div>
          <div className="source__title">{s.title}</div>
          <div className="source__detail">{s.detail}</div>
          <div className="source__foot">
            <span className="t-caption-12 source__meta">{s.meta}</span>
            <button className="source__open t-caption-12 press" onClick={() => openSheet({ name: 'sources', productIds: [productId] })}>
              открыть
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/** Bookmark from Flacon's publication card — decorative, stays in the prototype. */
function FlaconMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden>
      <path d="M7.6025 12.364L0.75 16.6468V0.75H15.25V16.6468L8.3975 12.364L8 12.1156L7.6025 12.364Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Scenario 15 — Flacon tiles: rubric → cover → minutes → title → Читать. */
export function ContentBlock({ contentIds }: { contentIds: string[] }) {
  const hasFlacon = contentIds.some((id) => EDITORIAL[id]?.kind === 'flacon');
  const open = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div className="aicard aicard--flush flacon" {...rise}>
      <div className="flacon__head">
        <div className="flacon__brand">{hasFlacon ? 'Flacon' : 'Золотое Яблоко'}</div>
        <div className="flacon__tag">{hasFlacon ? 'медиа Золотого Яблока' : 'видео и соцсети'}</div>
      </div>
      {contentIds.map((id) => {
        const e = EDITORIAL[id];
        if (!e) return null;
        return (
          <article className="flacon-card" key={id}>
            <div className="flacon-card__rubrics">
              <span>{e.category}</span>
              <span>{e.section}</span>
            </div>
            <button type="button" className="flacon-card__cover press" onClick={() => open(e.href)} aria-label={e.title}>
              <img src={e.cover} alt="" />
            </button>
            <div className="flacon-card__meta">
              <span>{e.minutes} мин</span>
              <span className="flacon-card__mark">
                <FlaconMark />
              </span>
            </div>
            <div className="flacon-card__title">{e.title}</div>
            <button type="button" className="flacon-card__read press" onClick={() => open(e.href)}>
              Читать
            </button>
          </article>
        );
      })}
    </motion.div>
  );
}

/** Scenario 13 — the AM / PM plan. */
export function RoutineBlock({ lines }: { lines: RoutineLine[] }) {
  const { push } = useStore();
  const groups: ('am' | 'pm')[] = ['am', 'pm'];
  return (
    <Card>
      {groups.map((time) => {
        const rows = lines.filter((l) => l.time === time);
        if (!rows.length) return null;
        return (
          <div className="aicard__section" key={time}>
            <div className="aicard__title t-caption-12">{time === 'am' ? 'утро' : 'вечер'}</div>
            {rows.map((row, i) => {
              const p = row.productId ? PRODUCTS[row.productId] : null;
              return (
                <button
                  key={`${time}-${row.step}-${i}`}
                  className={`rt__row${p ? ' press' : ' rt__row--empty'}`}
                  onClick={() => p && push({ name: 'pdp', productId: p.id })}
                  disabled={!p}
                >
                  <span className="rt__num t-caption-12">{i + 1}</span>
                  {p && <img className="rt__img" src={p.image} alt="" />}
                  <span className="rt__text">
                    <span className="t-card-15">{p ? p.name : row.step}</span>
                    <span className="t-caption-12 aicard__muted">{p ? `${row.step} · ${row.note}` : row.note}</span>
                  </span>
                  {p && <span className="rt__price t-body-14">{formatPrice(p.price)}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </Card>
  );
}

/** Scenario 6 — the comparison table, inline in the conversation. */
export function CompareBlock({ productIds }: { productIds: string[] }) {
  const { openSheet, push, addToCart } = useStore();
  const [a, b] = productIds.map((id) => PRODUCTS[id]);
  if (!a || !b) return null;

  const rows: [string, string, string][] = [
    ['цена', formatPrice(a.price), formatPrice(b.price)],
    ['рейтинг', `${a.rating}`, `${b.rating}`],
    ['отзывы', a.reviews.toLocaleString('ru-RU').replace(/,/g, ' '), b.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')],
    ['текстура', a.textureLabel, b.textureLabel],
    ['эффект', a.effects.slice(0, 2).join(', '), b.effects.slice(0, 2).join(', ')],
    ['отдушка', a.fragranceLabel, b.fragranceLabel],
  ];

  return (
    <motion.div className="aicard aicard--cmp" {...rise}>
      <div className="cmp__head">
        {[a, b].map((p) => (
          <div className="cmp__col" key={p.id}>
            <div className="cmp__media">
              <button
                type="button"
                className="cmp__photo press"
                onClick={() => push({ name: 'pdp', productId: p.id })}
                aria-label={p.name}
              >
                <img src={p.image} alt="" />
              </button>
              <button
                type="button"
                className="pcard__bag press"
                onClick={() => {
                  addToCart(p.id);
                  push({ name: 'cart' });
                }}
                aria-label={`В корзину ${p.brand}`}
              >
                <Bag color="#fff" size={16} />
              </button>
            </div>
            <button type="button" className="cmp__name press t-body-14" onClick={() => push({ name: 'pdp', productId: p.id })}>
              {p.brand}
            </button>
          </div>
        ))}
      </div>
      <div className="cmp__rows">
        {rows.map(([label, va, vb]) => (
          <div className="cmp__row" key={label}>
            <div className="cmp__label t-caption-12">{label}</div>
            <div className="cmp__vals">
              <span className="t-body-14">{va}</span>
              <span className="t-body-14">{vb}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="source__open t-caption-12 press aicard__more" onClick={() => openSheet({ name: 'compare', productIds })}>
        развернуть сравнение
      </button>
    </motion.div>
  );
}
