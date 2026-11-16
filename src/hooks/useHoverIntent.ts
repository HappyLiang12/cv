import { useCallback, useEffect, useRef, useState } from 'react';

export function useHoverIntent(delay = 90) {
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
      pending.current = id;
      cancel();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setHovered(pending.current);
      }, delay);
    },
    [cancel, delay]
  );

  useEffect(() => cancel, [cancel]);

  return { hovered, onHover };
}
