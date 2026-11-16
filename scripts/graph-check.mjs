import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:4174/';
const CHROME =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-graph-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
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

function expect(condition, message) {
  if (!condition) throw new Error(message);
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
  const move = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await sleep(150);
  };
  const click = async (x, y) => {
    await move(x, y);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
    await sleep(700);
  };
  const inspector = () =>
    evaluate(`({
      title: document.querySelector('.graph-inspector h2')?.textContent ?? null,
      path: document.querySelector('.graph-inspector .gi-path')?.textContent ?? null,
      list: document.querySelector('.graph-inspector .gi-list')?.textContent ?? null,
      cursor: document.body.style.cursor
    })`);
  const shot = async file => {
    const image = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(file, Buffer.from(image.data, 'base64'));
  };

  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__errs = [];
      addEventListener('error', event => window.__errs.push(String(event.message || event.error)));
      addEventListener('unhandledrejection', event => window.__errs.push(String(event.reason)));`
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send('Page.navigate', { url });
  await sleep(5000);

  const rect = await evaluate(`(() => {
    const r = document.querySelector('.scene-canvas canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  })()`);
  const controls = await evaluate(`({
    inspector: document.querySelectorAll('.graph-inspector button, .graph-inspector select, .graph-inspector a, .graph-inspector [tabindex]').length,
    canvas: document.querySelector('.scene-canvas canvas')?.getAttribute('tabindex')
  })`);
  expect(rect.w > 400 && rect.h > 300, 'Graph canvas missing');
  expect(controls.inspector === 0 && controls.canvas === null, 'Graph exposes keyboard controls');
  expect((await evaluate(`document.querySelector('.graph-inspector h2')?.textContent`)) === 'A graph of my knowledge', 'Initial inspector state wrong');
  console.log('INITIAL', JSON.stringify({ rect, controls }));

  const at = (x, y) => [rect.x + rect.w * x, rect.y + rect.h * y];
  const [capX, capY] = at(0.73, 0.323);
  await move(capX, capY);
  const hoverCap = await inspector();
  expect(hoverCap.title === 'Agent systems', 'Capability hover failed');
  expect(hoverCap.path === 'Happy / Agent systems', 'Capability path wrong');
  expect(hoverCap.cursor === 'pointer', 'Capability cursor missing');
  console.log('HOVER CAP', JSON.stringify(hoverCap));
  await shot('/tmp/graph-hover-cap.png');

  await click(capX, capY);
  const clickCap = await inspector();
  expect(clickCap.title === 'Agent systems', 'Capability click failed');
  expect(clickCap.list?.includes('Control Tower'), 'Skill groups missing');
  console.log('CLICK CAP', JSON.stringify(clickCap));

  const [groupX, groupY] = at(0.756, 0.2);
  await click(groupX, groupY);
  const clickGroup = await inspector();
  expect(clickGroup.title === 'Control Tower', 'Group click failed');
  expect(clickGroup.path === 'Happy / Agent systems / Control Tower', 'Group path wrong');
  expect(clickGroup.list?.includes('HITL approval'), 'Tools missing');
  console.log('CLICK GROUP', JSON.stringify(clickGroup));

  let toolHit = null;
  for (let row = 0; row < 11 && !toolHit; row += 1) {
    for (let col = 0; col < 16 && !toolHit; col += 1) {
      const x = rect.x + rect.w * (0.68 + col * 0.014);
      const y = rect.y + rect.h * (0.09 + row * 0.016);
      await move(x, y);
      const probe = await inspector();
      if (probe.cursor === 'pointer' && probe.title !== 'Control Tower') {
        toolHit = { x, y, ...probe };
      }
    }
  }
  expect(toolHit?.path?.startsWith('Happy / Agent systems / Control Tower /'), 'Tool hover path failed');
  console.log('HOVER TOOL', JSON.stringify(toolHit));
  await shot('/tmp/graph-hover-tool.png');

  const [backgroundX, backgroundY] = at(0.5, 0.81);
  await click(backgroundX, backgroundY);
  const background = await inspector();
  expect(background.title === 'Background', 'Background click failed');
  expect(background.path === 'Happy / Background', 'Background path wrong');
  expect(background.list?.includes('OOCL'), 'Background children missing');
  console.log('BACKGROUND', JSON.stringify(background));

  const errors = await evaluate(`window.__errs || []`);
  expect(errors.length === 0, `Page errors: ${errors.join('; ')}`);
  console.log('ERRORS', JSON.stringify(errors));

  ws.close();
} finally {
  chrome.kill('SIGTERM');
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
