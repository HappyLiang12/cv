import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:4174/';
const CHROME =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-keys-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    'about:blank'
  ],
  { stdio: 'ignore' }
);
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
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    return result.result.value;
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send('Page.navigate', { url });
  await sleep(3000);

  const structure = await evaluate(`({
    title: document.title,
    lang: document.documentElement.lang,
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
    headings: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
    landmarks: Array.from(document.querySelectorAll('header, nav, main, footer')).map(el => el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? '[' + el.getAttribute('aria-label') + ']' : '')),
    toggle: (() => { const b = document.querySelector('.mode-toggle'); return b && { name: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), type: b.type }; })(),
    linksWithoutText: Array.from(document.querySelectorAll('a')).filter(a => !a.textContent.trim() && !a.getAttribute('aria-label')).length,
    imgsWithoutAlt: Array.from(document.querySelectorAll('img')).filter(i => !i.hasAttribute('alt')).length,
    skip: (() => { const a = document.querySelector('.skip'); return a && { text: a.textContent.trim(), target: a.getAttribute('href') }; })()
  })`);
  console.log('STRUCTURE', JSON.stringify(structure, null, 2));

  const tabInfo = async () =>
    evaluate(`(() => {
      const el = document.activeElement;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 48),
        href: el.getAttribute('href'),
        outline: s.outlineStyle + ' ' + s.outlineWidth,
        top: Math.round(r.top),
        visible: r.width > 0 && r.height > 0
      };
    })()`);

  const press = async (key, code, vk) => {
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk
    });
  };

  const stops = [];
  for (let i = 0; i < 14; i += 1) {
    await press('Tab', 'Tab', 9);
    await sleep(120);
    stops.push(await tabInfo());
  }
  console.log('TAB ORDER');
  stops.forEach((stop, index) => console.log(index + 1, JSON.stringify(stop)));

  const pressEnter = async () => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      text: '\r',
      unmodifiedText: '\r'
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13
    });
  };

  await evaluate('window.scrollTo(0, 0); document.querySelector(".skip").focus()');
  await sleep(200);
  await pressEnter();
  await sleep(400);
  console.log(
    'SKIP ACTIVATION',
    JSON.stringify(
      await evaluate(`({ hash: location.hash, focus: document.activeElement.tagName.toLowerCase(), mainTop: Math.round(document.getElementById('main').getBoundingClientRect().top) })`)
    )
  );

  await evaluate("document.querySelector('.mode-toggle').focus(); window.scrollTo(0, document.body.scrollHeight)");
  await pressEnter();
  await sleep(300);
  console.log(
    'TOGGLE ENTER',
    JSON.stringify(
      await evaluate(`({ mode: document.documentElement.dataset.mode, pressed: document.querySelector('.mode-toggle').getAttribute('aria-pressed'), stored: localStorage.getItem('cv-mode'), canvases: document.querySelectorAll('canvas').length, scrollY: Math.round(scrollY), minimal: Boolean(document.querySelector('.minimal')), nav: Boolean(document.querySelector('.nav')), h1: document.querySelector('h1')?.textContent })`)
    )
  );
  await pressEnter();
  await sleep(300);
  console.log(
    'TOGGLE BACK',
    JSON.stringify(
      await evaluate(`({ mode: document.documentElement.dataset.mode, pressed: document.querySelector('.mode-toggle').getAttribute('aria-pressed'), minimal: Boolean(document.querySelector('.minimal')), nav: Boolean(document.querySelector('.nav')), h1: document.querySelector('h1')?.textContent })`)
    )
  );

  ws.close();
} finally {
  chrome.kill('SIGTERM');
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
