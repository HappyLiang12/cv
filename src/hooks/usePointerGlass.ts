import { useEffect, type RefObject } from 'react';
import type { Mode } from './useMinimalMode';

export function usePointerGlass(rootRef: RefObject<HTMLElement | null>, mode: Mode) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active: HTMLElement | null = null;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const deactivate = () => {
      if (active) delete active.dataset.pointer;
      active = null;
    };
    const clear = () => {
      deactivate();
      pointer = null;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const update = () => {
      frame = 0;
      if (!pointer || !finePointer.matches || reduced.matches) {
        clear();
        return;
      }
      const hit = document.elementFromPoint(pointer.x, pointer.y);
      const surface = hit?.closest<HTMLElement>('.glass-surface') ?? null;
      if (!surface || !root.contains(surface) || surface.closest('.section.contact')) {
        deactivate();
        return;
      }
      if (surface !== active) {
        deactivate();
        active = surface;
        active.dataset.pointer = 'true';
      }
    };
    const schedule = () => { if (pointer && !frame) frame = requestAnimationFrame(update); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') { clear(); return; }
      if (event.buttons) return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const release = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const visibility = () => { if (document.hidden) clear(); };

    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerup', release);
    root.addEventListener('pointerleave', clear);
    root.addEventListener('pointercancel', clear);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', clear);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    finePointer.addEventListener('change', clear);
    reduced.addEventListener('change', clear);
    return () => {
      clear();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', release);
      root.removeEventListener('pointerleave', clear);
      root.removeEventListener('pointercancel', clear);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', clear);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      finePointer.removeEventListener('change', clear);
      reduced.removeEventListener('change', clear);
    };
  }, [rootRef, mode]);
}
