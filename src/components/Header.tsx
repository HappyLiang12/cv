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
        <a className="brand" href="#top" aria-label="Happy Liang Yee Ching — back to top">
          <span className="brand-full">HAPPY LIANG YEE CHING</span>
          <span className="brand-short" aria-hidden="true">HAPPY LIANG</span>
        </a>
        {mode === 'full' && (
          <nav className="nav" aria-label="Sections">
            <a href="#experience">Experience</a>
            <a href="#control-tower">Systems</a>
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
          <a className="cv-link" href={`${base}cv/`}>CV</a>
        </div>
      </div>
    </header>
  );
}
