import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { BottomSheet, Button, AiBanner, CompareFacts } from '../components/UI';
import { ChatInput, Pill } from '../components/Chat';
import { HomeIndicator } from '../components/Chrome';
import { Heart, CheckCircle, Bag, MinusBadge, PlusBadge, TickOk, TickWarn } from '../components/Icons';
import { useStore } from '../lib/store';
import { useAssistant } from '../lib/useAssistant';
import { compareVerdict, handoffContext, preferenceChecks, EMPTY_CONVERSATION } from '../lib/ai';
import { formatPrice, productLabel, PRODUCTS, sourcesFor, EDITORIAL, flaconForProducts } from '../data/products';
import { asset } from '../lib/asset';
import { noOrphan } from '../lib/copy';

export default function Sheets() {
  const store = useStore();
  const { sheet, closeSheet } = store;

  return (
    <>
      <AiIntroSheet />
      <ShareSheet />
      <WhySheet />
      <SourcesSheet />
      <CompareSheet />
      <FeedbackSheet />
      <ConsultantSheet />
      {/* keeps TS happy about the discriminated union being fully handled */}
      {sheet === null && <span hidden onClick={closeSheet} />}
    </>
  );
}

/* --------------------------------------------------- entry point sheet */

function AiIntroSheet() {
  const { sheet, closeSheet, push } = useStore();
  const open = sheet?.name === 'ai-intro';
  const [expanding, setExpanding] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    if (open) {
      setExpanding(false);
      opened.current = false;
    }
  }, [open]);

  const openAssistant = () => {
    if (opened.current) return;
    opened.current = true;
    flushSync(() => setExpanding(true));
    push({ name: 'chat' }, 'expand');
    closeSheet();
  };

  // Unmount as soon as we expand so an opacity-0 sheet cannot sit on chat.
  const show = open && !expanding;

  return (
    <AnimatePresence>
      {show && (
          <motion.div
            key="intro-backdrop"
            className="sheet-backdrop sheet-backdrop--intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.18 }}
            onClick={closeSheet}
          />
      )}
      {show && (
          <motion.div
            key="intro-sheet"
            className="sheet sheet--intro"
            initial={{ y: '100%' }}
            animate={{ y: 0, height: '72%' }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.55, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -64 || info.velocity.y < -450) {
                openAssistant();
                return;
              }
              if (info.offset.y > 110 || info.velocity.y > 600) closeSheet();
            }}
          >
            <div className="sheet__grabber">
              <span />
            </div>
            <button
              className="sheet__close press"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={closeSheet}
              aria-label="Закрыть"
            >
              <span className="sheet__close-x" />
            </button>
            <div className="intro__art">
              <img src={asset('mascot-phone.png')} alt="" />
            </div>
            <div className="intro__texts">
              <div className="t-headline-24">{noOrphan('Привет, я твой личный ассистент')}</div>
              <div className="t-body-16 intro__sub">
                Помогу с выбором, подскажу что подходит именно тебе исходя из прошлых покупок.
                {'\n'}А ещё всегда отвечу на вопросы 💚
              </div>
            </div>
            <div className="bottom-container" onPointerDown={(e) => e.stopPropagation()}>
              <ChatInput onSend={openAssistant} onActivate={openAssistant} />
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------- share */

function ShareSheet() {
  const { sheet, closeSheet, openSheet, favorites, toggleFavorite, setChatContext, setConversation, resetChat } = useStore();
  const open = sheet?.name === 'share';
  const pid = sheet?.name === 'share' ? sheet.productId : 'procollagen';
  const p = PRODUCTS[pid];

  return (
    <BottomSheet open={open} onClose={closeSheet} title="ссылкой удобнее">
      <div className="share__row">
        <img src={p.image} alt="" />
        <div className="share__main">
          <div className="t-card-15">{p.name}</div>
          <div className="share__vol">{p.volume}</div>
        </div>
        <button className="press" onClick={() => toggleFavorite(pid)} aria-label="В избранное">
          <Heart filled={favorites.includes(pid)} />
        </button>
      </div>
      <div className="share__banner">
        <button
          className="press"
          onClick={() => {
            resetChat();
            setChatContext({ from: 'pdp', productId: pid });
            setConversation({ ...EMPTY_CONVERSATION, state: 'PRODUCT_DETAIL', focusId: pid, lastIds: [pid] });
            openSheet({ name: 'ai-intro' });
          }}
        >
          <AiBanner variant="advice" />
        </button>
      </div>
      <div className="share__cta">
        <Button onClick={closeSheet}>поделиться</Button>
      </div>
      <HomeIndicator />
    </BottomSheet>
  );
}

/* --------------------------------------------------------------- why */

function WhySheet() {
  const { sheet, closeSheet, openSheet, profile, conversation } = useStore();
  const open = sheet?.name === 'why';
  const ids = sheet?.name === 'why' ? sheet.productIds : [];
  const checks = ids[0] ? preferenceChecks(ids[0], conversation, profile) : [];

  return (
    <BottomSheet
      open={open}
      onClose={closeSheet}
      title="почему это тебе подходит"
      footer={
        <div className="sheet__actions">
          <button type="button" className="pill t-label-14 press" onClick={() => openSheet({ name: 'sources', productIds: ids })}>
            показать источники
          </button>
          <button type="button" className="pill t-label-14 press" onClick={closeSheet}>
            понятно
          </button>
        </div>
      }
    >
      {checks.length > 0 && (
        <div className="why__block">
          <div className="why__kicker">твои предпочтения</div>
          <ul className="why__list">
            {checks.map((c) => (
              <li key={c.text} className="t-body-16">
                <span className="why__icon">{c.ok ? <TickOk size={24} /> : <TickWarn size={24} />}</span>
                {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ids.map((id) => {
        const p = PRODUCTS[id];
        const { brand, title } = productLabel(p);
        return (
          <div className="why" key={id}>
            <div className="why__head">
              <img src={p.image} alt="" />
              <div className="why__meta">
                <div className="why__brand">{brand}</div>
                <div className="why__name t-card-15">{title}</div>
                <div className="why__price">{formatPrice(p.price)}</div>
              </div>
            </div>
            <ul className="why__list">
              {p.why.map((w) => (
                <li key={w} className="t-body-16">
                  <TickOk size={24} />
                  {w}
                </li>
              ))}
            </ul>

            <div className="why__profile">
              <div className="why__kicker">покупатели чаще отмечают</div>
              {p.pros.map((x) => (
                <div key={x} className="aicard__sign t-body-16">
                  <span className="aicard__icon">
                    <PlusBadge />
                  </span>
                  <span>{x}</span>
                </div>
              ))}
              {p.cons.map((x) => (
                <div key={x} className="aicard__sign t-body-16">
                  <span className="aicard__icon">
                    <MinusBadge />
                  </span>
                  <span>{x}</span>
                </div>
              ))}
            </div>

            {p.caveats.length > 0 && (
              <div className="why__caveats">
                <div className="why__kicker">честно говорю</div>
                {p.caveats.map((c) => (
                  <div key={c} className="t-body-16 why__caveat">
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {profile.learned.length > 0 && (
        <div className="why__block">
          <div className="why__kicker">учитываю из твоего профиля</div>
          {profile.learned.map((l) => (
            <div key={l} className="memory">
              <span className="memory__dot" />
              <span className="t-body-16">{l}</span>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}

/* ----------------------------------------------------------- sources */

const KIND_LABEL: Record<string, string> = {
  community: 'отзывы и рейтинг',
  lab: 'характеристики',
  content: 'редакция и контент',
  profile: 'твой профиль',
};

function SourcesSheet() {
  const { sheet, closeSheet, openSheet, profile } = useStore();
  const open = sheet?.name === 'sources';
  const ids = sheet?.name === 'sources' ? sheet.productIds : [];
  const list = ids.flatMap((id) => sourcesFor(id, profile));

  return (
    <BottomSheet
      open={open}
      onClose={closeSheet}
      title="откуда я это знаю"
      footer={
        <div className="sheet__actions">
          <button type="button" className="pill t-label-14 press" onClick={() => openSheet({ name: 'consultant' })}>
            позвать консультанта
          </button>
          <button type="button" className="pill t-label-14 press" onClick={closeSheet}>
            вернуться к подборке
          </button>
        </div>
      }
    >
      <div className="sources__lead t-body-14">
        Я не придумываю ответы. Каждый вывод опирается на источник — можно проверить.
      </div>
      {list.map((s) => (
        <div className="source" key={s.id}>
          <div className={`source__kind source__kind--${s.kind}`}>{KIND_LABEL[s.kind]}</div>
          <div className="source__title">{s.title}</div>
          <div className="source__detail">{s.detail}</div>
          <div className="t-caption-12 source__meta">{s.meta}</div>
        </div>
      ))}
    </BottomSheet>
  );
}

/* ----------------------------------------------------------- compare */

function CompareSheet() {
  const { sheet, closeSheet, push, profile, conversation, addToCart } = useStore();
  const open = sheet?.name === 'compare';
  const ids = sheet?.name === 'compare' ? sheet.productIds : [];
  const [a, b] = ids.map((id) => PRODUCTS[id]);
  const budget = conversation.slots.budgetMax ?? profile.budgetMax;
  const { text } = compareVerdict(ids, conversation, profile);
  const flacon = flaconForProducts(ids, 2);

  const openProduct = (id: string) => push({ name: 'pdp', productId: id });
  const buy = (id: string) => {
    addToCart(id);
    push({ name: 'cart' });
  };

  const facts =
    a && b
      ? {
          price: ['цена', formatPrice(a.price), formatPrice(b.price)] as [string, string, string],
          social: [
            ['рейтинг', `${a.rating}`, `${b.rating}`],
            [
              'отзывы',
              a.reviews.toLocaleString('ru-RU').replace(/,/g, ' '),
              b.reviews.toLocaleString('ru-RU').replace(/,/g, ' '),
            ],
          ] as [string, string, string][],
          rest: [
            ['текстура', a.textureLabel, b.textureLabel],
            ['эффект', a.effects.slice(0, 2).join(', '), b.effects.slice(0, 2).join(', ')],
            ['отдушка', a.fragranceLabel, b.fragranceLabel],
            budget
              ? [
                  `в бюджет ${formatPrice(budget)}`,
                  a.price <= budget ? 'да' : 'нет',
                  b.price <= budget ? 'да' : 'нет',
                ]
              : ['подходящий бюджет', 'без ограничения', 'без ограничения'],
          ] as [string, string, string][],
        }
      : null;

  return (
    <BottomSheet
      open={open}
      onClose={closeSheet}
      title="сравнение"
      footer={
        a && b ? (
          <>
            <Button onClick={() => buy(a.id)}>в корзину · {a.brand}</Button>
            <Button variant="ghost" onClick={() => buy(b.id)}>
              в корзину · {b.brand}
            </Button>
          </>
        ) : undefined
      }
    >
      {facts && a && b && (
        <>
          <div className="sheet-card">
            <div className="cmp__head">
              {[a, b].map((p) => (
                <div className="cmp__col" key={p.id}>
                  <div className="cmp__media">
                    <button type="button" className="cmp__photo press" onClick={() => openProduct(p.id)} aria-label={p.name}>
                      <img src={p.image} alt="" />
                    </button>
                    <button
                      type="button"
                      className="pcard__bag press"
                      onClick={() => buy(p.id)}
                      aria-label={`В корзину ${p.brand}`}
                    >
                      <Bag color="#fff" size={16} />
                    </button>
                  </div>
                  <button type="button" className="cmp__name press" onClick={() => openProduct(p.id)}>
                    {p.brand}
                  </button>
                </div>
              ))}
            </div>
            <CompareFacts price={facts.price} social={facts.social} rest={facts.rest} />
          </div>
          {text && (
            <div className="cmp__verdict">
              <img src={asset('mascot-avatar.png')} alt="" />
              <div className="t-body-16">{text}</div>
            </div>
          )}
          {flacon.length > 0 && (
            <div className="sheet-card cmp__flacon">
              <div className="cmp__flacon-label t-caption-12">Flacon · медиа Золотого Яблока</div>
              {flacon.map((id) => {
                const e = EDITORIAL[id];
                if (!e) return null;
                return (
                  <a key={id} className="cmp__flacon-link t-body-14" href={e.href} target="_blank" rel="noopener noreferrer">
                    {e.title}
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}

/* ---------------------------------------------------------- feedback */

const REASONS = ['запах', 'текстура', 'эффект', 'цена', 'другое'];

/**
 * Scenario 21. The sheet only collects the answer — the profile update and the
 * follow-up in chat go through the same conversation turn the quick replies use.
 */
function FeedbackSheet() {
  const { sheet, closeSheet, push } = useStore();
  const { run } = useAssistant();
  const open = sheet?.name === 'feedback';
  const pid = sheet?.name === 'feedback' ? sheet.productId : 'frangipani';
  const [stage, setStage] = useState<'ask' | 'reasons' | 'done'>('ask');
  const [reason, setReason] = useState<string | null>(null);

  const close = () => {
    closeSheet();
    window.setTimeout(() => {
      setStage('ask');
      setReason(null);
    }, 260);
  };

  const like = () => {
    run(`fb-like:${pid}`);
    setStage('done');
  };

  const commit = (r: string) => {
    setReason(r);
    run(`fb-reason:${pid}`, r);
    setStage('done');
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={stage === 'reasons' ? 'что не зашло?' : stage === 'done' ? 'Запомнила.' : 'ну как тебе?'}
      footer={
        stage === 'done' ? (
          <>
            <Button
              onClick={() => {
                close();
                push({ name: 'profile' });
              }}
            >
              посмотреть профиль
            </Button>
            <Button variant="ghost" onClick={close}>
              закрыть
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="fb__product">
        <img src={PRODUCTS[pid].image} alt="" />
        <div className="t-card-15">{PRODUCTS[pid].name}</div>
      </div>

      {stage === 'ask' && (
        <div className="fb__actions">
          <Button onClick={like}>моё 💚</Button>
          <Button variant="ghost" onClick={() => setStage('reasons')}>
            не моё
          </Button>
        </div>
      )}

      {stage === 'reasons' && (
        <div className="fb__reasons">
          {REASONS.map((r) => (
            <Pill key={r} label={r} selected={reason === r} onClick={() => commit(r)} />
          ))}
        </div>
      )}

      {stage === 'done' && (
        <motion.div className="fb__done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CheckCircle size={24} />
          <div className="t-body-16">
            {reason
              ? 'Поняла. Учту это в следующих рекомендациях.'
              : 'Запомнила, что тебе это подошло. Буду искать похожее.'}
          </div>
        </motion.div>
      )}
    </BottomSheet>
  );
}

/* -------------------------------------------------------- consultant */

function ConsultantSheet() {
  const { sheet, closeSheet, profile, chatContext, conversation } = useStore();
  const { run } = useAssistant();
  const open = sheet?.name === 'consultant';
  const rows = handoffContext(conversation, profile, chatContext);

  return (
    <BottomSheet
      open={open}
      onClose={closeSheet}
      title="позвать консультанта"
      footer={
        <>
          <Button
            onClick={() => {
              closeSheet();
              run('consultant-go');
            }}
          >
            передать консультанту
          </Button>
          <Button variant="ghost" onClick={closeSheet}>
            остаться с ассистентом
          </Button>
        </>
      }
    >
      <div className="sources__lead t-body-14">
        Передам всё, что ты уже рассказала — не придётся объяснять заново.
      </div>
      <div className="handoff handoff--plain">
        {rows.map(([k, v]) => (
          <div key={k} className="handoff__row">
            <span className="t-caption-12">{k}</span>
            <span className="t-body-14">{v}</span>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
