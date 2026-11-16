import { useEffect, useState } from 'react';
import {
  capabilityCount,
  childrenById,
  groupCount,
  nodeById,
  pathToRoot,
  toolCount
} from '../data/knowledgeGraph';

const kindLabel: Record<string, string> = {
  self: 'Overview',
  capability: 'Capability',
  group: 'Skill group',
  tool: 'Tool',
  background: 'Background',
  role: 'Experience',
  education: 'Education'
};

type GraphInspectorProps = {
  selected: string | null;
  hovered: string | null;
};

function InspectorContent({
  active,
  phase
}: {
  active: string | null;
  phase: 'current' | 'outgoing';
}) {
  const node = active ? nodeById.get(active) : undefined;
  const parent = node?.parent ? nodeById.get(node.parent) : undefined;
  const path = node ? pathToRoot(node.id) : [];
  const trail = [...path].reverse().map(item => item.label);
  const children = node ? childrenById.get(node.id) ?? [] : [];
  const related = node?.id === 'control-tower' || node?.id === 'testing-harness';

  const listLabel =
    node?.kind === 'capability'
      ? 'Skill groups'
      : node?.kind === 'group'
        ? 'Tools'
        : node?.kind === 'background'
          ? 'Experience & education'
          : node?.kind === 'self'
            ? 'Branches'
            : null;

  const description = node
    ? node.description ?? parent?.description ?? node.meta
    : `${capabilityCount} capabilities, ${groupCount} skill groups and ${toolCount} tools.`;
  const meta = node?.meta;

  return (
    <div
      className={`gi-layer gi-layer-${phase}`}
      aria-hidden={phase === 'outgoing' ? 'true' : undefined}
    >
      <div className="gi-main">
        <span className="mono gi-kind">
          {node ? kindLabel[node.kind] : 'Technical skill graph'}
          {meta ? ` · ${meta}` : ''}
        </span>
        <h2>{node?.label ?? 'A graph of my knowledge'}</h2>
        {trail.length > 0 && (
          <p className="mono gi-path">{trail.join(' / ')}</p>
        )}
        <p className="gi-desc">{description}</p>
      </div>

      <div className="gi-side">
        {listLabel && children.length > 0 && (
          <p className="gi-list">
            <span className="mono">{listLabel}</span>
            <span className="gi-list-items">
              {children.map(child => child.label).join(' · ')}
            </span>
          </p>
        )}
        {related && (
          <p className="gi-related mono">
            Agent Control Tower ↔ Testing &amp; harness · aria-conductor is the open-source link
          </p>
        )}
        {meta && (!listLabel || children.length === 0) && (
          <span className="gi-meta mono">{meta}</span>
        )}
        <span className="gi-hint mono">
          {node
            ? 'Hover to trace · click to pin · click again to release'
            : 'Hover to trace · click a capability or skill group to unfold · drag to rotate · scroll to zoom'}
        </span>
      </div>
    </div>
  );
}

export function GraphInspector({ selected, hovered }: GraphInspectorProps) {
  const active = hovered ?? selected;
  const [displayed, setDisplayed] = useState<string | null>(active);
  const [outgoing, setOutgoing] = useState<{ id: string | null; key: number } | null>(null);
  const [entrance, setEntrance] = useState(0);

  useEffect(() => {
    if (active === displayed) return;
    setOutgoing({ id: displayed, key: entrance });
    setDisplayed(active);
    setEntrance(value => value + 1);
  }, [active, displayed, entrance]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(() => setOutgoing(null), 120);
    return () => window.clearTimeout(timer);
  }, [outgoing]);

  return (
    <div
      className="graph-inspector"
      role="region"
      aria-label="Technical skill graph details"
    >
      <InspectorContent key={`current-${entrance}`} active={displayed} phase="current" />
      {outgoing && (
        <InspectorContent key={`outgoing-${outgoing.key}`} active={outgoing.id} phase="outgoing" />
      )}
    </div>
  );
}
