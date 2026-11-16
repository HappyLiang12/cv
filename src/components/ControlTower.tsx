import cv from '../data/cv.json';
import { Section } from './Section';

const aria = cv.projects.find(project => project.name === 'aria-conductor');

export function ControlTower() {
  return (
    <Section
      id="control-tower"
      number="02"
      label="Control Tower"
      title="Approval-gated control for agent fleets."
    >
      <p>{cv.controlTower.intro}</p>
      <ul className="caps">
        {cv.controlTower.capabilities.map(capability => (
          <li className="cap" key={capability.name}>
            <span>{capability.name}</span>
            <span className="mono">{capability.meta}</span>
          </li>
        ))}
      </ul>
      <p className="note">{cv.controlTower.note}</p>
      {aria?.url && (
        <p className="note open-source-note">
          <span className="mono">Open source</span> · <a href={aria.url} target="_blank" rel="noopener noreferrer">{aria.name}</a> — {cv.controlTower.openSource}
        </p>
      )}
    </Section>
  );
}
