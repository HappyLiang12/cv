import cv from '../data/cv.json';
import { Section } from './Section';

const base = import.meta.env.BASE_URL;
const linkedin = cv.contact.linkedin.trim();
const email = cv.contact.email.trim();

export function Contact() {
  return (
    <Section
      id="contact"
      label="Contact"
      title="Contact details."
      className="contact"
    >
      <p>
        Open to platform engineering, observability, and agent-platform roles.
        Open to relocation to the United States; will require employer-sponsored US work authorization.
      </p>
      <div className="contact-actions">
        {email && (
          <a className="text-link primary" href={`mailto:${email}`}>{email}</a>
        )}
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
      </p>
    </Section>
  );
}
