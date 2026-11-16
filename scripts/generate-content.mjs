import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cv = JSON.parse(fs.readFileSync(path.join(root, 'src/data/cv.json'), 'utf8'));
const siteUrl = (process.env.SITE_URL || cv.siteUrl).replace(/\/+$/, '') + '/';
const publicDir = path.join(root, 'public');
const cvDir = path.join(publicDir, 'cv');
fs.mkdirSync(cvDir, { recursive: true });

const esc = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const email = cv.contact.email.trim();
const linkedin = cv.contact.linkedin.trim();
const github = cv.contact.github.trim();
const contactParts = [];
if (email) contactParts.push(`<a href="mailto:${esc(email)}">${esc(email)}</a>`);
else contactParts.push('Email available on request');
if (linkedin) contactParts.push(`<a href="${esc(linkedin)}">LinkedIn</a>`);
if (github) contactParts.push(`<a href="${esc(github)}">github.com/HappyLiang12</a>`);

const contactPlain = [];
if (email) contactPlain.push(email);
else contactPlain.push('Email: available on request');
if (linkedin) contactPlain.push(`LinkedIn: ${linkedin}`);
if (github) contactPlain.push(`GitHub: ${github}`);

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: cv.name,
  alternateName: cv.shortName,
  jobTitle: 'Senior Technical Analyst',
  worksFor: { '@type': 'Organization', name: 'OOCL' },
  address: { '@type': 'PostalAddress', addressLocality: 'Hong Kong' },
  alumniOf: cv.education.map(item => ({ '@type': 'CollegeOrUniversity', name: item.school })),
  sameAs: [github, linkedin].filter(Boolean),
  url: siteUrl,
  knowsAbout: [
    'Platform engineering', 'Observability', 'Kubernetes', 'Grafana', 'Prometheus',
    'Distributed scheduling', 'Java', 'Spring Boot', 'React', 'AI agents', 'MCP', 'A2A'
  ]
};

const experienceHtml = cv.experience.map(job => `
  <section class="job">
    <div class="job-head">
      <h3>${esc(job.role)} — ${esc(job.company)}</h3>
      <span class="dates">${esc(job.location)} · ${esc(job.period)}</span>
    </div>
    <ul>${(job.cvBullets || job.bullets).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
  </section>`).join('');

const experienceText = cv.experience.map(job => {
  const bullets = (job.cvBullets || job.bullets).map(b => `  - ${b}`).join('\n');
  return `${job.company} — ${job.role}\n${job.location} | ${job.period}\n${bullets}`;
}).join('\n\n');

const projectsHtml = cv.projects.map(project => `
  <section class="project">
    <h3>${esc(project.name)}${project.url ? ` — <a href="${esc(project.url)}">source</a>` : ''}</h3>
    <p class="meta">${esc(project.meta)}</p>
    <p>${esc(project.cvDescription || project.description)}</p>
  </section>`).join('');

const projectsText = cv.projects.map(project =>
  `${project.name} (${project.meta})${project.url ? `\n${project.url}` : ''}\n${project.cvDescription || project.description}`
).join('\n\n');

const educationHtml = cv.education.map(item =>
  `<li><strong>${esc(item.degree)}</strong> — ${esc(item.school)} <span class="dates">${esc(item.period)}</span></li>`
).join('');

const skillsHtml = cv.coreSkills.map(skill => `<li>${esc(skill)}</li>`).join('');

const cvHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Happy LIANG Yee Ching — CV</title>
<meta name="description" content="CV of Happy LIANG Yee Ching, platform and observability engineer in Hong Kong. Control planes for agent fleets, distributed scheduling, and production observability.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${siteUrl}cv/">
<link rel="alternate" type="text/plain" href="../cv.txt" title="CV (plain text)">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<script type="application/ld+json">${JSON.stringify(personJsonLd)}</script>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fcfcfb; color: #16171a; font-family: Georgia, "Times New Roman", serif; line-height: 1.55; }
  .top { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; max-width: 820px; margin: 0 auto; padding: 22px 28px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #64645d; }
  .top a { color: #2c5f4f; text-decoration: none; }
  .top button { border: 1px solid #c9c9c0; background: transparent; color: #16171a; font: inherit; letter-spacing: .08em; text-transform: uppercase; padding: 6px 10px; cursor: pointer; }
  main { max-width: 820px; margin: 0 auto; padding: 26px 28px 64px; }
  h1 { font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: clamp(34px, 5vw, 44px); font-weight: 500; letter-spacing: -.035em; line-height: 1.05; margin: 0 0 6px; }
  .role { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #2c5f4f; font-size: 10px; letter-spacing: .13em; text-transform: uppercase; margin: 0 0 12px; }
  .contact, .avail { font-size: 13px; color: #4a4a43; margin: 0 0 3px; }
  .contact a { color: #2c5f4f; }
  h2 { font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 15px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; margin: 34px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #c9c9c0; }
  p, li { font-size: 13.5px; color: #33332e; }
  ul { margin: 6px 0 0; padding-left: 18px; }
  li { margin-bottom: 5px; }
  .job { margin: 0 0 18px; }
  .job-head { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; flex-wrap: wrap; }
  h3 { font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 15px; font-weight: 600; margin: 0 0 4px; letter-spacing: -.01em; }
  .dates { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #64645d; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
  .meta { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #64645d; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; margin: 0 0 4px; }
  .project { margin: 0 0 16px; }
  .project p { margin: 0 0 4px; }
  .project a { color: #2c5f4f; }
  .pdf-link { margin-top: 30px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
  .pdf-link a { color: #2c5f4f; }
  footer { max-width: 820px; margin: 0 auto; padding: 0 28px 36px; color: #64645d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; letter-spacing: .07em; text-transform: uppercase; }
  @media print {
    body { background: #fff; color: #000; font-size: 10.5pt; }
    .top, .no-print { display: none !important; }
    main { max-width: none; padding: 0; }
    a { color: inherit; text-decoration: none; }
    h2 { margin-top: 18px; border-color: #999; }
    .job, .project { break-inside: avoid; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
<header class="top no-print">
  <a href="../">← Portfolio</a>
  <span>CV · 2026</span>
  <button type="button" onclick="window.print()">Print / Save as PDF</button>
</header>
<main>
  <h1>${esc(cv.name)}</h1>
  <p class="role">${esc(cv.role)} — ${esc(cv.location)}</p>
  <p class="contact">${contactParts.join(' · ')}</p>
  <p class="avail">${esc(cv.availability)}</p>

  <h2>Summary</h2>
  <p>${esc(cv.summaryLong)}</p>

  <h2>Core Skills</h2>
  <ul>${skillsHtml}</ul>

  <h2>Experience</h2>
  ${experienceHtml}

  <h2>Selected Projects</h2>
  ${projectsHtml}

  <h2>Education</h2>
  <ul>${educationHtml}</ul>

  <p class="pdf-link no-print"><a href="../Happy-Liang-CV.pdf">Download PDF</a> · <a href="../cv.txt">Plain text</a></p>
</main>
<footer>Static CV · no trackers · no phone number published</footer>
</body>
</html>`;

fs.writeFileSync(path.join(cvDir, 'index.html'), cvHtml);

const cvText = `${cv.name}
${cv.role} — ${cv.location}
${contactPlain.join('\n')}
${cv.availability}

SUMMARY
${cv.summaryLong}

CORE SKILLS
${cv.coreSkills.map(skill => `- ${skill}`).join('\n')}

EXPERIENCE
${experienceText}

SELECTED PROJECTS
${projectsText}

EDUCATION
${cv.education.map(item => `${item.degree} — ${item.school} (${item.period})`).join('\n')}
`;
fs.writeFileSync(path.join(publicDir, 'cv.txt'), cvText);

const llmsText = `# ${cv.name}

> ${cv.summary}

${cv.role} based in ${cv.location}. ${cv.availability}

## Canonical pages
- Portfolio: ${siteUrl}
- CV (HTML): ${siteUrl}cv/
- CV (plain text): ${siteUrl}cv.txt
- GitHub: ${github}
- This file: ${siteUrl}llms.txt

## Focus
- Control planes for agent fleets: HITL approval gates, live fleet state, spec versioning, A2A v1.0, AG-UI/SSE, MCP.
- Distributed scheduling: recursive job -> task -> work-unit decomposition, async fan-out, heartbeat dispatch, backpressure.
- Production observability: Grafana, Prometheus, Azure Monitor, Elasticsearch/Filebeat, Metabase on Rancher-managed Kubernetes.
- Correctness-sensitive systems: OAuth2/OIDC, ABAC, optimistic locking, TOCTOU fixes, deterministic E2E and load harnesses.

## Selected evidence
- aria-conductor: concurrent opposing approvals reduced from 5/8 to 0/8 double commits with an atomic conditional update.
- aria-conductor harness: 100-read burst p95 ~0.9 s; 16-client mixed load errorRate 0; 6x pool saturation zero 5xx.
- 20+ service estate across Java 21/Spring Boot, Python, React, Kong, Nginx, and ADK agent services.

## Reading order for agents
1. ${siteUrl}cv.txt — complete structured CV.
2. ${siteUrl}cv/ — the same CV as semantic HTML.
3. ${siteUrl} — portfolio narrative and selected projects.

## Notes
- No phone number is published.
- No analytics or trackers.
- Contact details are available on request.
`;

fs.writeFileSync(path.join(publicDir, 'llms.txt'), llmsText);

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${siteUrl}cv/</loc><lastmod>${today}</lastmod></url>
</urlset>
`;
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);

fs.writeFileSync(path.join(publicDir, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`);
fs.writeFileSync(path.join(publicDir, '.nojekyll'), '');

console.log('generated public/cv/index.html, public/cv.txt, public/llms.txt, sitemap.xml, robots.txt');
