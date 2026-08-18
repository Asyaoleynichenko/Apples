import { useEffect } from 'react';

/** Click-drag (and touch) pans any `.hscroll` row, including those nested in a vertical scroller. */
export function useHScrollDrag() {
  useEffect(() => {
    const root = document.querySelector('.device');
    if (!(root instanceof HTMLElement)) return;

    let row: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let axis: 'x' | 'y' | null = null;
    let dragged = false;

    const onDown = (e: PointerEvent) => {
      const hit = (e.target as HTMLElement | null)?.closest('.hscroll');
      if (!(hit instanceof HTMLElement) || !root.contains(hit)) return;
      if (hit.scrollWidth <= hit.clientWidth + 1) return;
      row = hit;
      startX = e.clientX;
      startY = e.clientY;
      startScroll = hit.scrollLeft;
      axis = null;
      dragged = false;
    };

    const onMove = (e: PointerEvent) => {
      if (!row) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      if (axis !== 'x') return;
      dragged = true;
      row.scrollLeft = startScroll - dx;
      e.preventDefault();
    };

    const onUp = () => {
      if (dragged) {
        const block = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        };
        root.addEventListener('click', block, { capture: true, once: true });
      }
      row = null;
      axis = null;
      dragged = false;
    };

    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);
}
