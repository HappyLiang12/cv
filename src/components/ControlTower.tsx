import cv from '../data/cv.json';
import { Section } from './Section';
import { TechText } from './TechText';

const aria = cv.projects.find(project => project.name === 'aria-conductor');

export function ControlTower() {
  return (
    <Section
      id="control-tower"
      label="Agent Control Tower"
      title="Humans decide, agents execute, governance stays human, operations stay traceable."
    >
      <p><TechText text={cv.controlTower.intro} /></p>
      <ul className="caps">
        {cv.controlTower.capabilities.map(capability => (
          <li className="cap" key={capability.name}>
            <span><TechText text={capability.name} /></span>
            <span className="mono"><TechText text={capability.meta} /></span>
          </li>
        ))}
      </ul>
      {aria?.url && (
        <p className="note open-source-note">
          <span className="mono">Open source</span> · <a href={aria.url} target="_blank" rel="noopener noreferrer">{aria.name}</a> — <TechText text={cv.controlTower.openSource} />
        </p>
      )}
    </Section>
  );
}
