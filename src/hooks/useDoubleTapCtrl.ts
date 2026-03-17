import { useEffect, useRef } from 'react';

export const useDoubleTapCtrl = (onDoubleTap: () => void) => {
  const lastTap = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Control' || event.repeat) return;
      const now = performance.now();
      if (now - lastTap.current < 320) {
        onDoubleTap();
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDoubleTap]);
};
