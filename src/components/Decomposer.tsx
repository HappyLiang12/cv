import cv from '../data/cv.json';
import { Section } from './Section';

export function Decomposer() {
  return (
    <Section
      id="decomposer"
      label="Job Decomposer"
      title="Recursive job → task → sub-task scheduling."
    >
      <p>{cv.decomposer.body}</p>
      <figure className="diagram">
        <svg
          viewBox="0 0 680 196"
          role="img"
          aria-label="Diagram: a job decomposes into tasks, which decompose into sub-tasks across N levels"
        >
          <g fill="none" stroke="var(--line-strong)">
            <rect x="12" y="80" width="104" height="32" />
            <rect x="216" y="18" width="102" height="28" />
            <rect x="216" y="82" width="102" height="28" />
            <rect x="216" y="146" width="102" height="28" />
            <rect x="432" y="8" width="94" height="24" />
            <rect x="432" y="44" width="94" height="24" />
            <rect x="432" y="86" width="94" height="24" />
            <rect x="432" y="122" width="94" height="24" />
            <rect x="432" y="158" width="94" height="24" />
            <path d="M116 96 H160 V32 H216 M160 96 H216 M160 96 V160 H216" />
            <path d="M318 32 H372 V20 H432 M372 32 V56 H432 M372 32 V98 H432 M318 96 H372 M372 96 V134 H432 M372 96 V170 H432 M318 160 H372 V134" />
          </g>
          <g
            fontFamily="IBM Plex Mono, monospace"
            fontSize="8"
            letterSpacing="1.2"
            fill="var(--muted)"
          >
            <text x="21" y="100">JOB</text>
            <text x="225" y="36">TASK</text>
            <text x="225" y="100">TASK</text>
            <text x="225" y="164">TASK</text>
            <text x="440" y="23">SUB-TASK</text>
            <text x="440" y="59">SUB-TASK</text>
            <text x="440" y="101">SUB-TASK</text>
            <text x="440" y="137">SUB-TASK</text>
            <text x="440" y="173">SUB-TASK</text>
          </g>
          <text
            x="548"
            y="98"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="8"
            letterSpacing="1"
            fill="var(--accent)"
          >
            N LEVELS
          </text>
        </svg>
        <figcaption className="mono">
          Job → task → sub-task · async fan-out · heartbeat dispatch · backpressure
        </figcaption>
      </figure>
    </Section>
  );
}
