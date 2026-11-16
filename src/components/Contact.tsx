import cv from '../data/cv.json';
import { EmailReveal } from './EmailReveal';
import { Section } from './Section';

const base = import.meta.env.BASE_URL;
const linkedin = cv.contact.linkedin.trim();

export function Contact() {
  return (
    <Section
      id="contact"
      number="06"
      label="Contact"
      title="Talk uptime."
      className="contact"
    >
      <p>
        Open to platform engineering, observability, and operations-tooling roles.
        Relocating to Memphis, TN; US work authorization requires sponsorship.
      </p>
      <div className="contact-actions">
        <EmailReveal />
        <a
          className="text-link"
          href={cv.contact.github}
          target="_blank"
          rel="me noopener noreferrer"
        >
          GitHub ↗
        </a>
        {linkedin && (
          <a
            className="text-link"
            href={linkedin}
            target="_blank"
            rel="me noopener noreferrer"
          >
            LinkedIn ↗
          </a>
        )}
        <a className="text-link" href={`${base}Happy-Liang-CV.pdf`} download>
          Download CV · PDF
        </a>
      </div>
      <p className="contact-secondary mono">
        <a href={`${base}cv/`}>CV / HTML</a>
        <span aria-hidden="true">·</span>
        <a href={`${base}cv.txt`}>cv.txt</a>
        <span aria-hidden="true">·</span>
        <a href={`${base}llms.txt`}>llms.txt</a>
      </p>
    </Section>
  );
}
