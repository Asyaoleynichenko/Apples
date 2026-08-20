import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { AppleMark, Bag, Close, Heart, Person, SearchList } from './Icons';
import { formatPrice, productLabel, PRODUCTS } from '../data/products';
import { useStore } from '../lib/store';
import { asset } from '../lib/asset';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'muted';
  disabled?: boolean;
}) {
  return (
    <button className={`btn btn--${variant} t-label-14 press`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Badges({ discount, hit, best }: { discount?: number; hit?: boolean; best?: boolean }) {
  return (
    <div className="badges">
      {best && <span className="badge badge--match">BEST MATCH</span>}
      {!!discount && <span className="badge badge--sale">{discount}%</span>}
      {hit && <span className="badge badge--hit">HIT</span>}
    </div>
  );
}

/** Product card as drawn in the recommendation carousel. */
export function ProductCard({
  productId,
  width = 166,
  note,
  best = false,
  selected = false,
  onOpen,
  onAdd,
  onPick,
}: {
  productId: string;
  width?: number;
  /** One-line reason the assistant put this card in the list. */
  note?: string;
  best?: boolean;
  selected?: boolean;
  onOpen?: () => void;
  onAdd?: () => void;
  /** Onboarding pick: radio instead of bag, tap selects the card. */
  onPick?: () => void;
}) {
  const p = PRODUCTS[productId];
  const { favorites, toggleFavorite } = useStore();
  const liked = favorites.includes(productId);
  const { brand, title } = productLabel(p);
  return (
    <motion.div
      className="pcard"
      style={{ width }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pcard__media press" onClick={onPick ?? onOpen}>
        <img src={p.image} alt={p.name} />
        <Badges discount={p.discount} hit={p.hit} best={best} />
        <button
          className="pcard__heart"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(productId);
          }}
          aria-label="В избранное"
        >
          <Heart filled={liked} color={liked ? '#000' : '#000'} />
        </button>
        {onPick ? (
          <span className={`pcard__radio${selected ? ' pcard__radio--on' : ''}`} />
        ) : (
          <button
            className="pcard__bag press"
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.();
            }}
            aria-label="В корзину"
          >
            <Bag color="#fff" size={16} />
          </button>
        )}
      </div>
      <div className="pcard__cat">{p.category}</div>
      {onPick && (
        <div className="pcard__rate">
          <span className="pcard__stars">{'★★★★★'.slice(0, Math.round(p.rating))}</span>
          <span>{p.reviews}</span>
        </div>
      )}
      <div className="pcard__brand">{brand}</div>
      <div className="pcard__name">{title}</div>
      <div className="pcard__price">
        <b>{formatPrice(p.price)}</b>
        <s>{formatPrice(p.oldPrice)}</s>
      </div>
      {note && <div className="pcard__note">{note}</div>}
    </motion.div>
  );
}

/** Bottom sheet: white, 20px top corners, grabber, close button, backdrop. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="sheet__grabber">
              <span />
            </div>
            <button className="sheet__close press" onClick={onClose} aria-label="Закрыть">
              <Close />
            </button>
            {title && <div className="sheet__title t-headline-24">{title}</div>}
            <div className="sheet__body scroll">{children}</div>
            {footer && <div className="sheet__footer">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** The mascot banner that opens the assistant, used across entry points. */
export function AiBanner({ variant = 'expert' }: { variant?: 'expert' | 'search' | 'pdp' | 'advice' }) {
  if (variant === 'expert') {
    return (
      <span className="ai-banner ai-banner--expert">
        <img src={asset('banner-expert-fab.png')} alt="" />
        <span className="ai-banner__pill fill-send">
          <span>спросить эксперта</span>
        </span>
      </span>
    );
  }
  if (variant === 'pdp') {
    return (
      <span className="ai-banner ai-banner--pdp">
        <span className="ai-banner__inner fill-send">
          <span className="ai-banner__gloss" />
          <span className="ai-banner__copy">
            <b>не знаешь, что выбрать?</b>
            <span>
              расскажи, что хочется — я{'\n'}найду подходящие варианты
            </span>
          </span>
        </span>
        <img className="ai-banner__ill" src={asset('mascot-banner-pdp.png')} alt="" />
      </span>
    );
  }
  if (variant === 'search') {
    return (
      <span className="ai-banner ai-banner--search">
        <span className="ai-banner__inner fill-send">
          <span className="ai-banner__gloss" />
          <span className="ai-banner__copy">
            не знаешь, что выбрать?{'\n'}могу подсказать
          </span>
        </span>
        <span className="ai-banner__blob ai-banner__blob--a" />
        <span className="ai-banner__blob ai-banner__blob--b" />
        <img className="ai-banner__ill" src={asset('mascot-banner-search.png')} alt="" />
        <img className="ai-banner__glow" src={asset('banner-search-glow.png')} alt="" />
      </span>
    );
  }
  return (
    <span className="ai-banner ai-banner--advice">
      <span className="ai-banner__inner fill-send">
        <span className="ai-banner__gloss" />
        <span className="ai-banner__copy">
          нужен бьюти совет?{'\n'}давай помогу
        </span>
      </span>
      <img className="ai-banner__ill" src={asset('mascot-banner-share.png')} alt="" />
    </span>
  );
}

export function TabBar({ active }: { active?: 'search' | 'favorites' | 'catalog' | 'profile' | 'cart' }) {
  const { resetTo, cartCount } = useStore();
  const items = [
    { key: 'search' as const, go: () => resetTo({ name: 'search' }) },
    { key: 'favorites' as const, go: () => resetTo({ name: 'favorites' }) },
    { key: 'catalog' as const, go: () => resetTo({ name: 'favorites' }) },
    { key: 'profile' as const, go: () => resetTo({ name: 'profile' }) },
    { key: 'cart' as const, go: () => resetTo({ name: 'cart' }) },
  ];

  return (
    <div className="tabbar">
      {items.map((it) => {
        const on = active === it.key;
        return (
          <button
            key={it.key}
            className={`tabbar__item press${on ? ' tabbar__item--on' : ''}`}
            onClick={it.go}
            aria-label={it.key}
            aria-current={on ? 'page' : undefined}
          >
            <span className="tabbar__icon">
              {it.key === 'search' && <SearchList size={24} color="currentColor" />}
              {it.key === 'favorites' && <Heart size={24} color="currentColor" />}
              {it.key === 'catalog' && <AppleMark size={24} color="currentColor" />}
              {it.key === 'profile' && <Person size={24} color="currentColor" />}
              {it.key === 'cart' && <Bag size={24} color="currentColor" />}
              {it.key === 'cart' && cartCount > 0 && <span className="tabbar__badge">{cartCount}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
