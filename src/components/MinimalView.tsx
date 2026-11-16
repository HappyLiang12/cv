import cv from '../data/cv.json';
import { EmailReveal } from './EmailReveal';

const base = import.meta.env.BASE_URL;
const linkedin = cv.contact.linkedin.trim();
const service = cv.metrics.find(metric => metric.label === 'Service estate');
const approvals = cv.metrics.find(metric => metric.label === 'Double approvals');
const load = cv.metrics.find(metric => metric.label === 'Load p95');

export function MinimalView() {
  return (
    <div className="minimal" id="top">
      <div className="wrap minimal-inner">
        <header className="minimal-head">
          <p className="kicker mono">Platform &amp; observability engineer — Hong Kong</p>
          <h1>{cv.name}</h1>
          <p className="minimal-summary">{cv.summary}</p>
          <p className="minimal-proof mono">
            {service?.value} service estate · {approvals?.value} double approvals after fix · p95 {load?.value}
          </p>
          <p className="avail">{cv.availabilityNote}</p>
        </header>

        <section className="min-section" aria-labelledby="min-experience">
          <h2 className="min-label" id="min-experience">Experience</h2>
          <ul className="min-rows">
            {cv.experience.map(job => (
              <li className="min-row" key={`${job.company}-${job.period}`}>
                <span>
                  <span className="min-role">{job.role}</span>
                  <span className="min-company"> — {job.company}</span>
                </span>
                <span className="min-period mono">{job.period}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-section" aria-labelledby="min-work">
          <h2 className="min-label" id="min-work">Selected work</h2>
          <ul className="min-projects">
            {cv.projects.slice(0, 4).map(project => (
              <li className="min-project" key={project.name}>
                <div className="min-project-head">
                  <span className="min-project-name">
                    {project.url ? (
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        {project.name} ↗
                      </a>
                    ) : (
                      project.name
                    )}
                  </span>
                  <span className="min-project-meta mono">{project.meta}</span>
                </div>
                <p>{project.description}</p>
              </li>
            ))}
          </ul>
          <a className="text-link compact" href={cv.contact.github} target="_blank" rel="me noopener noreferrer">
            More on GitHub ↗
          </a>
        </section>

        <section className="min-section" aria-labelledby="min-focus">
          <h2 className="min-label" id="min-focus">Focus</h2>
          <div className="min-focus">
            {cv.skillGroups.map(group => (
              <div className="min-focus-row" key={group.label}>
                <span className="min-focus-label">{group.label}</span>
                <span>{group.items}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="min-section" aria-labelledby="min-education">
          <h2 className="min-label" id="min-education">Education</h2>
          <ul className="min-rows">
            {cv.education.map(item => (
              <li className="min-row" key={item.school}>
                <span>
                  <span className="min-role">{item.degree}</span>
                  <span className="min-company"> — {item.school}</span>
                </span>
                <span className="min-period mono">{item.period}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-section" aria-labelledby="min-contact">
          <h2 className="min-label" id="min-contact">Contact</h2>
          <div className="min-contact-links">
            <EmailReveal />
            <a className="text-link" href={cv.contact.github} target="_blank" rel="me noopener noreferrer">
              GitHub ↗
            </a>
            {linkedin && (
              <a className="text-link" href={linkedin} target="_blank" rel="me noopener noreferrer">
                LinkedIn ↗
              </a>
            )}
            <a className="text-link" href={`${base}Happy-Liang-CV.pdf`} download>
              Download PDF
            </a>
          </div>
          <p className="contact-secondary mono min-secondary">
            <a href={`${base}cv/`}>Full CV / HTML</a>
            <span aria-hidden="true">·</span>
            <a href={`${base}cv.txt`}>cv.txt</a>
            <span aria-hidden="true">·</span>
            <a href={`${base}llms.txt`}>llms.txt</a>
          </p>
        </section>
      </div>
    </div>
  );
}
