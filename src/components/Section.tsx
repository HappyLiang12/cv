import type { ReactNode } from 'react';

type SectionProps = {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, label, title, children, className = '' }: SectionProps) {
  const titleId = `${id}-title`;

  return (
    <section className={`section ${className}`} id={id} aria-labelledby={titleId}>
      <div className="wrap">
        <div className="sec-meta mono">
          <span className="sec-label">{label}</span>
        </div>
        <h2 className="sec-title" id={titleId}>{title}</h2>
        <div className="sec-body">{children}</div>
      </div>
    </section>
  );
}
