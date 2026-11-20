import { useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react';
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
  onSelect: (id: string | null) => void;
};

export function GraphInspector({ selected, hovered, onSelect }: GraphInspectorProps) {
  const active = hovered ?? selected;
  const node = active ? nodeById.get(active) : undefined;
  const parent = node?.parent ? nodeById.get(node.parent) : undefined;
  const path = node ? [...pathToRoot(node.id)].reverse() : [];
  const pinned = selected ? nodeById.get(selected) : undefined;
  const preview = Boolean(hovered && hovered !== selected);
  const mode = preview ? 'preview' : pinned ? 'pinned' : 'overview';
  // Hover previews must not replace the pinned navigation targets.
  const children = pinned
    ? childrenById.get(pinned.id) ?? []
    : (childrenById.get('happy') ?? []).filter(child => child.kind === 'capability');
  const navigationPath = pinned ? [...pathToRoot(pinned.id)].reverse() : [];
  const listLabel = !pinned
    ? 'Capabilities'
    : pinned.kind === 'capability'
      ? 'Skill groups'
      : pinned.kind === 'group'
        ? 'Tools'
        : pinned.kind === 'background'
          ? 'Experience & education'
          : 'Branches';
  const description = node
    ? node.description ?? parent?.description ?? node.meta
    : `${capabilityCount} capabilities, ${groupCount} skill groups and ${toolCount} tools.`;
  const related = node?.id === 'control-tower' || node?.id === 'testing-harness';
  const detail = useRef<HTMLDivElement>(null);
  const keyboardSelection = useRef(false);
  const selectNode = (id: string | null, event: MouseEvent<HTMLButtonElement>) => {
    keyboardSelection.current = event.detail === 0 && id !== selected;
    onSelect(id);
  };

  useEffect(() => { if (detail.current) detail.current.scrollTop = 0; }, [active]);
  useLayoutEffect(() => {
    if (keyboardSelection.current) {
      keyboardSelection.current = false;
      detail.current?.focus({ preventScroll: true });
    }
  }, [selected]);

  return (
    <div
      className={`graph-inspector is-${mode}`}
      role="region"
      aria-label="Technical skill graph details"
      data-mode={mode}
      data-active-id={active ?? ''}
      data-selected-id={selected ?? ''}
    >
      <div className="gi-layer gi-layer-current">
        <div ref={detail} id="graph-detail" className="gi-main" role="region" aria-labelledby="graph-detail-title" tabIndex={0}>
          <span className="mono gi-kind">
            {node ? kindLabel[node.kind] : 'Overview'}
            {node?.meta ? ` · ${node.meta}` : ''}
          </span>
          {(preview || pinned) && <span className="gi-state mono">{preview ? 'Preview · select to pin' : 'Pinned'}</span>}
          <h2 id="graph-detail-title">{node?.label ?? 'Skill graph'}</h2>
          {preview && path.length > 0 && (
            <p className="gi-preview-path mono">{path.map(item => item.label).join(' / ')}</p>
          )}
          <p className="gi-desc">{description}</p>
          {related && (
            <p className="gi-related mono">
              Agent Control Tower ↔ Testing &amp; harness · aria-conductor is the open-source link
            </p>
          )}
        </div>

        <div className="gi-side">
          <nav className="gi-path mono" aria-label="Pinned skill path">
            <button type="button" className="gi-node-button gi-reset" data-graph-reset onClick={event => selectNode(null, event)}>
              Reset graph
            </button>
            {navigationPath.map((item, index) => (
              <span key={item.id}>
                <span aria-hidden="true"> / </span>
                {index === navigationPath.length - 1 ? (
                  <span aria-current="page">{item.label}</span>
                ) : (
                  <button type="button" className="gi-node-button" data-node-id={item.id} onClick={event => selectNode(item.id, event)}>
                    {item.label}
                  </button>
                )}
              </span>
            ))}
          </nav>
          {pinned && (
            <button
              type="button"
              className="gi-node-button gi-back"
              data-graph-back
              onClick={event => selectNode(pinned.parent ?? null, event)}
            >
              Back to {pinned.parent ? nodeById.get(pinned.parent)?.label : 'overview'}
            </button>
          )}
          {children.length > 0 && (
            <div className="gi-list">
              <span className="mono">{listLabel}</span>
              <ul className="gi-list-items">
                {children.map(child => (
                  <li key={child.id}>
                    <button type="button" className="gi-node-button" data-node-id={child.id} onClick={event => selectNode(child.id, event)}>
                      {child.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className="gi-hint mono">
            Hover to preview · select text or a node to pin · drag to rotate
          </span>
        </div>
      </div>
    </div>
  );
}
