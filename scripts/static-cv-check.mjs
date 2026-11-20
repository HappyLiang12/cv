// Static snapshot check: no browser, no build — asserts the downloaded HTML artifact
// and the ATS page agree with src/data/cv.json. Exits non-zero on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const sizeOf = relative => fs.statSync(path.join(root, relative)).size;

const cv = JSON.parse(read('src/data/cv.json'));
const siteUrl = (process.env.SITE_URL || cv.siteUrl).replace(/\/+$/, '') + '/';
const snapshotPath = 'public/Happy-Liang-CV.html';
const atsPath = 'public/cv/index.html';
const textPath = 'public/cv.txt';
const composeClaim = 'Validated on a 7-service Docker/Podman compose stack';
// The snapshot's section ids; `top` is the hero, the rest are the nav targets.
const sectionIds = ['top', 'experience', 'control-tower', 'decomposer', 'observability', 'projects', 'contact'];

let checks = 0;
let failures = 0;
const pass = (name, detail) => {
  checks++;
  console.log(`PASS  ${name}${detail ? ` (${detail})` : ''}`);
};
const fail = (name, detail) => {
  checks++;
  failures++;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
};
const check = (name, ok, detail) => (ok ? pass(name, detail) : fail(name, detail));

// Every published contact surface carries the same phone, derived from cv.json.
const phone = String(cv.contact.phone ?? '').trim();
const phoneHref = `tel:${phone.replace(/\s+/g, '')}`;
const hasPhone = phone.length > 0;

// Same escaping React applies to text nodes rendered by renderToStaticMarkup.
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#x27;');

const decodeHtml = value => String(value)
  .replaceAll('&#x27;', "'")
  .replaceAll('&#39;', "'")
  .replaceAll('&quot;', '"')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&');

let snapshot;
try {
  snapshot = read(snapshotPath);
} catch (error) {
  fail(`${snapshotPath} exists`, error.code === 'ENOENT' ? 'file not found — run `npm run content`' : error.message);
  console.error(`\n${checks} checks, ${failures} failed`);
  process.exit(1);
}

const snapshotBytes = sizeOf(snapshotPath);
check(`${snapshotPath} is larger than 20 KB`, snapshotBytes > 20 * 1024, `${(snapshotBytes / 1024).toFixed(1)} KB`);

const scriptTags = (snapshot.match(/<script\b/g) || []).length;
check('snapshot has no <script> tags', scriptTags === 0, `${scriptTags} found`);
check('snapshot inlines its styles', snapshot.includes('<style>'));
check('snapshot is the full mode', snapshot.includes('data-mode="full"'));

