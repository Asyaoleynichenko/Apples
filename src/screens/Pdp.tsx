import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { StatusBar, HomeIndicator } from '../components/Chrome';
import { AiTag, ChevronLeft, Heart, Share, Bag } from '../components/Icons';
import { AiBanner, Badges, TabBar } from '../components/UI';
import { useStore } from '../lib/store';
import { formatPrice, PRODUCTS } from '../data/products';

export default function Pdp({ productId }: { productId: string }) {
  const p = PRODUCTS[productId];
  const {
    back,
    addToCart,
    cart,
    setQty,
    push,
    openSheet,
    setChatContext,
    setConversation,
    setProfile,
    profile,
    favorites,
    toggleFavorite,
  } = useStore();
  const [vol, setVol] = useState(p.volumes.find((v) => v.available)?.label ?? p.volumes[0].label);
  const [toast, setToast] = useState(false);
  const line = cart.find((l) => l.productId === productId);
  const liked = favorites.includes(productId);

  // Viewing a card is context the assistant and the consultant handoff both use.
  useEffect(() => {
    setProfile({ viewed: Array.from(new Set([...profile.viewed, productId])) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const add = () => {
    addToCart(productId);
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  const askAi = () => {
    setChatContext({ from: 'pdp', productId });
    setConversation({ state: 'PRODUCT_DETAIL', focusId: productId });
    openSheet({ name: 'ai-intro' });
  };

  const stars = Math.round(p.rating);

  return (
    <div className="screen shop">
      <StatusBar />

      <div className="pdp__topbar">
        <button className="press" onClick={back} aria-label="Назад">
          <ChevronLeft />
        </button>
        <div className="pdp__rating">
          <span className="pdp__stars">
            {'★★★★★'.slice(0, stars)}
            <span className="pdp__stars-off">{'★★★★★'.slice(stars)}</span>
          </span>
          <span className="pdp__reviews">· {p.reviews} отзыва</span>
        </div>
        <div className="pdp__topbar-right">
          <button className="press" onClick={askAi} aria-label="AI">
            <AiTag width={32} height={20} />
          </button>
          <button className="press" onClick={() => openSheet({ name: 'share', productId })} aria-label="Поделиться">
            <Share size={22} />
          </button>
        </div>
      </div>

      <div className="pdp__scroll scroll">
        <div className="promo-bar promo-bar--sand">Еще до −25% на уход от 4 000 ₽ и не только →</div>

        <div className="pdp__titleblock">
          <div className="pdp__cat">{p.category}</div>
          <h1 className="pdp__title">{p.name}</h1>
          <div className="pdp__badges">
            <Badges discount={p.discount} hit={p.hit} />
          </div>
        </div>

        <div className="pdp__media">
          <img src={p.image} alt={p.name} />
          <div className="pdp__dots">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={i === 0 ? 'on' : ''} />
            ))}
          </div>
        </div>

        <div className="pdp__bonus">
          <span className="pdp__bonus-a">✷ +{p.bonusA}</span>
          <span className="pdp__bonus-sep">/</span>
          <span className="pdp__bonus-b">+{p.bonusB}</span>
        </div>

        <div className="pdp__price">
          <b>{formatPrice(p.price)}</b>
          <s>{formatPrice(p.oldPrice)}</s>
        </div>
        <div className="pdp__price-note">
          <span>со скидкой {p.discount}%</span>
          <span className="pdp__price-note-grey">без скидки</span>
        </div>

        <button className="pdp__installment press">
          <span>от {formatPrice(Math.round(p.price / 4))} × 4 платежа</span>
          <span className="pdp__installment-more">подробнее →</span>
        </button>

        <div className="pdp__volumes">
          <div className="pdp__volumes-label">ОБЪЁМ / МЛ</div>
          <div className="pdp__volumes-row">
            {p.volumes.map((v) => (
              <button
                key={v.label}
                className={`vol${v.available ? '' : ' vol--off'}${vol === v.label ? ' vol--on' : ''}`}
                onClick={() => v.available && setVol(v.label)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pdp__ai">
          <button className="press" onClick={askAi}>
            <AiBanner variant="pdp" />
          </button>
        </div>

        <p className="pdp__desc">
          Легендарный крем {p.brand} с клинически доказанным действием — теперь и для тела! Вдохновлённый
          культовым кремом для лица, помогает бороться с видимыми признаками старения и дарит заметно более
          мягкую, увлажнённую и сияющую кожу.
        </p>
        <div className="shop__pad" />
      </div>

      <div className="pdp__cta">
        {line ? (
          <div className="pdp__stepper">
            <button className="press" onClick={() => setQty(productId, line.qty - 1)}>
              −
            </button>
            <span>{line.qty} шт.</span>
            <button className="press" onClick={() => setQty(productId, line.qty + 1)}>
              +
            </button>
          </div>
        ) : (
          <button className="pdp__add press" onClick={add}>
            добавить в корзину
          </button>
        )}
        <button className="pdp__like press" onClick={() => toggleFavorite(productId)} aria-label="В избранное">
          <Heart color="#fff" filled={liked} />
        </button>
      </div>

      <TabBar active="cart" />
      <HomeIndicator />

      <AnimatePresence>
        {toast && (
          <motion.button
            className="toast press"
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            onClick={() => push({ name: 'cart' })}
          >
            <img src={p.image} alt="" />
            <div className="toast__main">
              <div className="toast__head">
                <Bag size={16} color="#fff" /> добавлен в корзину
              </div>
              <div className="toast__name">{p.name}</div>
              <div className="toast__vol">{vol} МЛ</div>
            </div>
            <Share size={20} color="#fff" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
