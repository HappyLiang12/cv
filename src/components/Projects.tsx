import cv from '../data/cv.json';
import { Section } from './Section';

export function Projects() {
  return (
    <Section
      id="projects"
      number="05"
      label="Selected Projects"
      title="Built, measured, and shipped."
    >
      <div className="projects">
        {cv.projects.map((project, index) => (
          <article className="project" key={project.name}>
            <span className="n mono">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{project.name}</h3>
              <div className="meta mono">{project.meta}</div>
              <p>{project.description}</p>
              {project.url && (
                <a
                  className="project-link mono"
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="more-link">
        <a
          className="text-link"
          href={cv.contact.github}
          target="_blank"
          rel="me noopener noreferrer"
        >
          More open source on GitHub ↗
        </a>
      </p>
    </Section>
  );
}
