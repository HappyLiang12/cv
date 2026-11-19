import { useCallback, useEffect, useRef, useState } from 'react';

export function useHoverIntent(delay = 120, clearDelay = 90) {
  const [hovered, setHovered] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const onHover = useCallback(
    (id: string | null) => {
      if (pending.current === id) return;
      pending.current = id;
      cancel();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setHovered(pending.current);
      }, id === null ? clearDelay : delay);
    },
    [cancel, clearDelay, delay]
  );

  // Selection/reset is deliberate; unlike a mesh/label seam it needs no grace period.
  const clearHover = useCallback(() => {
    cancel();
    pending.current = null;
    setHovered(null);
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return { hovered, onHover, clearHover };
}
