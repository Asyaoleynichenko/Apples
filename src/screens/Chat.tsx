import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { StatusBar, ChatHeader } from '../components/Chrome';
import { AiBubble, ChatInput, QuickReplies, TypingBubble, UserBubble, Pill } from '../components/Chat';
import { ProductCard } from '../components/UI';
import {
  ChecksBlock,
  CompareBlock,
  ContentBlock,
  EvidenceBlock,
  ReviewsBlock,
  RoutineBlock,
  SourcesBlock,
} from '../components/AiBlocks';
import { Sparkle, Bulb, Doc, Layers } from '../components/Icons';
import { useStore } from '../lib/store';
import { useAssistant } from '../lib/useAssistant';
import { openingLine } from '../lib/ai';
import { PRODUCTS } from '../data/products';
import { asset } from '../lib/asset';
import { noOrphan } from '../lib/copy';
import type { Conversation, QuickReply } from '../lib/types';

/** Starter pills from Figma node 240:26779 — labels are source of truth. */
const STARTERS = [
  ['выбери подарок', 'gift'],
  ['что популярно', 'popular'],
  ['что лучше', 'compare'],
  ['расскажи про новинки', 'popular'],
  ['посоветуй крем', 'cream'],
  ['подбери оттенок', 'shade-help'],
] as const;

const CAPABILITIES = [
  { title: 'подбери\nполезное', icon: <Sparkle />, action: 'q:buy', tag: true },
  { title: 'нужен\nсовет', icon: <Bulb />, action: 'routine' },
  { title: 'применение', icon: <Doc />, action: 'content' },
  { title: 'создай\nподборку', icon: <Layers />, action: 'popular' },
] as const;

