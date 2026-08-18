import { motion } from 'framer-motion';

const ROWS = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
];

/** iOS Russian keyboard, shown while a text field has focus. */
export function IosKeyboard({
  onKey,
  onBackspace,
  onSubmit,
  submitLabel = 'Найти',
}: {
  onKey: (ch: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  return (
    <motion.div
      className="kb"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 460, damping: 42 }}
    >
      {ROWS.map((row, i) => (
        <div className={`kb__row kb__row--${i}`} key={i}>
          {i === 2 && (
            <button className="kb__key kb__key--mod" onClick={() => undefined}>
              ⇧
            </button>
          )}
          {row.map((ch) => (
            <button key={ch} className="kb__key" onClick={() => onKey(ch)}>
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button className="kb__key kb__key--mod" onClick={onBackspace}>
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="kb__row kb__row--3">
        <button className="kb__key kb__key--mod kb__key--num">123</button>
        <button className="kb__key kb__key--mod">☺</button>
        <button className="kb__key kb__key--space" onClick={() => onKey(' ')}>
          Пробел
        </button>
        <button className="kb__key kb__key--go" onClick={onSubmit}>
          {submitLabel}
        </button>
      </div>
    </motion.div>
  );
}
