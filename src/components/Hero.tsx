import { lazy, Suspense, useRef, useState } from 'react';
import cv from '../data/cv.json';
import { useInView } from '../hooks/useInView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePageVisible } from '../hooks/usePageVisible';
import { GraphInspector } from './GraphInspector';
import { SceneBoundary } from './SceneBoundary';
import { StaticMap } from './StaticMap';

const KnowledgeGraphScene = lazy(() => import('../scene/KnowledgeGraphScene'));
const base = import.meta.env.BASE_URL;

export function Hero() {
  const sceneRef = useRef<HTMLElement | null>(null);
  const desktop = useMediaQuery('(min-width: 981px)');
  const wide = useMediaQuery('(min-width: 1200px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pageVisible = usePageVisible();
  const sceneInView = useInView(sceneRef, '160px');

  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);

  const showScene = desktop;
  const useR3F = showScene && !reduced;

  const selectNode = (id: string | null) => {
    if (!id) {
      setSelected(null);
      return;
    }
    setSelected(current => (current === id ? null : id));
  };

  return (
    <section className="hero" id="top" aria-label="Introduction">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="kicker mono rise">
              Platform &amp; observability engineer — Hong Kong
            </p>
            <h1 className="rise" style={{ animationDelay: '0.05s' }}>
              Control planes <br />for agent fleets.
            </h1>
            <p className="lede rise" style={{ animationDelay: '0.1s' }}>
              {cv.summary}
            </p>
            <p className="avail rise" style={{ animationDelay: '0.16s' }}>
              {cv.availabilityNote}
            </p>
            <div className="actions rise" style={{ animationDelay: '0.22s' }}>
              <a className="text-link primary" href="#experience">
                Read the CV<span className="arrow" aria-hidden="true">→</span>
              </a>
              <a className="text-link" href={`${base}Happy-Liang-CV.pdf`}>
                Download PDF
              </a>
            </div>
          </div>

          {showScene && (
            <figure
              className="hero-scene"
              ref={sceneRef}
              aria-label="Technical skill graph: tools, skill groups and capabilities converging on Happy"
            >
              <div className="scene-frame">
                <div className="scene-meta mono">
                  <span>Fig. 01 — Skill graph</span>
                  <span>Tools → groups → capabilities</span>
                </div>
                <div className="scene-canvas">
                  {useR3F ? (
                    <SceneBoundary
                      fallback={<StaticMap variant="desktop" />}
                      onError={() => setSceneFailed(true)}
                    >
                      <Suspense fallback={<StaticMap variant="desktop" />}>
                        <KnowledgeGraphScene
                          paused={!pageVisible || !sceneInView}
                          selected={selected}
                          hovered={hovered}
                          wide={wide}
                          onHover={setHovered}
                          onSelect={selectNode}
                        />
                      </Suspense>
                    </SceneBoundary>
                  ) : (
                    <StaticMap variant="desktop" />
                  )}
                </div>
                {useR3F && !sceneFailed && (
                  <GraphInspector selected={selected} hovered={hovered} />
                )}
                <figcaption className="scene-foot mono">
                  <span className="scene-legend">
                    <span className="legend-item">
                      <span className="legend-dot live" aria-hidden="true" />
                      Control Tower ↔ Testing &amp; harness · aria-conductor (OSS)
                    </span>
                  </span>
                  <span>
                    {useR3F && !sceneFailed
                      ? 'Mouse only — not live data'
                      : 'Static fallback — not live data'}
                  </span>
                </figcaption>
              </div>
            </figure>
          )}
        </div>

        {!desktop && (
          <figure className="mobile-scene" aria-label="Technical skill graph: tools, skill groups and capabilities converging on Happy">
            <StaticMap variant="mobile" />
            <figcaption className="mono">Technical skill map · simplified</figcaption>
          </figure>
        )}

        <dl className="stats">
          {cv.metrics.map(metric => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>
                {metric.value}
                <small>{metric.note}</small>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
