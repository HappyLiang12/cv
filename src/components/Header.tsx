import { useEffect, useRef, useState } from 'react';
import type { Mode } from '../hooks/useMinimalMode';

type HeaderProps = {
  mode: Mode;
  onToggle: () => void;
};

const base = import.meta.env.BASE_URL;
const sections = [
  ['experience', 'Experience'],
  ['control-tower', 'Agent Control Tower'],
  ['decomposer', 'Job Decomposer'],
  ['observability', 'Observability'],
  ['projects', 'Projects'],
  ['contact', 'Contact']
];

export function Header({ mode, onToggle }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const header = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode !== 'full') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const anchorOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
      const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const current = sections.filter(([id]) => {
        const element = document.getElementById(id);
        return element && element.getBoundingClientRect().top <= anchorOffset + 2;
      }).at(-1);
      setActive(atPageEnd ? 'contact' : current?.[0] ?? '');
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
    };
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menu.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return (
    <header ref={header} className={`top${mode === 'minimal' ? ' is-minimal' : ''}`}>
      <div className="top-inner">
        <a className="brand" href="#top" aria-label="LIANG Yee Ching (Happy) — back to top" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span className="brand-full">LIANG YEE CHING (HAPPY)</span>
          <span className="brand-short" aria-hidden="true">HAPPY LIANG</span>
        </a>
        {mode === 'full' && (
          <nav className={`nav${open ? ' is-open' : ''}`} id="section-nav" aria-label="Sections">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setOpen(false)}>{label}</a>
            ))}
          </nav>
        )}
        <div className="top-actions">
          <button
            className="mode-toggle"
            type="button"
            aria-pressed={mode === 'minimal'}
            aria-label="Minimal mode"
            title={mode === 'minimal' ? 'Show the full portfolio' : 'Switch to minimal view — less content, no 3D'}
            onClick={() => { setOpen(false); onToggle(); }}
          >
            <svg className="minimal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
              <path d="M8 9h8M8 12h8M8 15h5" />
            </svg>
            <span>Minimal</span>
          </button>
          <a className="cv-link" href={`${base}Happy-Liang-CV.html`} download title="Download CV (HTML)" aria-label="Download CV (HTML)">
            <span>CV</span>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M10 3v10m-4-4 4 4 4-4M4 14v3h12v-3" /></svg>
          </a>
          {mode === 'full' && (
            <button ref={menu} className="nav-menu" type="button" aria-label={open ? 'Close section navigation' : 'Open section navigation'} aria-expanded={open} aria-controls="section-nav" onClick={event => {
              setOpen(!open);
              if (!open && event.detail === 0) {
                requestAnimationFrame(() => header.current?.querySelector<HTMLAnchorElement>('#section-nav a')?.focus());
              }
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