const actualSectionIds = [...snapshot.matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map(match => match[1]);
check(
  'snapshot section ids are complete and ordered',
  isDeepStrictEqual(actualSectionIds, sectionIds),
  actualSectionIds.join(' -> ')
);

for (const job of cv.experience) {
  for (const field of ['company', 'role']) {
    const value = job[field];
    check(`snapshot has experience ${field} "${value}"`, snapshot.includes(escapeHtml(value)));
  }
}

for (const project of cv.projects) {
  check(`snapshot has project "${project.name}"`, snapshot.includes(escapeHtml(project.name)));
}

check('snapshot has the contact email', snapshot.includes(escapeHtml(cv.contact.email)), cv.contact.email);
check('cv.json defines contact.phone', hasPhone, hasPhone ? phone : 'missing');
check('snapshot has the contact phone link', hasPhone && snapshot.includes(`href="${phoneHref}"`), phoneHref);
check('snapshot shows the contact phone number', hasPhone && snapshot.includes(escapeHtml(phone)), phone);

const lede = snapshot.match(/<p class="lede rise"[^>]*>([\s\S]*?)<\/p>/);
const ledeText = lede ? lede[1] : '';
check(
  'snapshot hero shows the cv.json summary (escaped form)',
  Boolean(lede) && ledeText === escapeHtml(cv.summary),
  lede ? (decodeHtml(ledeText) === cv.summary ? 'exact summary text' : 'summary text differs') : 'lede paragraph not found'
);

// The download has no JavaScript: the skill map must be plain text, not dead controls.
const buttonTags = (snapshot.match(/<button\b/g) || []).length;
check('snapshot has no <button> elements', buttonTags === 0, `${buttonTags} found`);

const skillCard = snapshot.match(/<figure class="hero-scene is-explorer"[^>]*>([\s\S]*?)<\/figure>/);
const skillCardHtml = skillCard ? decodeHtml(skillCard[1]) : '';
check(
  'snapshot hero has the static skill card',
  Boolean(skillCard) && /class="[^"]*\bstatic-skills\b[^"]*"/.test(skillCardHtml),
  skillCard ? 'card found' : 'figure.hero-scene.is-explorer not found'
);

for (const label of ['Platform', 'Agent systems', 'Observability', 'Delivery & ops', 'Background']) {
  check(`snapshot skill card has capability "${label}"`, skillCardHtml.includes(label));
}

// Every tool entry is one list item: the label and its own description stay together.
const skillEntries = [...skillCardHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(match => match[1]);
const hasEntry = (label, description) =>
  skillEntries.some(entry => entry.includes(label) && entry.includes(description));
check(
  'snapshot skill card has the Warm agent pool description',
  hasEntry('Warm agent pool', 'pre-warmed per worker pod'),
  `${skillEntries.length} entries`
);
check(
  'snapshot skill card has the TypeScript description',
  hasEntry('TypeScript', 'Typed frontend and Node tooling, including the MCP server.')
);

// Completeness guard for the disclosure card. The totals come from
// src/data/knowledgeGraph.ts: capabilityCount = 4 capabilityDefs plus the Background
// node = 5 capability items, groupCount = 12, toolCount = 83. Hardcoded because this
// check runs without a TypeScript loader.
const skillTotals = { capabilityItems: 5, groupItems: 12, toolEntries: 83 };
const countClass = (html, className) => (html.match(new RegExp(`class="${className}"`, 'g')) || []).length;

const capabilityItems = countClass(skillCardHtml, 'static-skill-item');
check('snapshot skill card has 5 capability items', capabilityItems === skillTotals.capabilityItems, `${capabilityItems} found`);
const groupItems = countClass(skillCardHtml, 'static-skill-group');
check('snapshot skill card has 12 group items', groupItems === skillTotals.groupItems, `${groupItems} found`);
check('snapshot skill card lists all 83 tools', skillEntries.length === skillTotals.toolEntries, `${skillEntries.length} entries`);

// The download eases its native disclosures open with modern CSS only: the details content
// animates from block-size 0 to auto, so the inline snapshot must carry the rules.
check(
  'snapshot animates details::details-content',
  snapshot.includes('details::details-content'),
  snapshot.includes('details::details-content') ? 'animated disclosure rules inlined' : '/details::details-content/ not found in the inlined styles'
);
check(
  'snapshot interpolates intrinsic block-size keywords',
  snapshot.includes('interpolate-size: allow-keywords'),
  snapshot.includes('interpolate-size: allow-keywords') ? 'interpolate-size: allow-keywords inlined' : 'interpolate-size: allow-keywords missing'
);
check(
  'snapshot defines the skill-view entrance keyframes',
  snapshot.includes('@keyframes skill-view-in'),
  snapshot.includes('@keyframes skill-view-in') ? '@keyframes skill-view-in inlined' : '@keyframes skill-view-in missing'
);
check(
  'snapshot transitions the static disclosure panels',
  snapshot.includes('.static-skill-item::details-content') &&
    snapshot.includes('.static-skill-group::details-content') &&
    snapshot.includes('content-visibility .36s allow-discrete'),
  'static-skill-item/group ::details-content transition rules'
);

const artifacts = new Map();
for (const relative of [snapshotPath, atsPath, textPath]) {
  try {
    artifacts.set(relative, read(relative));
  } catch (error) {
    artifacts.set(relative, '');
    fail(`${relative} exists`, error.code === 'ENOENT' ? 'file not found' : error.message);
    continue;
  }
  check(`${relative} omits the compose-stack claim`, !artifacts.get(relative).includes(composeClaim));
}

for (const artifact of ['Happy-Liang-CV.pdf', 'Happy-Liang-CV.html', 'cv.txt']) {
  check(`snapshot links to the absolute ${artifact} URL`, snapshot.includes(`${siteUrl}${artifact}`), `${siteUrl}${artifact}`);
}

const rootRelative = [...snapshot.matchAll(/\b(?:href|src)="\/[^"]*/g)].map(match => match[0]);
check(
  'snapshot has no root-relative links',
  rootRelative.length === 0,
  rootRelative.length === 0 ? 'all links absolute or anchors' : rootRelative.slice(0, 3).join(', ')
);

const ats = artifacts.get(atsPath) ?? '';
const atsSections = ['Summary', 'Core Skills', 'Experience', 'Selected Projects', 'Education'];
for (const heading of atsSections) {
  check(`${atsPath} has section "${heading}"`, ats.includes(`<h2>${heading}</h2>`));
}
check(`${atsPath} has the contact phone link`, hasPhone && ats.includes(`href="${phoneHref}"`), phoneHref);
check(`${atsPath} shows the contact phone number`, hasPhone && ats.includes(escapeHtml(phone)), phone);

const cvText = artifacts.get(textPath) ?? '';
check(`${textPath} has the contact phone`, hasPhone && cvText.includes(`Phone: ${phone}`), `Phone: ${phone}`);

console.log(`\n${checks} checks, ${checks - failures} passed, ${failures} failed`);
if (failures > 0) process.exitCode = 1;
