import { useEffect, useState } from 'react';

const LIVE_QUERY = '(hover: none) and (pointer: coarse), (max-width: 768px)';

export function isLiveShell() {
  return typeof window !== 'undefined' && window.matchMedia(LIVE_QUERY).matches;
}

function applyViewport() {
  const root = document.documentElement;
  const live = isLiveShell();
  root.dataset.shell = live ? 'live' : 'frame';

  if (!live) {
    root.style.removeProperty('--app-h');
    root.style.removeProperty('--app-oy');
    return;
  }

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  root.style.setProperty('--app-h', `${Math.round(height)}px`);
  root.style.setProperty('--app-oy', `${Math.round(offsetTop)}px`);
}

/** Phone / tablet browser: full-bleed site. Desktop: framed 375×812 device. */
export function useLiveShell() {
  const [live, setLive] = useState(() => isLiveShell());

  useEffect(() => {
    const mq = window.matchMedia(LIVE_QUERY);
    const apply = () => {
      applyViewport();
      setLive(isLiveShell());
    };

    apply();
    mq.addEventListener('change', apply);
    window.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);
    return () => {
      mq.removeEventListener('change', apply);
      window.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
    };
  }, []);

  return live;
}
