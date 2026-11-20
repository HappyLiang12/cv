import { capabilityCount, childrenById, groupCount, toolCount } from '../data/knowledgeGraph';

const capabilities = childrenById.get('happy') ?? [];

// The downloaded snapshot runs no JavaScript, so the hero shows the same shell as the
// interactive explorer without buttons: five capability rows and their group counts.
export function StaticSkillOverview() {
  return (
    <div className="skill-explorer is-overview static-skills">
      <div className="skill-explorer-head">
        <span className="mono">The skill map</span>
        <span>{capabilityCount} capabilities · {toolCount} tools</span>
      </div>
      <div className="skill-content">
        <h3>Explore the skills.</h3>
        <p className="skill-description">{groupCount} skill groups. The skill map section below lists every group and tool in full.</p>
        <div className="skill-children static-skill-rows">
          {capabilities.map((capability, index) => (
            <div className="static-skill-row" key={capability.id}>
              <span className={`skill-symbol symbol-${index}`} aria-hidden="true"><i /><i /><i /></span>
              <span className="skill-child-copy">
                <span>{capability.label}</span>
                {capability.meta && <small>{capability.meta}</small>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Every capability, group and tool with its own description, as plain readable text.
export function StaticSkillDetails() {
  return (
    <div className="static-skill-details">
      <p className="static-skill-intro">
        {capabilityCount} capabilities, {groupCount} skill groups and {toolCount} tools, each with its own description.
      </p>
      {capabilities.map(capability => (
        <div className="static-capability" key={capability.id}>
          <h3>{capability.label}</h3>
          {capability.description && <p className="static-capability-description">{capability.description}</p>}
          {(childrenById.get(capability.id) ?? []).map(child => (
            child.kind === 'group' ? (
              <div className="static-group" key={child.id}>
                <h4>
                  {child.label}
                  {child.meta && <span className="static-group-meta mono">{child.meta}</span>}
                </h4>
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
            ) : (
              <p className="static-leaf" key={child.id}>
                <span className="static-leaf-label">{child.label}</span>
                {child.meta && <span className="static-leaf-meta mono">{child.meta}</span>}
                {child.description && <> — {child.description}</>}
              </p>
            )
          ))}
        </div>
      ))}
    </div>
  );
}
