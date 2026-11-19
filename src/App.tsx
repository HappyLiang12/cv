import { useMinimalMode } from './hooks/useMinimalMode';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MinimalView } from './components/MinimalView';
import { Experience } from './components/Experience';
import { ControlTower } from './components/ControlTower';
import { Decomposer } from './components/Decomposer';
import { Observability } from './components/Observability';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';

export default function App() {
  const { mode, toggle } = useMinimalMode();

  const handleToggle = () => {
    toggle();
    window.scrollTo(0, 0);
  };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header mode={mode} onToggle={handleToggle} />
      <main id="main" tabIndex={-1}>
        {mode === 'minimal' ? (
          <MinimalView />
        ) : (
          <>
            <Hero />
            <Experience />
            <ControlTower />
            <Decomposer />
            <Observability />
            <Projects />
            <Contact />
          </>
        )}
      </main>
    </>
  );
}
