import cv from '../data/cv.json';
import { Section } from './Section';

export function Observability() {
  return (
    <Section
      id="observability"
      label="Observability"
      title="Production metrics, logs, and release checks."
    >
      <p>{cv.observability.body}</p>
      <table className="proof">
        <caption>What I monitor in production</caption>
        <thead>
          <tr>
            <th scope="col">Area</th>
            <th scope="col">Tools and checks</th>
          </tr>
        </thead>
        <tbody>
          {cv.observability.scope.map(row => (
            <tr key={row.area}>
              <td>{row.area}</td>
              <td>{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
