import cv from '../data/cv.json';
import { Section } from './Section';

export function Decomposer() {
  return (
    <Section id="decomposer" label="Job Decomposer" title="Framework-level job → task → sub-task dispatch.">
      <p>{cv.decomposer.body}</p>
      <figure className="diagram">
        <div className="decomposer-flow" role="img" aria-label="A job decomposes into three tasks, which decompose into sub-tasks recursively across N levels.">
          <div className="flow-stage"><span className="flow-node flow-root">Job</span></div>
          <div className="flow-stage">
            {[0, 1, 2].map(index => <span className="flow-node" key={index}>Task</span>)}
          </div>
          <div className="flow-stage">
            {[0, 1, 2, 3, 4].map(index => <span className="flow-node" key={index}>Sub-task</span>)}
          </div>
          <span className="flow-continuation mono">N levels</span>
        </div>
        <figcaption className="mono">Job → task → sub-task · async fan-out · heartbeat dispatch · backpressure</figcaption>
      </figure>
    </Section>
  );
}
