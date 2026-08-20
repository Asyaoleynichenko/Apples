import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { SendArrow } from './Icons';
import { LOADING_BEATS, LOADING_BEAT_MS } from '../lib/loading';
import type { QuickReply } from '../lib/types';
import { asset } from '../lib/asset';
import { chatCopy } from '../lib/copy';

export function Avatar({ size = 44 }: { size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <img src={asset('mascot-avatar.png')} alt="" />
    </div>
  );
}

/** Tail hanging under the bubble's square corner, 37×10 as in the design. */
function Tail({ side, fill }: { side: 'left' | 'right'; fill: string }) {
  return (
    <svg className={`tail tail--${side}`} width="37" height="10" viewBox="0 0 37 10" fill="none">
      <path
        d={side === 'left' ? 'M0 0H37C21 2 10 5.5 0 10Z' : 'M37 0H0C16 2 27 5.5 37 10Z'}
        fill={fill}
      />
    </svg>
  );
}

const rise = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const },
};

export function UserBubble({ text }: { text: string }) {
  return (
    <motion.div className="row row--user" {...rise}>
      <div className="bubble-wrap">
        <div className="bubble bubble--user t-bubble-15">{chatCopy(text)}</div>
        <Tail side="right" fill="#8D01FF" />
      </div>
    </motion.div>
  );
}

export function AiBubble({
  children,
  text,
  onLink,
  linkLabel,
}: {
  children?: ReactNode;
  text?: string;
  onLink?: () => void;
  linkLabel?: string;
}) {
  return (
    <motion.div className="row row--ai" {...rise}>
      <Avatar />
      <div className="bubble-wrap">
        <div className="bubble bubble--ai t-bubble-15">
          {text !== undefined
            ? withInlineLink(chatCopy(text), linkLabel, onLink)
            : typeof children === 'string'
              ? chatCopy(children)
              : children}
        </div>
        <Tail side="left" fill="#EDEDED" />
      </div>
    </motion.div>
  );
}

/** Keeps the link where the copy puts it, so trailing punctuation stays put. */
function withInlineLink(text: string, label?: string, onLink?: () => void) {
  if (!label || !text.includes(label)) return text;
  const [before, ...rest] = text.split(label);
  return (
    <>
      {before}
      <button className="bubble__link" onClick={onLink}>
        {label}
      </button>
      {rest.join(label)}
    </>
  );
}

export function TypingBubble() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= LOADING_BEATS.length - 1) return;
    const timer = window.setTimeout(() => setI((n) => n + 1), LOADING_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [i]);

  return (
    <motion.div className="row row--ai" {...rise}>
      <Avatar />
      <div className="bubble-wrap">
        <div className="bubble bubble--ai bubble--loading t-bubble-15">
          <AnimatePresence initial={false}>
            <motion.span
              key={LOADING_BEATS[i]}
              className="bubble__beat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {LOADING_BEATS[i]}
            </motion.span>
          </AnimatePresence>
        </div>
        <Tail side="left" fill="#EDEDED" />
      </div>
    </motion.div>
  );
}

export function Pill({
  label,
  onClick,
  selected = false,
}: {
  label: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <button className={`pill t-label-14 press${selected ? ' pill--on' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

/** "быстрые ответы" — title plus a horizontally scrolling pill carousel. */
export function QuickReplies({
  title = 'быстрые ответы',
  replies,
  onPick,
}: {
  title?: string;
  replies: QuickReply[];
  onPick: (r: QuickReply) => void;
}) {
  if (!replies.length) return null;
  return (
    <motion.div
      className="quick"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="quick__title t-title-17">{title}</div>
      <div className="quick__row hscroll">
        {replies.map((r) => (
          <Pill key={r.label} label={r.label} onClick={() => onPick(r)} />
        ))}
      </div>
    </motion.div>
  );
}

export function SendButton({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="send fill-send press" onClick={onClick} disabled={disabled} aria-label="Отправить">
      <span className="send__gloss" />
      <SendArrow />
    </button>
  );
}

/** Input + disclaimer. Bottom inset lives on `.bottom-container`. */
export function ChatInput({
  onSend,
  onActivate,
  placeholder = 'спроси что‑нибудь',
}: {
  onSend: (text: string) => void;
  /** Used by the entry-point sheet, where any tap should open the assistant. */
  onActivate?: () => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const submit = () => {
    const v = value.trim();
    if (!v) {
      onActivate?.();
      return;
    }
    setValue('');
    onSend(v);
  };
  return (
    <>
      <div className="input-wrap">
        <input
          className="input-wrap__field t-body-16"
          value={value}
          placeholder={placeholder}
          onFocus={() => onActivate?.()}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <SendButton onClick={submit} />
      </div>
      <div className="disclaimer t-caption-12">
        используем AI для ответов — <span>расскажите как вам</span>
      </div>
    </>
  );
}
