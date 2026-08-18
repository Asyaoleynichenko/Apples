import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { StatusBar, HomeIndicator } from '../components/Chrome';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Close,
  Scan,
  Share,
  Sliders,
  Trash,
  CheckCircle,
  Plus,
  Minus,
  AiTag,
} from '../components/Icons';
import { AiBanner, Button, ProductCard, TabBar } from '../components/UI';
import { IosKeyboard } from '../components/Keyboard';
import { useStore } from '../lib/store';
import { extractSlots } from '../lib/intent';
import { formatPrice, PRODUCTS } from '../data/products';

/* ------------------------------------------------------------ favorites */

const IDLE_MS = 8000;

function useIdle(enabled: boolean, delay = IDLE_MS) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let timer = 0;
    const arm = (e?: Event) => {
      if (e && (e.target as Element | null)?.closest?.('.pcard__nudge')) return;
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), delay);
    };
    arm();
    const opts = { capture: true } as const;
    window.addEventListener('pointerdown', arm, opts);
    window.addEventListener('keydown', arm, opts);
    window.addEventListener('wheel', arm, opts);
    const scroller = document.querySelector('.shop .shop__scroll');
    scroller?.addEventListener('scroll', arm, opts);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', arm, opts);
      window.removeEventListener('keydown', arm, opts);
      window.removeEventListener('wheel', arm, opts);
      scroller?.removeEventListener('scroll', arm, opts);
    };
  }, [enabled, delay]);
  return idle;
}

export function Favorites() {
  const { push, openSheet, setChatContext, favorites, sheet } = useStore();
  const ids = ['frangipani', 'clarins', 'procollagen'];
  const idle = useIdle(sheet === null);
  const nudgeId = idle ? ids[1] ?? ids[0] : null;

  const openAi = () => {
    setChatContext({ from: 'favorites' });
    openSheet({ name: 'ai-intro' });
  };

  return (
    <div className="screen shop">
      <StatusBar />
      <div className="shop__topbar shop__topbar--between">
        <button className="press" onClick={() => push({ name: 'search' })} aria-label="Назад">
          <ChevronLeft />
        </button>
        <div className="shop__topbar-actions">
          <button className="press" onClick={openAi} aria-label="AI">
            <AiTag width={32} height={20} />
          </button>
        </div>
      </div>
      <div className="shop__scroll scroll">
        <h1 className="shop__h1">избранное</h1>
        <div className="tabs">
          <button className="tabs__item tabs__item--on">
            все продукты <span>/ {611 + favorites.length}</span>
          </button>
          <button className="tabs__item">
            вишлисты <span>/ 0</span>
          </button>
        </div>

        <div className="wishlist">
          <div className="wishlist__thumbs">
            <img src="/assets/product-elemis-procollagen.png" alt="" />
            <img src="/assets/product-clarins-body-firming.png" alt="" />
          </div>
          <div className="wishlist__copy">
            <div className="t-title-17">создайте вишлист</div>
            <div className="t-body-14 wishlist__sub">и делитесь любимым с друзьями</div>
          </div>
          <button className="wishlist__add press" aria-label="Создать">
            <Plus size={20} />
          </button>
        </div>

        <div className="filters">
          <button className="press" aria-label="Фильтры">
            <Sliders />
          </button>
          <div className="filters__count t-body-14">{611 + favorites.length} продуктов</div>
        </div>

        <div className="chips-row hscroll">
          <button className="chip chip--promo">% ПРОМОКОД</button>
          <button className="chip">СО СКИДКОЙ</button>
          <button className="chip">
            ЦЕНА <ChevronDown size={16} />
          </button>
          <button className="chip">СРОК ДОСТАВКИ</button>
        </div>

        <div className="grid">
          {ids.map((id) => (
            <ProductCard
              key={id}
              productId={id}
              width={166}
              onOpen={() => push({ name: 'pdp', productId: id })}
              onAdd={() => push({ name: 'pdp', productId: id })}
              onAskExpert={nudgeId === id ? openAi : undefined}
            />
          ))}
        </div>
        <div className="shop__pad" />
      </div>

      <div className="promo-bar promo-bar--blue">До −60% на большой летней распродаже</div>
      <TabBar active="favorites" />
      <HomeIndicator />
    </div>
  );
}

/* --------------------------------------------------------------- search */

