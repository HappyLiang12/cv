import type { ReactNode } from 'react';
import { nodes } from '../data/knowledgeGraph';

// Compound graph labels also appear as shorter names in prose.
const aliases = [
  'Java', 'JavaScript', 'React', 'ReactJS', 'Spring Boot', 'Spring Cloud', 'Spring',
  'Kotlin', 'Gradle', 'Maven', 'PHP', 'TensorFlow', 'DQN/RL', 'BM25',
  'JPA', 'Hibernate', 'Elasticsearch', 'Filebeat', 'Node.js',
  'OAuth2', 'OIDC', 'OpenID Connect', 'HTML', 'HTML5', 'CSS', 'MySQL', 'MariaDB',
  'AG-UI', 'SSE', 'Flask', 'LLM', 'VLM', 'CI/CD', 'agentic SDLC',
  'AI platform', 'agent platform', 'agent platforms', 'agent systems',
  'observability', 'microservice', 'microservices', 'self-improvement',
  'dynamic dashboard', 'dynamic dashboards', 'agent-generated dashboards'
];
const dictionary = [...new Set([
  ...nodes.filter(node => node.kind === 'tool').map(node => node.label),
  ...aliases
].map(term => term.toLowerCase()))].sort((a, b) => b.length - a.length);
const alternatives = dictionary.map(term =>
  term.split(/\s+/).map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
).join('|');
// Unicode token boundaries reject partial words; punctuation can separate terms.
const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`, 'giu');

type TechTextProps = {
  text?: string;
};

export function TechText({ text }: TechTextProps) {
  if (!text) return null;

  const parts: ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start > offset) parts.push(text.slice(offset, start));
    parts.push(<span className="tech-term" key={start}>{match[0]}</span>);
    offset = start + match[0].length;
  }
  if (offset < text.length) parts.push(text.slice(offset));
  return <>{parts}</>;
}
