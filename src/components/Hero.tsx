import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import cv from '../data/cv.json';
import { groupCount, toolCount } from '../data/knowledgeGraph';
import { useHoverIntent } from '../hooks/useHoverIntent';
import { useInView } from '../hooks/useInView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePageVisible } from '../hooks/usePageVisible';
import { StaticSkillOverview } from '../static/StaticSkills';
import { GraphInspector } from './GraphInspector';
import { SceneBoundary } from './SceneBoundary';
import { SkillExplorer } from './SkillExplorer';
import { StaticMap } from './StaticMap';

const KnowledgeGraphScene = lazy(() => import('../scene/KnowledgeGraphScene'));
const base = import.meta.env.BASE_URL;

type HeroProps = {
  staticSkills?: boolean;
};

export function Hero({ staticSkills = false }: HeroProps) {
  const sceneRef = useRef<HTMLElement | null>(null);
  const desktop = useMediaQuery('(min-width: 981px)');
  const wide = useMediaQuery('(min-width: 1200px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const touch = useMediaQuery('(pointer: coarse)');
  const pageVisible = usePageVisible();
  const sceneInView = useInView(sceneRef, '160px');
  const [selected, setSelected] = useState<string | null>(null);
  const { hovered, onHover, clearHover } = useHoverIntent();
  const [sceneFailed, setSceneFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const useR3F = desktop && !reduced && !touch && !sceneFailed;

  useEffect(() => { clearHover(); }, [useR3F, clearHover]);

  const selectNode = (id: string | null) => {
    clearHover();
    if (id === null) setResetKey(current => current + 1);
    setSelected(current => current === id ? null : id);
  };

  return (
    <section className="hero" id="top" aria-label="Introduction">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy glass-surface">
            <p className="kicker mono rise">{cv.name} <span className="kicker-divider">/</span> Hong Kong</p>
            <h1 className="rise" style={{ animationDelay: '0.06s' }}>
              AI Platform &amp;{' '}<br /><span className="hero-emphasis">Agent Systems<br className="hero-line-break" /> Engineer</span>
            </h1>
            <p className="lede rise" style={{ animationDelay: '0.12s' }}>{cv.summary}</p>
            {cv.availabilityNote && <p className="avail rise" style={{ animationDelay: '0.16s' }}>{cv.availabilityNote}</p>}
            <div className="actions rise" style={{ animationDelay: '0.2s' }}>
              <a className="text-link primary" href="#experience">Read the CV<span className="arrow" aria-hidden="true">↘</span></a>
              <a className="text-link" href={`${base}Happy-Liang-CV.pdf`} download>Download PDF<span className="arrow" aria-hidden="true">↓</span></a>
            </div>
          </div>
          <figure className={`hero-scene${useR3F ? '' : ' is-explorer'}`} ref={sceneRef} aria-label="Technical skill map">
            {staticSkills ? (
              <StaticSkillOverview />
            ) : useR3F ? (
              <div className="scene-frame" onPointerLeave={() => { onHover(null); document.body.style.cursor = ''; }}>
                <div className="scene-heading"><span className="mono">The skill map</span><span>{groupCount} groups <span className="scene-heading-dot">·</span> {toolCount} tools</span></div>
                <div className="scene-canvas">
                  <SceneBoundary fallback={<StaticMap variant="desktop" />} onError={() => setSceneFailed(true)}>
                    <Suspense fallback={<StaticMap variant="desktop" />}>
                      <KnowledgeGraphScene paused={!pageVisible || !sceneInView} selected={selected} hovered={hovered} wide={wide} resetKey={resetKey} onHover={onHover} onSelect={selectNode} />
                    </Suspense>
                  </SceneBoundary>
                </div>
                <GraphInspector selected={selected} hovered={hovered} onSelect={selectNode} />
                <figcaption className="scene-foot"><span className="scene-legend"><span className="legend-dot live" aria-hidden="true" />Tools → skills → capabilities</span><span>Drag to rotate · select to explore</span></figcaption>
              </div>
            ) : <SkillExplorer selected={selected} onSelect={setSelected} />}
          </figure>
        </div>
        <dl className="stats">
          {cv.metrics.map(metric => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}<small>{metric.note}</small></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
