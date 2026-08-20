import { Close } from './Icons';
import { noOrphan } from '../lib/copy';
import type { ReactNode } from 'react';

/** iPhone X status bar, 44px, exactly as drawn in the Figma component. */
export function StatusBar({ dark = false }: { dark?: boolean }) {
  const fg = dark ? '#fff' : '#000';
  return (
    <div className="statusbar">
      <div className="statusbar__time" style={{ color: fg }}>
        9:41
      </div>
      <div className="statusbar__icons">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="1" fill={fg} />
          <rect x="4.7" y="5" width="3" height="7" rx="1" fill={fg} />
          <rect x="9.4" y="2.5" width="3" height="9.5" rx="1" fill={fg} />
          <rect x="14" y="0" width="3" height="12" rx="1" fill={fg} />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 10.6 5.9 8.4a3 3 0 0 1 4.2 0L8 10.6ZM3.6 6.1a6.3 6.3 0 0 1 8.8 0l-1.4 1.4a4.3 4.3 0 0 0-6 0L3.6 6.1ZM1.2 3.6a9.7 9.7 0 0 1 13.6 0l-1.4 1.4a7.7 7.7 0 0 0-10.8 0L1.2 3.6Z"
            fill={fg}
          />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.7" stroke={fg} strokeOpacity="0.35" />
          <rect x="2" y="2" width="18" height="8" rx="1.4" fill={fg} />
          <path d="M23 4v4a2 2 0 0 0 0-4Z" fill={fg} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

/** Safe-area spacer under the screen. The pill is hidden; the 34px inset stays so bars are not clipped by the iPhone radius. */
export function HomeIndicator() {
  return <div className="home-indicator" aria-hidden />;
}

/** Chat header: 56px, optional centred mascot or title, close at the right. */
export function ChatHeader({
  title,
  center,
  onClose,
  transparent = false,
}: {
  title?: string;
  center?: ReactNode;
  onClose?: () => void;
  transparent?: boolean;
}) {
  return (
    <div className="chat-header" style={transparent ? { background: 'transparent' } : undefined}>
      {center}
      {!center && title && <div className="chat-header__title t-title-17">{noOrphan(title)}</div>}
      <button className="chat-header__close press" onClick={onClose} aria-label="Закрыть">
        {onClose && <Close color="#000" />}
      </button>
    </div>
  );
}
