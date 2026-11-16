import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = path.join(root, 'public/cv/index.html');
const out = path.join(root, 'public/Happy-Liang-CV.pdf');

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
if (!fs.existsSync(page)) {
  console.error('Missing public/cv/index.html. Run `npm run content` first.');
  process.exit(1);
}

const result = spawnSync(
  chrome,
  [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${out}`,
    `file://${page}`
  ],
  { stdio: 'inherit' }
);

if (result.status !== 0) process.exit(result.status ?? 1);
const size = fs.statSync(out).size;
console.log(`wrote public/Happy-Liang-CV.pdf (${Math.round(size / 1024)} KB)`);
