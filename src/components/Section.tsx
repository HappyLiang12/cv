import { useEffect, useRef, type ReactNode } from 'react';

type SectionProps = {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, label, title, children, className = '' }: SectionProps) {
  const titleId = `${id}-title`;
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    let frame = 0;
    let lastPosition = '';
    const updateFocus = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const readingLine = window.innerHeight * .42;
      const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const focused = atPageEnd
        ? element.nextElementSibling === null
        : bounds.top <= readingLine && bounds.bottom > readingLine;
      const state = String(focused);
      if (element.dataset.focused !== state) element.dataset.focused = state;
      if (focused) {
        const progress = Math.max(0, Math.min(1, (readingLine - bounds.top) / bounds.height));
        const position = `${(20 + progress * 60).toFixed(1)}%`;
        if (position !== lastPosition) {
          lastPosition = position;
          element.style.setProperty('--glass-position', position);
        }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(updateFocus); };
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.reveal = entry.isIntersecting ? 'in' : 'out';
      schedule();
    }, { rootMargin: '0px 0px -48px 0px' });
    observer.observe(element);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    updateFocus();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <section ref={section} className={`section ${className}`} id={id} aria-labelledby={titleId}>
      <div className="wrap glass-surface">
        <div className="sec-meta mono">
          <span className="sec-label">{label}</span>
        </div>
        <h2 className="sec-title" id={titleId}>{title}</h2>
        <div className="sec-body">{children}</div>
      </div>
    </section>
  );
}
