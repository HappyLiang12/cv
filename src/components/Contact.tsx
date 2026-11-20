import cv from '../data/cv.json';
import { Section } from './Section';

const base = import.meta.env.BASE_URL;
const linkedin = cv.contact.linkedin.trim();
const email = cv.contact.email.trim();
const phone = cv.contact.phone.trim();

export function Contact() {
  return (
    <Section
      id="contact"
      label="Contact"
      title="Contact details."
      className="contact"
    >
      <p>Open to AI platform, agent systems, and observability roles.</p>
      <div className="contact-actions">
        {email && (
          <a className="text-link primary" href={`mailto:${email}`}>{email}</a>
        )}
        {phone && (
          <a className="text-link" href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
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
        <a className="text-link" href={`${base}Happy-Liang-CV.html`} download>
          Download CV · HTML
        </a>
        <a className="text-link" href={`${base}cv.txt`}>Download CV · txt</a>
      </div>
    </Section>
  );
}
