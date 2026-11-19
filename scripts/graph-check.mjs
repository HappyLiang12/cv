import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Local Vite + real Chrome regression checks. No synthetic DOM clicks or source checks.
const url = process.argv[2] || 'http://127.0.0.1:5173/';
const widths = (process.env.GRAPH_WIDTHS || '1440,1024').split(',').map(Number);
const filter = process.env.GRAPH_CHECK_FILTER;
const CHROME = process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-graph-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'
], { stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const expect = (condition, message) => { if (!condition) throw new Error(message); };
let ws;
let failures = 0;

try {
  let target;
  const deadline = Date.now() + 15000;
  while (!target && Date.now() < deadline) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = pages.find(page => page.type === 'page');
    } catch { /* Chrome is starting. */ }
    if (!target) await wait(100);
  }
  expect(target, 'Chrome did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Browser evaluation failed');
    return result.result.value;
  };
  const until = async (expression, message, timeout = 10000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(expression)) return;
      await wait(60);
    }
    throw new Error(message);
  };
  const move = point => send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  const click = async point => {
    await move(point);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  };
  const pointFor = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block: 'nearest', inline: 'nearest'})`);
    await wait(80);
    const point = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      return {x, y, hit: el.contains(document.elementFromPoint(x, y)), disabled: el.disabled};
    })()`);
    expect(point && point.hit && !point.disabled, `Control not pointer-reachable: ${selector} (${JSON.stringify(point)})`);
    return { x: point.x, y: point.y };
  };
  const clickControl = async selector => { await click(await pointFor(selector)); await wait(160); };
  const label = id => `.scene-label[data-node-id="${id}"]`;
  const child = id => `.graph-inspector .gi-list .gi-node-button[data-node-id="${id}"]`;
  const breadcrumb = id => `.graph-inspector .gi-path [data-node-id="${id}"]`;
  const title = () => evaluate(`document.querySelector('.graph-inspector h2')?.textContent`);
  const details = () => evaluate(`(() => {
    const el = document.querySelector('.graph-inspector');
    return {active: el?.dataset.activeId, selected: el?.dataset.selectedId, mode: el?.dataset.mode,
      title: el?.querySelector('h2')?.textContent, desc: el?.querySelector('.gi-desc')?.textContent};
  })()`);
  const rect = () => evaluate(`(() => {
    const r = document.querySelector('.scene-canvas canvas').getBoundingClientRect();
    return {x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height};
  })()`);
  const camera = () => evaluate(`(() => {
    const s = window.__graphStore.getState();
    return [...s.camera.matrixWorld.elements, ...s.controls.target.toArray()];
  })()`);
  const maxDifference = (a, b) => Math.max(...a.map((value, i) => Math.abs(value - b[i])));
  // Project mesh centers so hover checks exercise raycasting, not only DOM labels.
  const meshPoint = position => evaluate(`(() => {
    const s = window.__graphStore.getState();
    const p = ${JSON.stringify(position)};
    const mesh = s.internal.interaction.find(o => o.parent?.position.toArray().every((v, i) => Math.abs(v - p[i]) < 0.00001));
    if (!mesh) return null;
    const v = mesh.getWorldPosition(mesh.position.clone()).project(s.camera);
    const r = s.gl.domElement.getBoundingClientRect();
    return {x: r.x + (v.x + 1) * r.width / 2, y: r.y + (1 - v.y) * r.height / 2};
  })()`);
  const blankPoint = () => evaluate(`(() => {
    const s = window.__graphStore.getState(), r = s.gl.domElement.getBoundingClientRect();
    const ray = new s.raycaster.constructor();
    for (const x of [-0.92, 0.92, -0.75, 0.75]) for (const y of [0.8, -0.8, 0]) {
      ray.setFromCamera({x, y}, s.camera);
      if (ray.intersectObjects(s.internal.interaction, true).length) continue;
      const point = {x: r.x + (x + 1) * r.width / 2, y: r.y + (1 - y) * r.height / 2};
      if (document.elementFromPoint(point.x, point.y) === s.gl.domElement) return point;
    }
    return null;
  })()`);
  const reset = async () => {
    await clickControl('.graph-inspector [data-graph-reset]');
    await move({x: 1, y: 1});
    await wait(800);
    await evaluate('window.scrollTo(0, 0)');
    await wait(80);
  };
  const test = async (name, run) => {
    if (filter && !name.includes(filter)) return;
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  };

  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = [];
    addEventListener('error', e => window.__errs.push(String(e.message || e.error)));
    addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason)));` });

  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
    await send('Page.navigate', {url});
    await until(`Boolean(document.querySelector('.scene-canvas canvas') && document.querySelector('.scene-label'))`, 'Graph did not mount');
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    await wait(1200);
    await evaluate(`(async () => {
      const moduleUrl = performance.getEntriesByType('resource').find(r => r.name.includes('/@react-three_fiber.js'))?.name;
      if (!moduleUrl) throw new Error('Run graph-check against the local Vite development server');
      const {_roots} = await import(moduleUrl);
      window.__graphStore = _roots.get(document.querySelector('.scene-canvas canvas')).store;
    })()`);
    const initial = await rect();
    expect(initial.w > 250 && initial.h > 250, `Canvas missing at ${width}: ${JSON.stringify(initial)}`);
    const check = (name, fn) => test(`${width}: ${name}`, fn);

    await check('mesh flyby to blank never commits departed node', async () => {
      const point = await meshPoint([2, 1, -0.2]);
      const blank = await blankPoint();
      expect(point && blank, 'Mesh/blank target missing');
      await move(point);
      await wait(200);
      expect(await title() === 'Agent systems', 'Real mesh hover did not reach Agent systems');
      await move({x: 1, y: 1});
      await wait(450);
      expect(await title() === 'Skill graph', 'Could not clear baseline hover');
      await evaluate(`window.__titles = []; window.__observer = new MutationObserver(() => window.__titles.push(document.querySelector('.graph-inspector h2')?.textContent));
        window.__observer.observe(document.querySelector('.graph-inspector'), {subtree: true, childList: true, characterData: true});`);
      await move(await meshPoint([2, 1, -0.2]));
      await wait(35);
      await move(blank);
      await wait(450);
      const titles = await evaluate(`window.__observer.disconnect(); window.__titles`);
      expect(!titles.includes('Agent systems') && await title() === 'Skill graph', `Departed mesh committed: ${JSON.stringify(titles)}`);
    });

    await check('idle camera and graph stay still', async () => {
      await move({x: 1, y: 1});
      await wait(800);
      const beforeCamera = await camera();
      const before = await meshPoint([2, 1, -0.2]);
      await wait(900);
      const after = await meshPoint([2, 1, -0.2]);
      expect(maxDifference(beforeCamera, await camera()) < 0.00001, 'Idle camera drifts');
      expect(Math.hypot(after.x - before.x, after.y - before.y) < 0.1, 'Ambient graph rotation moves labels');
    });

    await check('visible labels are selectable and hidden labels inert', async () => {
      await move({x: 1, y: 1}); await wait(400);
      const state = await evaluate(`(() => {
        const labels = [...document.querySelectorAll('.scene-label')];
        return {visible: labels.filter(e => !e.classList.contains('is-hidden') && !e.classList.contains('scene-label-tool')).every(e => e.tagName === 'BUTTON' && e.tabIndex === 0 && e.dataset.nodeId),
          hidden: labels.filter(e => e.classList.contains('is-hidden')).every(e => e.tabIndex === -1 && e.getAttribute('aria-hidden') === 'true' && getComputedStyle(e).pointerEvents === 'none')};
      })()`);
      expect(state.visible && state.hidden, `Label accessibility incorrect: ${JSON.stringify(state)}`);
      await evaluate(`window.__labelNodes = [...document.querySelectorAll('.scene-label')]; window.__inspectorNode = document.querySelector('.gi-layer'); true;`);
      await clickControl(label('agent'));
      await move({x: 1, y: 1}); await wait(800);
      expect((await details()).selected === 'agent', 'Capability label did not pin');
      expect(await evaluate(`window.__labelNodes.every(e => e.isConnected) && window.__inspectorNode === document.querySelector('.gi-layer')`), 'Hover/selection remounted labels or inspector');
      await clickControl(label('control-tower'));
      await move({x: 1, y: 1}); await wait(800);
      expect((await details()).selected === 'control-tower', 'Group label did not pin');
      await reset();
    });

    await check('pinned A restores after preview B and blank', async () => {
      await reset();
      await clickControl(child('agent'));
      await move({x: 1, y: 1}); await wait(800);
      const before = await camera();
      const point = await pointFor(label('happy'));
      await move(point); await wait(220);
      expect((await details()).active === 'happy' && (await details()).mode === 'preview', 'Hover did not preview B');
      await wait(400);
      expect(maxDifference(before, await camera()) < 0.00001, 'Hover moved camera');
      await evaluate(`window.__seamTitles = []; window.__seamObserver = new MutationObserver(() => window.__seamTitles.push(document.querySelector('.graph-inspector h2')?.textContent));
        window.__seamObserver.observe(document.querySelector('.graph-inspector'), {subtree: true, childList: true, characterData: true});`);
      await move(await blankPoint()); await wait(35);
      await move(point); await wait(180);
      const seamTitles = await evaluate('window.__seamObserver.disconnect(); window.__seamTitles');
      expect(!seamTitles.includes('Agent systems'), `Brief label/mesh gap flashed the pin: ${JSON.stringify(seamTitles)}`);
      await move(await blankPoint()); await wait(450);
      const restored = await details();
      expect(restored.active === 'agent' && restored.selected === 'agent' && restored.mode === 'pinned', `Pin not restored: ${JSON.stringify(restored)}`);
      await move(await pointFor(label('happy'))); await wait(35);
      await move(await blankPoint()); await wait(450);
      expect((await details()).active === 'agent', 'Label flyby replaced pin');
      await reset();
    });

    await check('inspector drilldown selects all 83 tools with exact Control Tower identities', async () => {
      await reset();
      const tower = ['Agent lifecycle', 'Agent task queue', 'Warm agent pool', 'Self-improvement pipeline', 'Knowledge base', 'Dynamic workflow', 'Active notification system', 'Agent-generated dashboard', 'Human-in-the-loop gate', 'Versioned agent definitions', 'Live state tracking', 'A2A', 'Multi-replica routing', 'Durable task state', 'Agent-pod registry', 'Credential proxy'];
      const ids = new Set();
      for (const capability of ['platform', 'agent', 'observability', 'delivery']) {
        await clickControl(child(capability));
        const groups = await evaluate(`[...document.querySelectorAll('.gi-list .gi-node-button')].map(e => e.dataset.nodeId)`);
        expect(groups.length === 3, `Missing skill groups in ${capability}`);
        for (const group of groups) {
          await clickControl(child(group));
          const tools = await evaluate(`[...document.querySelectorAll('.gi-list .gi-node-button')].map(e => ({id: e.dataset.nodeId, label: e.textContent}))`);
          if (group === 'control-tower') expect(JSON.stringify(tools.map(t => t.label)) === JSON.stringify(tower), 'Control Tower tool list differs from approved content');
          for (const tool of tools) {
            await clickControl(child(tool.id));
            const current = await details();
            expect(current.selected === tool.id && current.active === tool.id && current.title === tool.label && current.desc?.length > 10, `Wrong tool/context for ${tool.id}: ${JSON.stringify(current)}`);
            expect(await evaluate(`document.querySelectorAll('.scene-label-tool:not(.is-hidden)').length`) <= 1, 'Expanded tools crowd scene with labels');
            if (tool.label === 'Warm agent pool') expect(current.desc.includes('pre-warmed per worker pod'), 'Warm agent pool context lost');
            ids.add(tool.id);
            await clickControl(breadcrumb(group));
          }
          await clickControl(breadcrumb(capability));
        }
        await reset();
      }
      expect(ids.size === 83, `Only ${ids.size}/83 distinct tools selected`);
    });

    await check('canvas bounds stable between long and short details', async () => {
      await reset();
      const baseline = await rect();
      await clickControl(child('agent'));
      await clickControl(child('control-tower'));
      const long = await rect();
      await clickControl(child('control-tower-a2a'));
      const short = await rect();
      for (const next of [long, short]) expect(maxDifference(Object.values(baseline), Object.values(next)) <= 1, `Canvas reflow: ${JSON.stringify({baseline, long, short})}`);
      const fit = await evaluate(`(() => {
        const el = document.querySelector('.gi-desc'); const s = getComputedStyle(el);
        return el.scrollHeight <= el.clientHeight + 1 || s.overflowY === 'auto' || s.overflowY === 'scroll';
      })()`);
      expect(fit, 'Description clipped without scrolling');
      await reset();
    });

    await check('inspector navigation stays stationary during preview', async () => {
      await reset();
      const overviewFit = await evaluate(`(() => {
        const bounds = document.querySelector('.graph-inspector').getBoundingClientRect();
        return [...document.querySelectorAll('.gi-list .gi-node-button')].every(el => {
          const r = el.getBoundingClientRect(); return r.top >= bounds.top && r.bottom <= bounds.bottom;
        });
      })()`);
      expect(overviewFit, 'Overview capability choices are clipped before any interaction');
      await clickControl(child('agent'));
      await move({x: 1, y: 1}); await wait(800);
      const before = await evaluate(`document.querySelector('.gi-side').getBoundingClientRect().y + scrollY`);
      await move(await pointFor(label('happy'))); await wait(250);
      const after = await evaluate(`document.querySelector('.gi-side').getBoundingClientRect().y + scrollY`);
      expect(Math.abs(after - before) <= 1, `Preview moved the navigation by ${after-before}px`);
      await reset();
    });

    await check('tool hit spheres do not overlap nearest centers', async () => {
      await reset(); await clickControl(child('agent')); await clickControl(child('control-tower')); await wait(800);
      const hits = await evaluate(`(() => {
        const s = window.__graphStore.getState();
        return s.internal.interaction.filter(o => o.parent?.children.some(c => c.geometry?.type === 'TetrahedronGeometry'))
          .map(o => ({p: o.getWorldPosition(o.position.clone()).toArray(), r: o.geometry.parameters.radius}));
      })()`);
      expect(hits.length === 16, `Expected 16 rendered tools, got ${hits.length}`);
      for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
        const distance = Math.hypot(...hits[i].p.map((v, axis) => v - hits[j].p[axis]));
        expect(hits[i].r + hits[j].r < distance, `Overlapping tool hit spheres: ${hits[i].r + hits[j].r} >= ${distance}`);
      }
      await reset();
    });

    await check('keyboard labels, breadcrumb back and explicit reset work', async () => {
      await reset();
      await evaluate(`document.querySelector(${JSON.stringify(label('background'))}).focus()`);
      await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r'});
      await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
      await wait(250);
      expect((await details()).selected === 'background', 'Focused label did not activate with Enter');
      await clickControl(child('role-oocl'));
      expect((await details()).title === 'OOCL', 'Background drilldown failed');
      await clickControl('.graph-inspector [data-graph-back]');
      expect((await details()).selected === 'background', 'Back did not return to parent');
      await reset();
      expect((await details()).title === 'Skill graph' && !(await details()).selected, 'Reset did not clear selection');
    });

    await check('click focus is eased, drag orbits, reset works while unpinned', async () => {
      await reset();
      const home = await camera();
      await clickControl(child('agent'));
      const moving = await camera();
      await wait(650);
      const focused = await camera();
      expect(maxDifference(home, focused) > 0.1, 'Selection did not focus camera');
      expect(maxDifference(moving, focused) > 0.001, 'Click focus jumped instead of easing');
      await reset();
      const point = await blankPoint(); expect(point, 'No drag target');
      const bounds = await rect();
      await move(point);
      await send('Input.dispatchMouseEvent', {type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1});
      for (let step = 1; step <= 8; step++) {
        await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: point.x + bounds.w * 0.025 * step, y: point.y, button: 'left', buttons: 1});
        await wait(20);
      }
      await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: point.x + bounds.w * 0.2, y: point.y, button: 'left', buttons: 0, clickCount: 1});
      await move({x: 1, y: 1}); await wait(1800);
      expect(maxDifference(home, await camera()) > 0.1, 'Drag did not orbit camera');
      expect(!(await details()).selected, 'Blank drag unexpectedly selected a node');
      await reset();
      expect(maxDifference(home, await camera()) < 0.0001, 'Explicit reset did not restore unpinned camera (Hero must increment resetKey)');
    });

    await check('keyboard access excludes labels clipped by the canvas', async () => {
      await reset(); await clickControl(child('agent')); await clickControl(child('control-tower'));
      await move({x: 1, y: 1}); await wait(800);
      const clipped = await evaluate(`(() => {
        const bounds=document.querySelector('.scene-canvas canvas').getBoundingClientRect();
        return [...document.querySelectorAll('.scene-label')].filter(el=>el.tabIndex>=0).flatMap(el=>{
          const r=el.getBoundingClientRect();
          return r.left<bounds.left || r.right>bounds.right || r.top<bounds.top || r.bottom>bounds.bottom ? [el.textContent] : [];
        });
      })()`);
      expect(clipped.length === 0, `Clipped labels are tabbable: ${clipped.join(', ')}`);
      await evaluate(`document.querySelector('.hero-copy .text-link').focus()`);
      for (let i=0;i<15;i++) {
        await send('Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      }
      const scrolled = await evaluate(`[document.querySelector('.scene-canvas'),...document.querySelectorAll('.scene-canvas div')].some(el=>el.scrollTop!==0 || el.scrollLeft!==0)`);
      expect(!scrolled, 'Keyboard focus scrolled the internal canvas wrapper');
      await reset();
    });

    await check('keyboard access retains focus after tool drilldown', async () => {
      await reset(); await clickControl(child('agent')); await clickControl(child('control-tower'));
      const selector=child('control-tower-credential-proxy');
      await pointFor(selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
      await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await until(`document.querySelector('.graph-inspector').dataset.selectedId === 'control-tower-credential-proxy'`, 'Keyboard tool selection failed');
      const focused=await evaluate(`document.activeElement === document.querySelector('.gi-main')`);
      expect(focused, 'Keyboard drilldown lost focus instead of announcing the new detail region');
      await reset();
    });

    await check('keyboard exit from a hidden label has a visible focus destination', async () => {
      await reset(); await clickControl(child('agent')); await clickControl(child('control-tower'));
      await wait(800);
      await pointFor(label('control-tower'));
      await evaluate(`document.querySelector(${JSON.stringify(label('control-tower'))}).focus()`);
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
      await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await wait(850);
      expect(!(await details()).selected, 'Keyboard deselection failed');
      expect(await evaluate(`document.activeElement === document.querySelector('.gi-main')`), 'Hidden label retained focus after deselection');
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
      await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      expect(!(await details()).selected, 'Enter reactivated an invisible label');
      await reset();
    });

    await check('keyboard exit from no-op reset does not steal later pointer focus', async () => {
      await reset();
      await evaluate(`document.querySelector('[data-graph-reset]').focus()`);
      await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
      await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await wait(200);
      await clickControl(label('agent'));
      expect(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(label('agent'))})`), 'No-op keyboard reset stole later pointer focus');
      await reset();
    });

    await check('page scroll is not hijacked by canvas wheel', async () => {
      await evaluate('window.scrollTo(0, 0)'); await wait(150);
      await move({x: 1, y: 1}); await wait(800);
      const before = await camera();
      const point = await blankPoint(); expect(point, 'No canvas wheel target');
      await send('Input.dispatchMouseEvent', {type: 'mouseWheel', ...point, deltaX: 0, deltaY: 240});
      await wait(350);
      expect(await evaluate('window.scrollY') > 0, 'Canvas swallowed page scroll');
      expect(maxDifference(before, await camera()) < 0.00001, 'Wheel zoomed graph');
      await evaluate('window.scrollTo(0, 0)');
    });

    await check('no runtime errors', async () => {
      const errors = await evaluate('window.__errs');
      expect(errors.length === 0, errors.join('; '));
    });
  }
} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  await new Promise(resolve => chrome.once('exit', resolve));
  fs.rmSync(profile, {recursive: true, force: true});
}
if (failures) process.exitCode = 1;
