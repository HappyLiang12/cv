import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, out, w = '1440', h = '900', selector = '', wait = '3200', preJs = ''] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [w] [h] [selector] [waitMs] [preJs]');
  process.exit(1);
}

const WEBGL = process.env.WEBGL === '1';
const defaultChrome = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const CHROME = process.env.CHROME_PATH || defaultChrome;
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-shot-'));

const args = [
  '--headless=new',
  '--hide-scrollbars',
  '--disable-smooth-scrolling',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  'about:blank'
];
if (WEBGL) {
  args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
} else {
  args.push('--disable-gpu');
}

const chrome = spawn(CHROME, args, { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getJson(route) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

try {
  let target = null;
  for (let i = 0; i < 120; i++) {
    try {
      const pages = await getJson('/json');
      target = pages.find(page => page.type === 'page');
      if (target) break;
    } catch {}
    await sleep(120);
  }
  if (!target) throw new Error('No page target');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  await send('Page.enable');
  if (process.env.NOJS) {
    await send('Emulation.setScriptExecutionDisabled', { value: true });
  }
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__errs = [];
      addEventListener('error', event => window.__errs.push(String(event.message || event.error)));
      addEventListener('unhandledrejection', event => window.__errs.push(String(event.reason)));
      ${process.env.FULL ? "localStorage.setItem('cv-mode', 'full');" : ''}
      ${process.env.MINIMAL ? "localStorage.setItem('cv-mode', 'minimal');" : ''}`
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(w),
    height: Number(h),
    deviceScaleFactor: 1,
    mobile: false
  });
  if (process.env.REDUCE) {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
  }

  await send('Page.navigate', { url });
  await sleep(Number(wait));

  if (selector) {
    const expression = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'missing';
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
      return 'ok';
    })()`;
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result.value !== 'ok') throw new Error(`selector not found: ${selector}`);
    await sleep(1200);
  }

  if (preJs) {
    await send('Runtime.evaluate', { expression: preJs, awaitPromise: true });
    await sleep(900);
  }

  let info;
  try {
    info = await send('Runtime.evaluate', {
    expression: `({
      iw: innerWidth, ih: innerHeight,
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      fonts: document.fonts.status,
      y: Math.round(scrollY),
      mode: document.documentElement.dataset.mode || null,
      webgl2: (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })(),
      canvases: document.querySelectorAll('canvas').length,
      labels: Array.from(document.querySelectorAll('.scene-label')).map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
      }),
      title: document.title,
      errs: window.__errs || []
    })`,
    returnByValue: true
    });
    console.log(JSON.stringify(info.result.value));
  } catch (error) {
    console.log(JSON.stringify({ nojs: true, error: String(error.message || error) }));
  }

  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  ws.close();
  console.log('wrote', out);
} finally {
  chrome.kill('SIGTERM');
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