export default function Chat() {
  const { chat, quickReplies, chatContext, back, resetTo, addToCart, openSheet } = useStore();
  const { run, send, start } = useAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chat, quickReplies]);

  const onQuickReply = (r: QuickReply) => run(r.action, r.value);

  const started = chat.length > 0;
  const opening = openingLine(chatContext);

  return (
    <div className="screen chat">
      <StatusBar />
      <ChatHeader
        title={started ? 'ассистент' : undefined}
        onBack={back}
        onClose={() => resetTo({ name: 'favorites' })}
      />

      <div className="chat-scroll scroll" ref={scrollRef}>
        <div className="welcome">
          <div className="welcome__hero">
            <div className="welcome__mascot">
              <img src={asset('banner-expert.png')} alt="" />
              <button
                type="button"
                className="welcome__expert press"
                onClick={() => openSheet({ name: 'consultant' })}
                aria-label="спросить эксперта"
              />
            </div>
            <div className="welcome__texts">
              <div className="t-headline-24">{noOrphan('привет, я твой личный ассистент')}</div>
              <div className="t-body-16 welcome__sub">
                помогу с{'\u00a0'}выбором, подскажу что{'\u00a0'}подходит именно тебе исходя из{'\u00a0'}прошлых покупок.
                {'\n'}а{'\u00a0'}ещё{'\u00a0'}всегда отвечу на{'\u00a0'}вопросы 💚
              </div>
            </div>
          </div>

          {!started && opening && (
            <div className="welcome__context">
              <AiBubble>{opening}</AiBubble>
            </div>
          )}

          {!started && (
            <>
              <div className="welcome__section">
                <div className="t-title-17 welcome__section-title">{noOrphan('с чего начнём?')}</div>
                <div className="welcome__starters">
                  <div className="welcome__starter-row hscroll">
                    {STARTERS.slice(0, 3).map(([label, action]) => (
                      <Pill key={label} label={label} onClick={() => start(action)} />
                    ))}
                  </div>
                  <div className="welcome__starter-row hscroll">
                    {STARTERS.slice(3).map(([label, action]) => (
                      <Pill key={label} label={label} onClick={() => start(action)} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="welcome__section">
                <div className="t-title-17 welcome__section-title">что умею</div>
                <div className="welcome__caps hscroll">
                  {CAPABILITIES.map((c) => (
                    <button key={c.title} className="cap press" onClick={() => start(c.action)}>
                      <span className="cap__icon">{c.icon}</span>
                      {'tag' in c && c.tag && (
                        <img className="cap__tag" src={asset('cap-tag-new.svg')} alt="" />
                      )}
                      <span className="cap__title t-card-15">{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {started && (
          <div className="chat-body">
            <AnimatePresence initial={false}>
              {chat.map((m) => {
                if (m.kind === 'typing') return <TypingBubble key={m.id} />;
                if (m.role === 'user') return <UserBubble key={m.id} text={m.text} />;

                switch (m.kind) {
                  case 'text':
                    return (
                      <AiBubble
                        key={m.id}
                        text={m.text}
                        linkLabel={m.link?.label}
                        onLink={() => m.link && run(m.link.action)}
                      />
                    );

                  case 'products':
                    return (
                      <motion.div
                        key={m.id}
                        className="pcards hscroll"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {m.productIds.map((id) => (
                          <ProductCard
                            key={id}
                            productId={id}
                            note={m.notes?.[id]}
                            best={m.bestId === id}
                            onOpen={() => run(`open:${id}`)}
                            onAdd={() => {
                              addToCart(id);
                              run(`add:${id}`);
                            }}
                          />
                        ))}
                      </motion.div>
                    );

                  case 'checks':
                    return <ChecksBlock key={m.id} title={m.title} items={m.items} />;
                  case 'evidence':
                    return <EvidenceBlock key={m.id} productId={m.productId} />;
                  case 'reviews':
                    return <ReviewsBlock key={m.id} productId={m.productId} />;
                  case 'sources':
                    return <SourcesBlock key={m.id} productId={m.productId} />;
                  case 'content':
                    return <ContentBlock key={m.id} contentIds={m.contentIds} />;
                  case 'routine':
                    return <RoutineBlock key={m.id} lines={m.lines} />;
                  case 'compare':
                    return <CompareBlock key={m.id} productIds={m.productIds} />;
                  case 'handoff':
                    return <HandoffCard key={m.id} />;
                  case 'memory':
                    return (
                      <motion.div
                        key={m.id}
                        className="memory memory--chat"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <span className="memory__dot" />
                        <span className="t-body-14">{m.text}</span>
                      </motion.div>
                    );
                  default:
                    return null;
                }
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="bottom-container">
        {started && <QuickReplies replies={quickReplies} onPick={onQuickReply} />}
        <ChatInput onSend={send} />
      </div>
    </div>
  );
}

/** Scenario 19 — everything the human consultant receives, so nothing is repeated. */
function HandoffCard() {
  const { profile, chatContext, conversation } = useStore();
  const { slots, lastIds } = conversation;
  const viewed = Array.from(new Set([...lastIds, ...profile.viewed]));

  const rows: [string, string][] = [
    ['запрос', requestLine(conversation)],
    ['бюджет', slots.budgetLabel ?? profile.budget ?? 'не назван'],
    ['тип продукта', slots.type ? PRODUCTS[lastIds[0]]?.category.toLowerCase() ?? '—' : 'не уточнён'],
    ['предпочтения', [...profile.preferences, ...profile.priorities].join(', ') || 'не указаны'],
    ['не подходит', [...slots.avoid, ...profile.dislikes].filter((a) => a && a !== 'none').join(', ').toLowerCase() || 'не указано'],
    ['смотрела', viewed.map((i) => PRODUCTS[i]?.name).filter(Boolean).join(', ') || 'пока ничего'],
    ['точка входа', chatContext.from],
  ];

  return (
    <motion.div className="handoff" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="handoff__head">
        <span className="handoff__avatar" />
        <div>
          <div className="t-card-15">Мария, консультант</div>
          <div className="t-caption-12 handoff__status">подключится в течение минуты</div>
        </div>
      </div>
      <div className="handoff__ctx t-caption-12">передаю контекст</div>
      {rows.map(([k, v]) => (
        <div key={k} className="handoff__row">
          <span className="t-caption-12">{k}</span>
          <span className="t-body-14">{v}</span>
        </div>
      ))}
    </motion.div>
  );
}

function requestLine({ slots, lastIds }: Conversation): string {
  if (slots.giftFor) return `подарок ${slots.giftFor}`;
  const bits: string[] = [];
  if (slots.needLabel) bits.push(slots.needLabel);
  if (slots.texture) bits.push(slots.texture === 'light' ? 'лёгкая текстура' : 'плотная текстура');
  if (bits.length) return bits.join(', ');
  if (lastIds.length) return `подбор в категории «${PRODUCTS[lastIds[0]]?.category.toLowerCase()}»`;
  return 'подбор ещё не начат';
}
