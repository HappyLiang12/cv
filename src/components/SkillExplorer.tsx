import { useEffect, useRef } from 'react';
import { capabilityCount, childrenById, groupCount, nodeById, pathToRoot, toolCount } from '../data/knowledgeGraph';

type SkillExplorerProps = {
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function SkillExplorer({ selected, onSelect }: SkillExplorerProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(selected);
  const node = selected ? nodeById.get(selected) : undefined;
  const children = childrenById.get(node?.id ?? 'happy') ?? [];
  const trail = node ? pathToRoot(node.id).reverse().filter(item => item.id !== 'happy') : [];
  const parent = node?.parent === 'happy' ? null : node?.parent ?? null;

  useEffect(() => {
    if (selected === previous.current) return;
    previous.current = selected;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [selected]);

  return (
    <div className={`skill-explorer${node ? '' : ' is-overview'}`}>
      <div className="skill-explorer-head">
        <span className="mono">The skill map</span>
        <span>{capabilityCount} capabilities · {toolCount} tools</span>
      </div>
      {node && (
        <div className="skill-navigation">
          <button className="skill-back" type="button" onClick={() => onSelect(parent)} aria-label="Back to parent skill">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m11 5-5 5 5 5M6 10h10" /></svg>
            Back
          </button>
          <button className="skill-home" type="button" onClick={() => onSelect(null)}>All skills</button>
        </div>
      )}
      <div className="skill-content">
        <div className="skill-view" key={node?.id ?? 'overview'}>
          {trail.length > 0 && <p className="skill-trail">{trail.map(item => item.label).join(' / ')}</p>}
          <h3 ref={heading} tabIndex={-1}>{node?.label ?? 'Explore the skills.'}</h3>
          <p className="skill-description">{node?.description ?? `${groupCount} skill groups. Select a capability to explore its tools.`}</p>
          {node?.meta && <p className="skill-meta mono">{node.meta}</p>}
          {children.length > 0 && (
            <div className={`skill-children${node?.kind === 'group' ? ' is-tools' : ''}`}>
              {children.map((child, index) => (
                <button key={child.id} type="button" data-node-id={child.id} onClick={() => onSelect(child.id)}>
                  {!node && <span className={`skill-symbol symbol-${index}`} aria-hidden="true"><i /><i /><i /></span>}
                  <span className="skill-child-copy"><span>{child.label}</span>{child.kind !== 'tool' && <small>{child.meta}</small>}</span>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m7 5 5 5-5 5" /></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
