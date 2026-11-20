import { Contact } from '../components/Contact';
import { ControlTower } from '../components/ControlTower';
import { Decomposer } from '../components/Decomposer';
import { Experience } from '../components/Experience';
import { Hero } from '../components/Hero';
import { Observability } from '../components/Observability';
import { Projects } from '../components/Projects';

const sections = [
  ['experience', 'Experience'],
  ['control-tower', 'Agent Control Tower'],
  ['decomposer', 'Job Decomposer'],
  ['observability', 'Observability'],
  ['projects', 'Projects'],
  ['contact', 'Contact']
];

export function StaticCv() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="top-inner">
          <a className="brand" href="#top" aria-label="LIANG Yee Ching (Happy) — back to top">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
            <span className="brand-full">LIANG YEE CHING (HAPPY)</span>
            <span className="brand-short" aria-hidden="true">HAPPY LIANG</span>
          </a>
          <nav className="nav" id="section-nav" aria-label="Sections">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`}>{label}</a>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Hero staticSkills />
        <Experience />
        <ControlTower />
        <Decomposer />
        <Observability />
        <Projects />
        <Contact />
      </main>
    </>
  );
}
