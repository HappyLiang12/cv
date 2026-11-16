import cv from '../data/cv.json';
import { Section } from './Section';

export function Observability() {
  return (
    <Section
      id="observability"
      number="04"
      label="Observability"
      title="Uptime is a design property, not a dashboard."
    >
      <p>{cv.observability.body}</p>
      <table className="proof">
        <caption>{cv.observability.proofCaption}</caption>
        <thead>
          <tr>
            <th scope="col">Scenario</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {cv.observability.proof.map(row => (
            <tr key={row.scenario}>
              <td>{row.scenario}</td>
              <td>{row.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="stack-line mono">{cv.observability.stackLine}</p>
    </Section>
  );
}
