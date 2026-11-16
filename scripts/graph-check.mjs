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

  const initialLabels = await evaluate(`document.querySelectorAll('.scene-label').length`);
  const labelPoint = (label, offsetY) => evaluate(`(() => {
    const label = ${JSON.stringify(label)};
    const el = [...document.querySelectorAll('.scene-label')].find(node => node.textContent === label);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 + ${offsetY} };
  })()`);
  const capPoint = await labelPoint('Agent systems', 33);
  const backgroundPoint = await labelPoint('Background', 28);
  expect(capPoint && backgroundPoint, 'Graph labels missing');
  const [capX, capY] = [capPoint.x, capPoint.y];
  const [backgroundX, backgroundY] = [backgroundPoint.x, backgroundPoint.y];
  await move(capX, capY);
  const hoverCap = await inspector();
  expect(hoverCap.title === 'Agent systems', 'Capability hover failed');
  expect(hoverCap.path === 'Happy / Agent systems', 'Capability path wrong');
  expect(hoverCap.cursor === 'pointer', 'Capability cursor missing');
  const hoveredLabels = await evaluate(`document.querySelectorAll('.scene-label').length`);
  expect(hoveredLabels === initialLabels, `Graph labels remount on hover (${initialLabels} -> ${hoveredLabels})`);
  const contentMotion = await evaluate(`(() => {
    const el = document.querySelector('.gi-layer-current');
    if (!el) return null;
    const style = getComputedStyle(el);
    return style.animationName !== 'none' ? style.animationDuration : style.transitionDuration;
  })()`);
  expect(contentMotion && contentMotion !== '0s' && contentMotion !== '0ms', 'Inspector content transition missing');
  console.log('HOVER CAP', JSON.stringify({ ...hoverCap, labels: hoveredLabels, contentMotion }));
  await shot('/tmp/graph-hover-cap.png');

  await sleep(300);
  await evaluate(`(() => {
    window.__giTitles = [];
    window.__giObserver = new MutationObserver(() => {
      const title = document.querySelector('.gi-layer-current h2')?.textContent;
      if (title && window.__giTitles[window.__giTitles.length - 1] !== title) {
        window.__giTitles.push(title);
      }
    });
    window.__giObserver.observe(document.querySelector('.graph-inspector'), {
      childList: true,
      characterData: true,
      subtree: true
    });
  })()`);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: backgroundX,
    y: backgroundY
  });
  await sleep(35);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: capX,
    y: capY
  });
  await sleep(400);
  const flashTitles = await evaluate(`(() => {
    window.__giObserver?.disconnect();
    return window.__giTitles;
  })()`);
  expect(
    flashTitles.length === 0,
    `Inspector flashed during rapid hover: ${JSON.stringify(flashTitles)}`
  );
  console.log('RAPID HOVER', JSON.stringify({ titles: flashTitles }));

  await click(capX, capY);
  const clickCap = await inspector();
  expect(clickCap.title === 'Agent systems', 'Capability click failed');
  expect(clickCap.list?.includes('Control Tower'), 'Skill groups missing');
  console.log('CLICK CAP', JSON.stringify(clickCap));

  const groupPoint = await labelPoint('Control Tower', 24);
  expect(groupPoint, 'Group label missing');
  await click(groupPoint.x, groupPoint.y);
  const clickGroup = await inspector();
  expect(clickGroup.title === 'Control Tower', 'Group click failed');
  expect(clickGroup.path === 'Happy / Agent systems / Control Tower', 'Group path wrong');
  expect(clickGroup.list?.includes('HITL approval'), 'Tools missing');
  console.log('CLICK GROUP', JSON.stringify(clickGroup));

  const toolPoint = await labelPoint('HITL approval', 19);
  expect(toolPoint, 'Tool label missing');
  await move(toolPoint.x, toolPoint.y);
  const toolProbe = await inspector();
  expect(toolProbe.path?.startsWith('Happy / Agent systems / Control Tower /'), 'Tool hover path failed');
  const toolHit = { ...toolPoint, ...toolProbe };
  console.log('HOVER TOOL', JSON.stringify(toolHit));
  await shot('/tmp/graph-hover-tool.png');

  const releaseGroup = await labelPoint('Control Tower', 24);
  await click(releaseGroup.x, releaseGroup.y);
  await sleep(900);
  const backgroundTarget = await labelPoint('Background', 28);
  expect(backgroundTarget, 'Background label missing');
  await click(backgroundTarget.x, backgroundTarget.y);
  const background = await inspector();
  expect(background.title === 'Background', 'Background click failed');
  expect(background.path === 'Happy / Background', 'Background path wrong');
  expect(background.list?.includes('OOCL'), 'Background children missing');
  console.log('BACKGROUND', JSON.stringify(background));

  const labelDistance = label => evaluate(`(() => {
    const label = ${JSON.stringify(label)};
    const el = [...document.querySelectorAll('.scene-label')].find(node => node.textContent === label);
    const canvas = document.querySelector('.scene-canvas canvas');
    if (!el || !canvas) return null;
    const a = el.getBoundingClientRect();
    const b = canvas.getBoundingClientRect();
    return Math.hypot(
      a.x + a.width / 2 - (b.x + b.width / 2),
      a.y + a.height / 2 - (b.y + b.height / 2)
    );
  })()`);

  const releaseBackground = await labelPoint('Background', 28);
  await click(releaseBackground.x, releaseBackground.y);
  await sleep(900);
  const beforeFocus = await labelDistance('Agent systems');
  const focusTarget = await labelPoint('Agent systems', 33);
  await click(focusTarget.x, focusTarget.y);
  await sleep(900);
  const afterFocus = await labelDistance('Agent systems');
  expect(
    beforeFocus !== null && afterFocus !== null && afterFocus < beforeFocus - 40,
    `Camera focus did not move the selected node toward center (${beforeFocus} -> ${afterFocus})`
  );
  console.log('CAMERA FOCUS', JSON.stringify({ before: beforeFocus, after: afterFocus }));

  const errors = await evaluate(`window.__errs || []`);
  expect(errors.length === 0, `Page errors: ${errors.join('; ')}`);
  console.log('ERRORS', JSON.stringify(errors));

  ws.close();
} finally {
  chrome.kill('SIGTERM');
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
