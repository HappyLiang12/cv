import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public/cv/index.html');
const cv = JSON.parse(fs.readFileSync(path.join(root, 'src/data/cv.json'), 'utf8'));
const phone = (process.env.APPLICATION_PHONE || '').trim();
const legalName = cv.legalName || cv.name;

if (!phone) {
  console.error('Set APPLICATION_PHONE before running npm run application-pdf.');
  process.exit(1);
}
if (!fs.existsSync(source)) {
  console.error('Missing public/cv/index.html. Run `npm run content` first.');
  process.exit(1);
}

const esc = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const email = cv.contact.email.trim();
const link = cv.contact.linkedin.trim();
const github = cv.contact.github.trim();
if (!email) {
  console.error('Missing contact email in src/data/cv.json.');
  process.exit(1);
}

const contact = [
  `<a href="mailto:${esc(email)}">${esc(email)}</a>`,
  `<a href="tel:${esc(phone.replace(/\s+/g, ''))}">${esc(phone)}</a>`,
  `<a href="${esc(link)}">LinkedIn</a>`,
  `<a href="${esc(github)}">github.com/HappyLiang12</a>`
].join(' · ');

const html = fs.readFileSync(source, 'utf8')
  .replace(`<title>${esc(cv.name)} — CV</title>`, `<title>${esc(legalName)} — Application CV</title>`)
  .replace(`<h1>${esc(cv.name)}</h1>`, `<h1>${esc(legalName)}</h1>`)
  .replace(/<p class="contact">[\s\S]*?<\/p>/, `<p class="contact">${contact}</p>`)
  .replace('<span>CV · 2026</span>', '<span>Application CV · 2026</span>')
  .replace(
    /<footer>[^<]*<\/footer>/,
    `<footer>Application CV · ${esc(legalName)}</footer>`
  );

const outDir = path.join(root, 'private');
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, 'LIANG-Yee-Ching-Happy-Application-CV');
fs.writeFileSync(`${base}.html`, html);

const candidates = [
  process.env.CHROME_PATH,
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);
const chrome = candidates.find(candidate => fs.existsSync(candidate));
if (!chrome) {
  console.error('No Chrome/Chromium found. Set CHROME_PATH to a headless-capable browser.');
  process.exit(1);
}

const result = spawnSync(
  chrome,
  [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${base}.pdf`,
    `file://${base}.html`
  ],
  { stdio: 'inherit' }
);
if (result.status !== 0) process.exit(result.status ?? 1);

const size = fs.statSync(`${base}.pdf`).size;
console.log(`wrote private/${path.basename(base)}.pdf (${Math.round(size / 1024)} KB)`);
