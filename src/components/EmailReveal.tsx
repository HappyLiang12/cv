import { useState } from 'react';
import cv from '../data/cv.json';

const email = cv.contact.email.trim();

export function EmailReveal() {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="email-slot" aria-live="polite">
      {email ? (
        revealed ? (
          <a className="text-link primary" href={`mailto:${email}`}>{email}</a>
        ) : (
          <button className="text-link primary" type="button" onClick={() => setRevealed(true)}>
            Email — click to reveal
          </button>
        )
      ) : (
        <span className="text-link muted">Email — available on request</span>
      )}
    </span>
  );
}
