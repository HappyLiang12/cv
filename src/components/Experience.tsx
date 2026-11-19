import cv from '../data/cv.json';
import { Section } from './Section';
import { TechText } from './TechText';

export function Experience() {
  return (
    <Section
      id="experience"
      label="Experience"
      title="Agent platforms and production systems."
    >
      {cv.experience.map(job => (
        <article className="job" key={job.company}>
          <div className="job-meta">
            <span className="mono">{job.period}</span>
            <span className="mono">{job.location}</span>
          </div>
          <div>
            <h3>
              {job.role} <span>— {job.company}</span>
            </h3>
            <ul>
              {job.bullets.map(bullet => (
                <li key={bullet}><TechText text={bullet} /></li>
              ))}
            </ul>
          </div>
        </article>
      ))}

      <div className="stack-block">
        <div className="subhead mono">Core stack</div>
        <div className="stack-grid">
          {cv.skillGroups.map(group => (
            <div className="stack-item" key={group.label}>
              <div className="mono stack-label">{group.label}</div>
              <div className="stack-items"><TechText text={group.items} /></div>
            </div>
          ))}
        </div>
        <p className="stack-practices mono">TDD · clean architecture · Scrum Master</p>
      </div>

      <div className="education-block">
        <div className="subhead mono">Education</div>
        {cv.education.map(item => (
          <div className="education-row" key={item.degree}>
            <span>{item.degree} — {item.school}</span>
            <span className="mono">{item.period}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
