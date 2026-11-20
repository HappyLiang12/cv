import { capabilityCount, childrenById, groupCount, toolCount } from '../data/knowledgeGraph';

const capabilities = childrenById.get('happy') ?? [];

const Chevron = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <path d="m7 5 5 5-5 5" />
  </svg>
);

// The downloaded snapshot runs no JavaScript, so the hero skill card uses native
// <details>/<summary> disclosure: every capability, group and tool stays readable and
// expands in the same card the live explorer occupies.
export function StaticSkills() {
  return (
    <div className="skill-explorer is-overview static-skills">
      <div className="skill-explorer-head">
        <span className="mono">The skill map</span>
        <span>{capabilityCount} capabilities · {toolCount} tools</span>
      </div>
      <div className="skill-content">
        <h3>Explore the skills.</h3>
        <p className="skill-description">{groupCount} skill groups. Open a capability to explore its groups and tools.</p>
        <div className="skill-children static-skill-list">
          {capabilities.map((capability, index) => (
            <details className="static-skill-item" key={capability.id}>
              <summary>
                <span className={`skill-symbol symbol-${index}`} aria-hidden="true"><i /><i /><i /></span>
                <span className="skill-child-copy">
                  <span>{capability.label}</span>
                  {capability.meta && <small>{capability.meta}</small>}
                </span>
                <Chevron />
              </summary>
              <div className="static-skill-body">
                {capability.description && <p>{capability.description}</p>}
                {(childrenById.get(capability.id) ?? []).map(child =>
                  child.kind === 'group' ? (
                    <details className="static-skill-group" key={child.id}>
                      <summary>
                        <span className="skill-child-copy">
                          <span>{child.label}</span>
                          {child.meta && <small>{child.meta}</small>}
                        </span>
                        <Chevron />
                      </summary>
                      <div className="static-skill-body">
                        {child.description && <p>{child.description}</p>}
                        <ul className="static-tools">
                          {(childrenById.get(child.id) ?? []).map(tool => (
                            <li key={tool.id}>
                              <span className="static-tool-label">{tool.label}</span>
                              {tool.description && <> — {tool.description}</>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ) : (
                    <p className="static-skill-leaf" key={child.id}>
                      <span className="static-skill-leaf-label">{child.label}</span>
                      {child.meta && <span className="static-skill-leaf-meta mono">{child.meta}</span>}
                      {child.description && <> — {child.description}</>}
                    </p>
                  )
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
