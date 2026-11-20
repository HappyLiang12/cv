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

const lede = snapshot.match(/<p class="lede rise"[^>]*>([\s\S]*?)<\/p>/);
const ledeText = lede ? lede[1] : '';
check(
  'snapshot hero shows the cv.json summary (escaped form)',
  Boolean(lede) && ledeText === escapeHtml(cv.summary),
  lede ? (decodeHtml(ledeText) === cv.summary ? 'exact summary text' : 'summary text differs') : 'lede paragraph not found'
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

console.log(`\n${checks} checks, ${checks - failures} passed, ${failures} failed`);
if (failures > 0) process.exitCode = 1;
