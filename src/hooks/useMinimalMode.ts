import { useEffect, useState } from 'react';

export type Mode = 'full' | 'minimal';

const readMode = (): Mode =>
  document.documentElement.dataset.mode === 'minimal' ? 'minimal' : 'full';

export function useMinimalMode() {
  const [mode, setMode] = useState<Mode>(readMode);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    try {
      localStorage.setItem('cv-mode', mode);
    } catch {
      // Storage can be unavailable in private contexts.
    }
  }, [mode]);

  return {
    mode,
    toggle: () => setMode(current => (current === 'full' ? 'minimal' : 'full'))
  };
}