export function Search() {
  const { push, openSheet, setChatContext, setConversation, conversation } = useStore();
  const [q, setQ] = useState('крем');
  const [kb, setKb] = useState(true);

  const suggestions = ['крем для лица', 'крем для лица увлажняющий', 'крем для тела', 'крем для рук', 'крем для кожи вокруг глаз'];
  const brands = ['FOR ME BY GOLD APPLE', 'TIGI BED HEAD', 'RATED GREEN'];

  // The search query is a request in itself, so it pre-fills the slots.
  const openAi = () => {
    setChatContext({ from: 'search', query: q });
    setConversation({ state: 'UNDERSTANDING_REQUEST', slots: { ...conversation.slots, ...extractSlots(q) } });
    openSheet({ name: 'ai-intro' });
  };

  return (
    <div className="screen shop">
      <StatusBar />
      <div className="shop__topbar shop__topbar--between">
        <button className="press" onClick={() => push({ name: 'favorites' })} aria-label="Назад">
          <ChevronLeft />
        </button>
        <button className="press" aria-label="Сканировать">
          <Scan />
        </button>
      </div>

      <div className="search-field">
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setKb(true)} />
        <button className="search-field__clear press" onClick={() => setQ('')} aria-label="Очистить">
          <Close size={14} color="#fff" />
        </button>
      </div>

      <div className="chips-row chips-row--soft hscroll">
        {['для лица', 'увлажняющий', 'для тела', 'для рук'].map((c) => (
          <button key={c} className="chip chip--soft" onClick={() => setQ(`крем ${c}`)}>
            {c}
          </button>
        ))}
      </div>

      <div className="search-list scroll" style={{ paddingBottom: kb ? 360 : 120 }}>
        {suggestions.map((s) => (
          <button key={s} className="search-list__row press" onClick={() => push({ name: 'pdp', productId: 'frangipani' })}>
            <b>крем</b>
            {s.slice(4)}
          </button>
        ))}
        <div className="search-list__brands">
          {brands.map((b) => (
            <button key={b} className="search-list__brand press">
              {b}
            </button>
          ))}
        </div>
      </div>

      <div
        className="search-banner press"
        role="button"
        tabIndex={0}
        onClick={openAi}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAi();
          }
        }}
      >
        <AiBanner variant="search" />
      </div>

      <AnimatePresence>
        {kb && (
          <IosKeyboard
            onKey={(ch) => setQ((v) => v + ch)}
            onBackspace={() => setQ((v) => v.slice(0, -1))}
            onSubmit={() => setKb(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------------------- cart */

export function Cart() {
  const { cart, setQty, push, resetTo } = useStore();
  const total = cart.reduce((sum, l) => sum + PRODUCTS[l.productId].price * l.qty, 0);
  const count = cart.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="screen shop">
      <StatusBar />
      <div className="shop__scroll scroll">
        <div className="cart__head">
          <h1 className="shop__h1 shop__h1--tight">корзина</h1>
          <div className="cart__head-actions">
            <button className="press" aria-label="Удалить">
              <Trash />
            </button>
            <button className="press" aria-label="Поделиться">
              <Share size={22} />
            </button>
            <CheckCircle />
          </div>
        </div>

        <div className="cart__free">бесплатная доставка</div>

        {cart.length === 0 && <div className="cart__empty t-body-16">пока пусто — добавь что-нибудь из подборки</div>}

        {cart.map((l) => {
          const p = PRODUCTS[l.productId];
          return (
            <div className="cart-line" key={l.productId}>
              <img className="cart-line__img press" src={p.image} alt="" onClick={() => push({ name: 'pdp', productId: p.id })} />
              <div className="cart-line__main">
                <div className="cart-line__cat">{p.category}</div>
                <div className="cart-line__name t-card-15">{p.name}</div>
                <div className="cart-line__vol">{p.volume}</div>
              </div>
              <CheckCircle />
              <div className="cart-line__foot">
                <div className="stepper">
                  <button className="press" onClick={() => setQty(p.id, l.qty - 1)} aria-label="Меньше">
                    <Minus />
                  </button>
                  <span>{l.qty}</span>
                  <button className="press" onClick={() => setQty(p.id, l.qty + 1)} aria-label="Больше">
                    <Plus />
                  </button>
                </div>
                <div className="cart-line__prices">
                  <div className="cart-line__save">скидка {formatPrice((p.oldPrice - p.price) * l.qty)}</div>
                  <div>
                    <s>{formatPrice(p.oldPrice * l.qty)}</s>
                    <b>{formatPrice(p.price * l.qty)}</b>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="cart__section-title">нет в наличии</div>
        <div className="cart-line cart-line--off">
          <div className="cart-line__img cart-line__img--ghost" />
          <div className="cart-line__main">
            <div className="cart-line__cat">ПЕНКА ДЛЯ УМЫВАНИЯ</div>
            <div className="cart-line__name t-card-15">CELIMAX relief madecica ph balancing</div>
            <div className="cart-line__vol">150 МЛ</div>
          </div>
          <div className="cart-line__foot">
            <div className="stepper stepper--off">
              <button aria-label="Меньше">
                <Minus color="#c4c4c4" />
              </button>
              <span>0</span>
              <button aria-label="Больше">
                <Plus color="#c4c4c4" />
              </button>
            </div>
            <div className="cart-line__oos t-label-14">нет в наличии</div>
          </div>
        </div>

        <div className="promo-input">ВВЕДИТЕ ПРОМОКОД <span><ChevronRight size={16} color="#b3b3b3" /></span></div>
        <div className="promo-card">
          <div>
            <div className="promo-card__brand">ФОМИШКА</div>
            <div className="promo-card__title">скидка −25%</div>
            <div className="promo-card__note">только до 23 августа</div>
          </div>
          <div className="promo-card__apply">ПРИМЕНИТЬ</div>
        </div>
        <div className="shop__pad" />
      </div>

      <div className="cart__footer">
        <div className="cart__total">
          <div className="cart__total-label">итого</div>
          <div className="cart__total-value">{formatPrice(total)}</div>
        </div>
        <Button onClick={() => resetTo({ name: 'profile' })} disabled={count === 0}>
          ОФОРМИТЬ ЗАКАЗ · {count} ШТ.
        </Button>
      </div>

      <TabBar active="cart" />
      <HomeIndicator />
    </div>
  );
}

/* -------------------------------------------------------------- profile */

/** Not present in the Figma file — built from the same tokens and copy voice. */
export function Profile() {
  const { profile, cart, push, openSheet, setChatContext, resetTo } = useStore();
  const bought = profile.purchases.length ? profile.purchases : cart.map((l) => l.productId);

  return (
    <div className="screen shop">
      <StatusBar />
      <div className="shop__scroll scroll">
        <div className="shop__topbar">
          <button className="press" onClick={() => resetTo({ name: 'favorites' })} aria-label="Назад">
            <ChevronLeft />
          </button>
        </div>
        <h1 className="shop__h1">мой бьюти-профиль</h1>

        <div className="profile__hero">
          <img src="/assets/mascot-head-glossy.png" alt="" />
          <div className="t-body-16 profile__hero-copy">
            {profile.learned.length
              ? 'вот что я про тебя запомнила. чем больше говоришь — тем точнее подбираю'
              : 'мы ещё не знакомы. пройди знакомство — и я начну подбирать под тебя'}
          </div>
        </div>

        {!profile.onboarded && (
          <div className="profile__cta">
            <Button onClick={() => push({ name: 'onboarding' })}>пройти знакомство</Button>
          </div>
        )}

        {profile.learned.length > 0 && (
          <Section title="что я знаю">
            <AnimatePresence initial={false}>
              {profile.learned.map((l) => (
                <motion.div
                  key={l}
                  className="memory"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  <span className="memory__dot" />
                  <span className="t-body-14">{l}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </Section>
        )}

        {bought.length > 0 && (
          <Section title="покупки">
            {bought.map((id) => (
              <button key={id} className="profile__row press" onClick={() => openSheet({ name: 'feedback', productId: id })}>
                <img src={PRODUCTS[id].image} alt="" />
                <div>
                  <div className="t-card-15">{PRODUCTS[id].name}</div>
                  <div className="t-caption-12 profile__row-sub">оценить покупку</div>
                </div>
                <ChevronRight color="#b3b3b3" />
              </button>
            ))}
          </Section>
        )}

        <Section title="спросить ассистента">
          <button
            className="profile__ask press"
            onClick={() => {
              setChatContext({ from: 'home' });
              push({ name: 'chat' });
            }}
          >
            <span className="t-card-15">открыть ассистента</span>
            <ChevronRight color="#b3b3b3" />
          </button>
        </Section>
        <div className="shop__pad" />
      </div>
      <TabBar active="profile" />
      <HomeIndicator />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="section__title t-title-17">{title}</div>
      <div className="section__body">{children}</div>
    </div>
  );
}
