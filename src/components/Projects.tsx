import cv from '../data/cv.json';
import { Section } from './Section';
import { TechText } from './TechText';

export function Projects() {
  return (
    <Section
      id="projects"
      label="Selected Projects"
      title="Open-source and production systems."
    >
      <div className="projects">
        {cv.projects.map(project => (
          <article className="project" key={project.name}>
            <div>
              <h3>{project.name}</h3>
              <div className="meta mono">{project.meta}</div>
              <p><TechText text={project.description} /></p>
              {project.url && (
                <a
                  className="project-link mono"
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View repository ↗
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
