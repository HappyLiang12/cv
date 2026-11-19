import type { Mode } from '../hooks/useMinimalMode';

type HeaderProps = {
  mode: Mode;
  onToggle: () => void;
};

const base = import.meta.env.BASE_URL;

export function Header({ mode, onToggle }: HeaderProps) {
  return (
    <header className={`top${mode === 'minimal' ? ' is-minimal' : ''}`}>
      <div className="top-inner">
        <a className="brand" href="#top" aria-label="LIANG Yee Ching (Happy) — back to top">
          <span className="brand-full">LIANG YEE CHING (HAPPY)</span>
          <span className="brand-short" aria-hidden="true">LIANG YEE CHING</span>
        </a>
        {mode === 'full' && (
          <nav className="nav" aria-label="Sections">
            <a href="#experience">Experience</a>
            <a href="#control-tower">Agent Control Tower</a>
            <a href="#observability">Observability</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </nav>
        )}
        <div className="top-actions">
          <button
            className="mode-toggle"
            type="button"
            aria-pressed={mode === 'minimal'}
            aria-label="Minimal mode"
            title={mode === 'minimal' ? 'Show the full portfolio' : 'Switch to minimal view — less content, no 3D'}
            onClick={onToggle}
          >
            <span className="switch" aria-hidden="true" />
            <span>Minimal</span>
          </button>
          <a
            className="cv-link"
            href={`${base}Happy-Liang-CV.html`}
            download
            title="Download CV (HTML)"
            aria-label="Download CV (HTML)"
          >
            CV
          </a>
        </div>
      </div>
    </header>
  );
}
