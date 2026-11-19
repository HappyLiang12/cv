import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const url = process.argv[2] || 'http://127.0.0.1:5173/';
const chromePath = process.env.CHROME_PATH || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-ui-check-'));
const chrome = spawn(chromePath, ['--headless=new', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let failures = 0;

async function until(probe, message, timeout = 10000) {
  const end = Date.now() + timeout;
  do {
    const value = await probe();
    if (value) return value;
    await pause(50);
  } while (Date.now() < end);
  throw new Error(message);
}

try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  await until(() => fs.existsSync(portFile), 'Chrome did not start');
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const click = async (selector, touch = false) => {
    const point = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
    })()`);
    assert(point && point.w > 0 && point.h > 0, `Visible control missing: ${selector}`);
    if (touch) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    }
  };
  const screenshot = async name => {
    if (!process.env.UI_SCREENSHOTS) return;
    const image = await send('Page.captureScreenshot', {format:'png',fromSurface:true});
    fs.writeFileSync(path.join(process.env.UI_SCREENSHOTS,name),Buffer.from(image.data,'base64'));
  };
  const load = async (width, mode = 'full', reduced = false, height = 900) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 981 });
    await send('Emulation.setTouchEmulationEnabled', { enabled: width < 981 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('cv-mode', ${JSON.stringify(mode)});` });
    await send('Page.navigate', { url });
    await until(() => evaluate(`document.querySelector('main h1') && document.fonts.status === 'loaded'`), 'Page did not render');
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  };
  const test = async (name, run) => {
    if (process.env.UI_CHECK_FILTER && !name.includes(process.env.UI_CHECK_FILTER)) return;
    try { await run(); console.log('PASS', name); }
    catch (error) { failures++; console.error('FAIL', name, '-', error.message); }
  };
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__uiErrors=[]; addEventListener('error', e=>window.__uiErrors.push(e.message)); addEventListener('unhandledrejection', e=>window.__uiErrors.push(String(e.reason)));` });

  await test('Mobile skill navigation exposes real group and tool details by touch', async () => {
    await load(390);
    assert(await evaluate(`!!document.querySelector('.skill-explorer button[data-node-id="agent"]')`), 'Mobile skill explorer has no capability controls');
    await click('.skill-explorer button[data-node-id="agent"]', true);
    await until(() => evaluate(`!!document.querySelector('.skill-explorer button[data-node-id="control-tower"]')`), 'Capability groups missing');
    await click('.skill-explorer button[data-node-id="control-tower"]', true);
    await until(() => evaluate(`document.querySelector('.skill-explorer h3')?.textContent === 'Agent Control Tower'`), 'Group did not open');
    assert.equal(await evaluate(`document.querySelectorAll('.skill-children button').length`), 16);
    await click('.skill-explorer button[data-node-id="control-tower-warm-agent-pool"]', true);
    await until(() => evaluate(`document.querySelector('.skill-description')?.textContent.includes('pre-warmed per worker pod')`), 'Tool description missing');
    await click('.skill-back', true);
    await until(() => evaluate(`document.querySelector('.skill-explorer h3')?.textContent === 'Agent Control Tower'`), 'Back did not restore parent');
    await click('.skill-home', true);
    assert.equal(await evaluate(`document.querySelectorAll('.skill-children button').length`), 5);
  });

  await test('Mobile section menu supports navigation and Escape', async () => {
    await load(320);
    await click('button[aria-controls="section-nav"]', true);
    assert.equal(await evaluate(`document.querySelector('button[aria-controls="section-nav"]').getAttribute('aria-expanded')`), 'true');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    assert.equal(await evaluate(`document.querySelector('button[aria-controls="section-nav"]').getAttribute('aria-expanded')`), 'false');
    await click('button[aria-controls="section-nav"]', true);
    await click('#section-nav a[href="#projects"]', true);
    await until(() => evaluate(`location.hash === '#projects' && document.querySelector('button[aria-controls="section-nav"]').getAttribute('aria-expanded') === 'false'`), 'Navigation did not close menu');
  });

  await test('Minimal mode works, persists, and leaves a readable non-3D CV', async () => {
    await load(390);
    await click('button[aria-label="Minimal mode"]', true);
    await until(() => evaluate(`document.documentElement.dataset.mode === 'minimal'`), 'Minimal mode did not activate');
    assert.equal(await evaluate(`document.querySelectorAll('canvas').length`), 0);
    assert(await evaluate(`document.querySelector('.minimal')?.textContent.includes('University of Wollongong')`));
    assert.equal(await evaluate(`localStorage.getItem('cv-mode')`), 'minimal');
    const previousDocument = await evaluate('performance.timeOrigin');
    await send('Page.reload');
    await until(() => evaluate(`performance.timeOrigin !== ${previousDocument} && !!document.querySelector('.minimal') && !!document.querySelector('button[aria-label="Minimal mode"]')`), 'Minimal preference did not survive reload');
    assert.equal(await evaluate(`document.querySelector('button[aria-label="Minimal mode"]').getAttribute('aria-pressed')`), 'true');
    assert(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.minimal-summary')).fontSize) >= 16`), 'Minimal text is too small');
    await click('button[aria-label="Minimal mode"]', true);
    await until(() => evaluate(`!!document.querySelector('.hero')`), 'Could not return to full view');
  });

  for (const width of [320, 390, 768, 980, 981, 1024, 1100, 1101, 1440]) {
    await test(`Readable layout and touch targets at ${width}px`, async () => {
      await load(width);
      const state = await evaluate(`(() => {
        const visible = el => el.getBoundingClientRect().height > 0;
        const controls = [...document.querySelectorAll('.top button,.top-actions a')].filter(visible);
        const text = [...document.querySelectorAll('.job li,.project p,.stack-items,.cap,.proof td')];
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          smallControls: controls.filter(el => el.getBoundingClientRect().height < 43).map(el => el.getAttribute('aria-label') || el.textContent),
          smallText: text.filter(el => parseFloat(getComputedStyle(el).fontSize) < 14).length,
          errors: window.__uiErrors || []
        };
      })()`);
      assert(state.overflow <= 1, `Horizontal overflow ${state.overflow}px`);
      assert.deepEqual(state.smallControls, [], 'Header has undersized touch targets');
      assert.equal(state.smallText, 0, 'CV content is too small');
      assert.deepEqual(state.errors, []);
    });
  }

  await test('Reduced-motion full view preserves interactive skill access without WebGL', async () => {
    await load(1440, 'full', true);
    assert.equal(await evaluate(`document.querySelectorAll('canvas').length`), 0);
    assert(await evaluate(`!!document.querySelector('.skill-explorer button[data-node-id="platform"]')`), 'Reduced-motion skill access missing');
    await click('.skill-explorer button[data-node-id="platform"]');
    assert(await evaluate(`!!document.querySelector('.skill-explorer button[data-node-id="backend"]')`));
  });

  await test('Skill navigation works with keyboard and restores meaningful focus', async () => {
    await load(768);
    await evaluate(`document.querySelector('.skill-explorer button[data-node-id="platform"]').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
    await until(() => evaluate(`document.querySelector('.skill-explorer h3')?.textContent === 'Platform'`), 'Keyboard selection did not open capability');
    assert.equal(await evaluate(`document.activeElement?.tagName`), 'H3');
    await evaluate(`document.querySelector('.skill-home').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
    await until(() => evaluate(`document.querySelectorAll('.skill-children button').length === 5`), 'Keyboard home did not restore capabilities');
  });

  await test('Mobile decomposition diagram has readable labels', async () => {
    await load(320);
    const sizes = await evaluate(`[...document.querySelectorAll('.diagram text, .diagram .flow-node')].map(el => {
      const matrix = el instanceof SVGElement ? el.getScreenCTM() : null;
      return parseFloat(getComputedStyle(el).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 1);
    })`);
    assert(sizes.length >= 9, 'Decomposition levels missing');
    assert(sizes.every(size => size >= 11), `Diagram label sizes are too small: ${JSON.stringify(sizes)}`);
  });

  await test('Touch skill selection survives a tablet-sized rotation', async () => {
    await load(390);
    await click('.skill-explorer button[data-node-id="agent"]', true);
    await click('.skill-explorer button[data-node-id="control-tower"]', true);
    await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 1, mobile: true });
    await until(() => evaluate(`innerWidth === 1180 && document.querySelector('.skill-explorer h3')?.textContent === 'Agent Control Tower'`), 'Touch selection was lost across breakpoint');
    assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 0);
    assert.equal(await evaluate('document.querySelectorAll(".skill-children button").length'), 16);
  });

  await test('Reading text and mode controls retain contrast on their painted surfaces', async () => {
    for (const mode of ['full', 'minimal']) {
      await load(390, mode);
      await until(() => evaluate(`[...document.querySelectorAll('.rise,.minimal-inner')].every(el=>getComputedStyle(el).opacity === '1')`), 'Entry animation did not settle');
      const failures = await evaluate(`(() => {
        const rgba = value => (value.match(/[\\d.]+/g) || []).map(Number);
        const over = (top, bottom) => top.slice(0,3).map((v,i)=>v*(top[3] ?? 1)+bottom[i]*(1-(top[3] ?? 1)));
        const light = rgb => rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
        return [...document.querySelectorAll('.lede,.job li,.project p,.stack-items,.cap,.proof td,.mode-toggle,.text-link,.minimal-summary,.min-project p,.min-focus-row')].flatMap(el=>{
          if (!el.getBoundingClientRect().height) return [];
          const parents=[]; let parent=el;
          while(parent) { parents.unshift(parent); parent=parent.parentElement; }
          const background=parents.reduce((color,node)=>over(rgba(getComputedStyle(node).backgroundColor),color),[255,255,255]);
          const foreground=over(rgba(getComputedStyle(el).color),background);
          const a=light(foreground), b=light(background);
          const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          return ratio<4.5 ? [{text:el.textContent.trim().slice(0,45),ratio}] : [];
        });
      })()`);
      assert.deepEqual(failures, [], `Low contrast in ${mode}`);
    }
  });

  await test('Short landscape menu can be scrolled to Contact by touch', async () => {
    await load(568, 'full', false, 320);
    await click('button[aria-controls="section-nav"]', true);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 240, y: 265 }] });
    for (let y = 245; y >= 105; y -= 20) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 240, y }] });
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await until(() => evaluate(`document.getElementById('section-nav').scrollTop > 20`), 'Expanded landscape navigation does not scroll', 2000);
    const bounds = await evaluate(`document.querySelector('#section-nav a[href="#contact"]').getBoundingClientRect().toJSON()`);
    assert(bounds.y >= 68 && bounds.bottom <= 320, 'Contact remains outside the usable viewport');
    await click('#section-nav a[href="#contact"]', true);
    assert.equal(await evaluate('location.hash'), '#contact');
  });

  await test('Keyboard opening puts focus into the disclosed navigation', async () => {
    await load(768);
    await evaluate(`document.querySelector('button[aria-controls="section-nav"]').focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
    await until(() => evaluate(`document.activeElement?.getAttribute('href') === '#experience'`), 'Keyboard opening skips navigation links', 2000);
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate(`document.activeElement?.getAttribute('href')`), '#control-tower');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-controls')`), 'section-nav');
  });

  await test('Active navigation follows the settled anchor destination', async () => {
    await load(1440);
    for (const id of ['control-tower', 'projects']) {
      await click(`#section-nav a[href="#${id}"]`);
      // Software GL shader compilation can block the main thread for seconds on first paint.
      await until(() => evaluate(`document.querySelector('#section-nav a[aria-current="location"]')?.getAttribute('href') === '#${id}'`), `Wrong active section after navigating to ${id}`, 6000);
    }
  });

  await test('Contact navigation is active when its short section reaches the page end', async () => {
    await load(1440);
    await click('#section-nav a[href="#contact"]');
    await until(() => evaluate('scrollY + innerHeight >= document.documentElement.scrollHeight - 2'), 'Contact navigation did not reach page end');
    await until(() => evaluate(`document.querySelector('#section-nav a[aria-current="location"]')?.getAttribute('href') === '#contact'`), 'Contact is visible but navigation still highlights another section', 2000);
  });

  await test('Desktop graph drilldown and reset work without development internals', async () => {
    await load(1440);
    await until(() => evaluate(`!!document.querySelector('.scene-label[data-node-id="agent"]')`), 'Desktop graph did not load');
    await click('.scene-label[data-node-id="agent"]');
    await until(() => evaluate(`document.querySelector('.graph-inspector')?.dataset.selectedId === 'agent'`), 'Graph label did not select');
    await click('.gi-list button[data-node-id="control-tower"]');
    await click('.gi-list button[data-node-id="control-tower-warm-agent-pool"]');
    assert(await evaluate(`document.querySelector('.gi-desc').textContent.includes('pre-warmed per worker pod')`));
    await click('[data-graph-reset]');
    await until(() => evaluate(`document.querySelector('.graph-inspector')?.dataset.selectedId === ''`), 'Graph reset did not clear the selection');
    assert.deepEqual(await evaluate('window.__uiErrors'), []);
  });

  await test('Unselected graph labels remain readable during a selection', async () => {
    await load(1440);
    await until(() => evaluate(`!!document.querySelector('.scene-label[data-node-id="agent"]')`), 'Graph did not load');
    await click('.scene-label[data-node-id="agent"]');
    await until(() => evaluate(`!!document.querySelector('.scene-label.is-dim:not(.is-hidden)')`), 'Selection did not distinguish unrelated branches');
    await until(() => evaluate(`[...document.querySelectorAll('.scene-label.is-dim:not(.is-hidden)')].every(el=>{ getComputedStyle(el).opacity; return el.getAnimations().every(animation=>animation.playState !== 'running'); })`), 'Graph label transition did not settle');
    const contrast = await evaluate(`(() => {
      const rgb = value => value.match(/[\\d.]+/g).slice(0,3).map(Number);
      const luminance = color => color.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const background = rgb(getComputedStyle(document.querySelector('.scene-frame')).backgroundColor);
      return [...document.querySelectorAll('.scene-label.is-dim:not(.is-hidden)')].map(el=>{
        const style=getComputedStyle(el), alpha=Number(style.opacity), foreground=rgb(style.color).map((v,i)=>v*alpha+background[i]*(1-alpha));
        const a=luminance(foreground),b=luminance(background);
        return {label:el.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      });
    })()`);
    assert(contrast.every(item=>item.ratio >= 4.5), `Unreadable graph labels: ${JSON.stringify(contrast)}`);
  });

  await test('HTML action downloads the exact standalone CV without leaving the page', async () => {
    await load(390);
    await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: profile });
    const currentUrl = await evaluate('location.href');
    await click('.top a[download]', true);
    const downloaded = path.join(profile, 'Happy-Liang-CV.html');
    await until(() => fs.existsSync(downloaded), 'CV did not download');
    assert.equal(await evaluate('location.href'), currentUrl);
    assert.equal(fs.readFileSync(downloaded, 'utf8'), fs.readFileSync(new URL('../public/Happy-Liang-CV.html', import.meta.url), 'utf8'));
  });

  await test('Visual headline preserves the role as readable text', async () => {
    await load(390);
    assert.equal(await evaluate(`document.querySelector('.hero h1').textContent.trim()`), 'AI Platform & Agent Systems Engineer');
  });

  await test('Refinement uses neutral surfaces and system sans-serif type in both modes', async () => {
    for (const mode of ['full', 'minimal']) {
      await load(390, mode);
      const appearance = await evaluate(`(() => {
        const rgb = value => value.match(/[\\d.]+/g).slice(0,3).map(Number);
        const headings = [...document.querySelectorAll('h1, .hero-emphasis, .sec-title, .stats dd, .minimal-summary, .min-project p, .skill-content h3')];
        return {
          background: rgb(getComputedStyle(document.body).backgroundColor),
          headingColors: [...document.querySelectorAll('h1,.hero-emphasis')].map(el=>rgb(getComputedStyle(el).color)),
          fonts: headings.map(el=>({family:getComputedStyle(el).fontFamily.split(',')[0].replaceAll('"','').trim(),style:getComputedStyle(el).fontStyle}))
        };
      })()`);
      assert(Math.max(...appearance.background)-Math.min(...appearance.background)<=2 && Math.min(...appearance.background)>=248, `Background is tinted: ${JSON.stringify(appearance.background)}`);
      assert(appearance.headingColors.every(rgb=>Math.max(...rgb)<50 && Math.max(...rgb)-Math.min(...rgb)<=8), 'Primary text is not neutral black');
      assert(appearance.fonts.every(font=>font.family==='-apple-system' && font.style==='normal'), `Non-system or italic typography: ${JSON.stringify(appearance.fonts)}`);
      await send('DOM.enable');
      await send('CSS.enable');
      const {root} = await send('DOM.getDocument');
      const {nodeId} = await send('DOM.querySelector', {nodeId:root.nodeId,selector:'h1'});
      const {fonts} = await send('CSS.getPlatformFontsForNode', {nodeId});
      console.log('RENDERED FONT', mode, JSON.stringify(fonts.map(font=>font.familyName)));
    }
  });

  await test('Refinement keeps the closing contact area proportionate', async () => {
    await load(1440);
    const bounds = await evaluate(`({header:document.querySelector('.top').getBoundingClientRect().height,contact:document.querySelector('.contact').getBoundingClientRect().height,email:parseFloat(getComputedStyle(document.querySelector('.contact-actions a')).fontSize),heading:parseFloat(getComputedStyle(document.querySelector('.contact .sec-title')).fontSize)})`);
    assert(bounds.contact <= bounds.header*4.5, `Closing section overwhelms header: ${JSON.stringify(bounds)}`);
    assert(bounds.email <= 18 && bounds.heading <= 28, 'Closing section uses oversized typography');
  });

  await test('Refinement visibly breathes whole sections on downward and upward scroll', async () => {
    const capture = async delta => {
      await evaluate(`(() => {
        window.__sectionFrames=[];window.__sectionDone=false;
        const start=performance.now();
        const frame=now=>{
          const el=document.querySelector('#control-tower > .wrap'),style=getComputedStyle(el);
          const m=style.transform==='none'?new DOMMatrixReadOnly():new DOMMatrixReadOnly(style.transform);
          window.__sectionFrames.push({scale:m.a,y:m.f,opacity:Number(style.opacity),width:el.getBoundingClientRect().width});
          if(now-start<1600)requestAnimationFrame(frame);else window.__sectionDone=true;
        };
        requestAnimationFrame(frame);
      })()`);
      await send('Input.dispatchMouseEvent', {type:'mouseWheel',x:50,y:700,deltaX:0,deltaY:delta});
      await until(()=>evaluate('window.__sectionDone'), 'Section motion did not settle', 4000);
      return evaluate('window.__sectionFrames');
    };
    for (const width of [1440,390]) {
      await load(width);
      for (const direction of ['down','up']) {
        await evaluate(`(() => {const el=document.getElementById('control-tower');window.scrollTo({top:el.offsetTop+${direction==='down'?' - innerHeight - 100':'el.offsetHeight + 120'},behavior:'instant'});})()`);
        await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
        await until(()=>evaluate(`document.querySelector('#control-tower > .wrap').getAnimations().every(animation=>animation.playState !== 'running')`), 'Offscreen transition did not settle');
        const frames=await capture(direction==='down'?440:-440);
        const scales=frames.map(frame=>frame.scale), offsets=frames.map(frame=>frame.y), widths=frames.map(frame=>frame.width);
        const delta={scale:Math.max(...scales)-Math.min(...scales),y:Math.max(...offsets)-Math.min(...offsets),width:Math.max(...widths)-Math.min(...widths),end:frames.at(-1)};
        console.log('SECTION MOTION', width, direction, JSON.stringify(delta));
        assert(delta.scale>=.012 && delta.y>=10 && delta.width>=4, 'Whole-section motion is not perceptible');
        assert(delta.end.scale>=.999 && Math.abs(delta.end.y)<.5 && delta.end.opacity===1, 'Reading state did not settle at full clarity');
      }
    }
  });

  await test('Refinement keeps sections fully visible with reduced motion', async () => {
    await load(390,'full',true);
    await evaluate(`document.getElementById('control-tower').scrollIntoView({behavior:'instant'})`);
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const states=await evaluate(`[...document.querySelectorAll('.section > .wrap')].map(el=>({opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform,animations:el.getAnimations().length}))`);
    assert(states.every(state=>state.opacity==='1' && state.transform==='none' && state.animations===0), `Reduced-motion sections still animate or fade: ${JSON.stringify(states)}`);
  });

  await test('Glass focus follows the reading section without blurring its text', async () => {
    for (const width of [1440,390]) {
      await load(width);
      await evaluate(`window.scrollTo({top:document.getElementById('control-tower').offsetTop-160,behavior:'instant'})`);
      await until(()=>evaluate(`document.getElementById('control-tower').dataset.focused === 'true'`), 'Reading section has no glass focus', 2500);
      await until(()=>evaluate(`document.querySelector('#control-tower > .wrap').getAnimations({subtree:true}).every(a=>a.playState !== 'running')`), 'Glass focus did not settle');
      const state=await evaluate(`(() => {
        const wrap=document.querySelector('#control-tower > .wrap'), material=getComputedStyle(wrap,'::before'), reflection=getComputedStyle(wrap,'::after');
        return {focused:[...document.querySelectorAll('.section[data-focused="true"]')].map(el=>el.id),opacity:Number(material.opacity),backdrop:material.backdropFilter,shadow:material.boxShadow,background:material.backgroundImage,materialHit:material.pointerEvents,reflectionHit:reflection.pointerEvents,textFilter:getComputedStyle(wrap).filter,textOpacity:getComputedStyle(wrap).opacity};
      })()`);
      assert.deepEqual(state.focused,['control-tower']);
      assert(state.opacity>=.99 && state.backdrop.includes('blur(') && state.shadow!=='none', `Glass material missing: ${JSON.stringify(state)}`);
      assert.equal(state.materialHit,'none');assert.equal(state.reflectionHit,'none');
      assert.equal(state.textFilter,'none');assert.equal(state.textOpacity,'1');
      await evaluate(`document.getElementById('decomposer').scrollIntoView({behavior:'instant'})`);
      await until(()=>evaluate(`document.querySelectorAll('.section[data-focused="true"]').length === 1 && document.getElementById('decomposer').dataset.focused === 'true'`), 'Focus did not transfer to the next section');
    }
  });

  await test('Glass reflection responds to scrolling without changing layout', async () => {
    await load(1440);
    await evaluate(`window.scrollTo({top:document.getElementById('experience').offsetTop,behavior:'instant'})`);
    await until(()=>evaluate(`document.getElementById('experience').dataset.focused === 'true'`), 'Experience did not focus', 2500);
    await until(()=>evaluate(`document.querySelector('#experience > .wrap').getAnimations({subtree:true}).every(a=>a.playState !== 'running')`), 'Initial material did not settle');
    const before=await evaluate(`({position:parseFloat(getComputedStyle(document.querySelector('#experience > .wrap'),'::after').backgroundPositionX),height:document.documentElement.scrollHeight})`);
    await evaluate(`window.scrollTo({top:document.getElementById('experience').offsetTop+document.getElementById('experience').offsetHeight*.35,behavior:'instant'})`);
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await until(()=>evaluate(`document.querySelector('#experience > .wrap').getAnimations({subtree:true}).every(a=>a.playState !== 'running')`), 'Scrolled material did not settle');
    const after=await evaluate(`({position:parseFloat(getComputedStyle(document.querySelector('#experience > .wrap'),'::after').backgroundPositionX),height:document.documentElement.scrollHeight})`);
    console.log('GLASS REFLECTION',JSON.stringify({before,after}));
    assert(Math.abs(after.position-before.position)>10, 'Reflection does not move with scroll progress');
    assert.equal(after.height,before.height,'Decorative focus changed the page layout');
  });

  await test('Glass contact focus preserves real touch downloads at the page end', async () => {
    await load(390);
    await evaluate(`window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})`);
    await until(()=>evaluate(`document.getElementById('contact').dataset.focused === 'true' && document.querySelectorAll('.section[data-focused="true"]').length === 1`), 'Short final section does not receive exclusive focus', 2500);
    const downloadPath=path.join(profile,'glass-contact');fs.mkdirSync(downloadPath);
    await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath});
    await click('.contact-actions a[href$="Happy-Liang-CV.html"]',true);
    const file=path.join(downloadPath,'Happy-Liang-CV.html');
    await until(()=>fs.existsSync(file),'Glass overlay intercepted the contact download');
    assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync(new URL('../public/Happy-Liang-CV.html',import.meta.url),'utf8'));
  });

  await test('Glass focus does not change document height at the last section', async () => {
    for (const width of [1440,390]) {
      await load(width);
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      const settled=`[...document.querySelectorAll('.section > .wrap')].every(el=>el.getAnimations({subtree:true}).every(a=>a.playState !== 'running'))`;
      await until(()=>evaluate(settled),'Initial section surfaces did not settle');
      const before=await evaluate('document.documentElement.scrollHeight');
      await evaluate(`window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})`);
      await until(()=>evaluate(`document.getElementById('contact').dataset.focused === 'true'`),'Contact did not focus');
      await until(()=>evaluate(settled),'Final section surface did not settle');
      const after=await evaluate('document.documentElement.scrollHeight');
      assert(Math.abs(after-before)<=1,`Focus changed document height at ${width}px: ${before} -> ${after}`);
    }
  });

  await test('Glass respects reduced motion and reduced transparency', async () => {
    await load(390,'full',true);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-reduced-transparency',value:'reduce'}]});
    await evaluate(`document.getElementById('control-tower').scrollIntoView({behavior:'instant'})`);
    await until(()=>evaluate(`document.getElementById('control-tower').dataset.focused === 'true'`),'Accessible focus state missing',2500);
    const state=await evaluate(`(() => {const el=document.querySelector('#control-tower > .wrap'),s=getComputedStyle(el,'::before');return {backdrop:s.backdropFilter,background:s.backgroundColor,opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform,animations:el.getAnimations({subtree:true}).length};})()`);
    assert.equal(state.backdrop,'none');assert.equal(state.background,'rgb(255, 255, 255)');
    assert.equal(state.opacity,'1');assert.equal(state.transform,'none');assert.equal(state.animations,0);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'},{name:'prefers-reduced-transparency',value:'no-preference'}]});
  });

  await test('Cursor glass follows pointer positions and enlarges its section without reflow', async () => {
    await load(1440);
    await evaluate(`document.getElementById('control-tower').scrollIntoView({behavior:'instant'})`);
    await until(()=>evaluate(`document.querySelector('#control-tower > .wrap').getAnimations({subtree:true}).every(a=>a.playState !== 'running')`),'Section did not settle');
    const before=await evaluate(`(() => {const surface=document.querySelector('#control-tower > .wrap'),p=surface.querySelector('.sec-body > p'),r=p.getBoundingClientRect();return {x:r.x+100,y:r.y+30,width:surface.offsetWidth,height:p.offsetHeight,text:p.textContent,documentHeight:document.documentElement.scrollHeight};})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x,y:before.y});
    await until(()=>evaluate(`document.querySelector('#control-tower > .wrap').dataset.pointer === 'true'`),'Section does not react to the cursor',2000);
    await until(()=>evaluate(`Number(getComputedStyle(document.querySelector('#control-tower .glass-cursor')).opacity) >= .99 && document.querySelector('#control-tower > .wrap').getAnimations({subtree:true}).every(a=>a.playState!=='running')`),'Cursor lens did not settle');
    const first=await evaluate(`(() => {const s=document.querySelector('#control-tower > .wrap'),c=s.querySelector('.glass-cursor'),r=s.getBoundingClientRect(),lens=getComputedStyle(c,'::before'),matrix=new DOMMatrixReadOnly(lens.transform);return {cx:r.x+(matrix.m41+(parseFloat(lens.width)+parseFloat(lens.borderLeftWidth)+parseFloat(lens.borderRightWidth))/2)*r.width/s.offsetWidth,cy:r.y+(matrix.m42+(parseFloat(lens.height)+parseFloat(lens.borderTopWidth)+parseFloat(lens.borderBottomWidth))/2)*r.height/s.offsetHeight,x:parseFloat(s.style.getPropertyValue('--pointer-x')),y:parseFloat(s.style.getPropertyValue('--pointer-y')),scale:r.width/s.offsetWidth,lensWidth:parseFloat(lens.width),backdrop:lens.backdropFilter,shadow:lens.boxShadow,height:s.querySelector('.sec-body > p').offsetHeight,text:s.querySelector('.sec-body > p').textContent,doc:document.documentElement.scrollHeight,pointer:getComputedStyle(c).pointerEvents};})()`);
    assert(first.scale>=1.006 && first.scale<=1.035, `Hover enlargement missing or excessive: ${first.scale}`);
    assert(Math.hypot(first.cx-before.x,first.cy-before.y)<4, `Lens drifted from the cursor during enlargement: ${JSON.stringify({pointer:before,lens:first})}`);
    assert(first.lensWidth>=200 && first.backdrop.includes('blur(') && first.shadow!=='none','Visible glass lens missing');
    assert.equal(first.pointer,'none');assert.equal(first.height,before.height);assert.equal(first.text,before.text);assert.equal(first.doc,before.documentHeight);
    await screenshot('cv-cursor-section.png');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x+240,y:before.y+40});
    await until(()=>evaluate(`parseFloat(document.querySelector('#control-tower > .wrap').style.getPropertyValue('--pointer-x')) > ${first.x+10}`),'Glass does not follow horizontal pointer movement');
    const next=await evaluate(`({x:parseFloat(document.querySelector('#control-tower > .wrap').style.getPropertyValue('--pointer-x')),y:parseFloat(document.querySelector('#control-tower > .wrap').style.getPropertyValue('--pointer-y'))})`);
    assert(next.y>first.y,'Glass does not follow vertical pointer movement');
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:before.x+240,y:before.y+40,deltaX:0,deltaY:180});
    await until(()=>evaluate(`parseFloat(document.querySelector('#control-tower > .wrap').style.getPropertyValue('--pointer-y')) > ${next.y+50}`),'Glass loses the stationary cursor when the page scrolls');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:10});
    await until(()=>evaluate(`!document.querySelector('.glass-surface[data-pointer="true"]')`),'Glass hover state sticks after leaving');
  });

  await test('Cursor highlights technology terms only in the hovered paragraph without changing text metrics', async () => {
    await load(1440);
    const point=await evaluate(`(() => {const p=[...document.querySelectorAll('.project p')].find(el=>el.textContent.includes('Java 21') && el.textContent.includes('React 19'));if(!p)return null;p.dataset.keywordProbe='true';p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return {x:r.x+r.width*.3,y:r.y+r.height*.4,text:p.textContent,height:p.offsetHeight};})()`);
    assert(point,'Existing technology paragraph missing');
    const terms=await evaluate(`[...document.querySelectorAll('[data-keyword-probe] .tech-term')].map(el=>el.textContent)`);
    assert(terms.some(term=>term.includes('Java')) && terms.some(term=>term.includes('React')),'Technology terms are not marked for highlighting');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
    await until(()=>evaluate(`getComputedStyle(document.querySelector('[data-keyword-probe] .tech-term')).boxShadow !== 'none'`),'Paragraph hover does not highlight terms');
    const state=await evaluate(`(() => {const p=document.querySelector('[data-keyword-probe]');return {text:p.textContent,height:p.offsetHeight,interactive:p.querySelectorAll('.tech-term[tabindex],.tech-term a,.tech-term button').length};})()`);
    assert.equal(state.text,point.text);assert.equal(state.height,point.height);assert.equal(state.interactive,0);
    await until(()=>evaluate(`document.querySelector('[data-keyword-probe]').closest('.glass-surface').getAnimations({subtree:true}).every(a=>a.playState!=='running')`),'Keyword hover did not settle');
    await screenshot('cv-cursor-keywords.png');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:10});
    await until(()=>evaluate(`getComputedStyle(document.querySelector('[data-keyword-probe] .tech-term')).boxShadow === 'none'`),'Keyword highlighting sticks after leaving');
  });

  await test('Cursor glass covers the hero without moving the graph and cleans up on mode changes', async () => {
    await load(1440);
    await until(()=>evaluate(`!!document.querySelector('.scene-canvas canvas')`),'Graph did not mount');
    const before=await evaluate(`document.querySelector('.scene-canvas').getBoundingClientRect().toJSON()`);
    const point=await evaluate(`(() => {const r=document.querySelector('.lede').getBoundingClientRect();return {x:r.x+90,y:r.y+30};})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await until(()=>evaluate(`document.querySelector('.hero-copy').dataset.pointer === 'true'`),'Hero paragraph does not react to the cursor',2000);
    await until(()=>evaluate(`document.querySelector('.hero-copy').getAnimations({subtree:true}).every(a=>a.playState!=='running')`),'Hero hover did not settle');
    await screenshot('cv-cursor-hero.png');
    const after=await evaluate(`document.querySelector('.scene-canvas').getBoundingClientRect().toJSON()`);
    assert(Math.abs(after.x-before.x)<=1 && Math.abs(after.y-before.y)<=1 && Math.abs(after.width-before.width)<=1 && Math.abs(after.height-before.height)<=1,'Text hover moved the graph');
    await evaluate(`document.querySelector('.mode-toggle').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r'});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
    await until(()=>evaluate(`!!document.querySelector('.minimal')`),'Minimal did not activate');
    assert.equal(await evaluate(`document.querySelectorAll('.glass-surface[data-pointer="true"]').length`),0);
    const next=await evaluate(`(() => {const r=document.querySelector('.minimal-summary').getBoundingClientRect();return {x:r.x+80,y:r.y+25};})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...next});
    await until(()=>evaluate(`document.querySelector('.minimal-head').dataset.pointer === 'true'`),'Minimal paragraph does not react to the cursor');
  });

  await test('Cursor restores correct hover after text dragging', async () => {
    await load(1440);
    await evaluate(`document.getElementById('control-tower').scrollIntoView({behavior:'instant'})`);
    const point=await evaluate(`(() => {const r=document.querySelector('#control-tower .sec-body > p').getBoundingClientRect();return {x:r.x+80,y:r.y+25};})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await until(()=>evaluate(`document.querySelector('#control-tower > .wrap').dataset.pointer === 'true'`),'Paragraph did not activate');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:point.y,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:20,y:point.y,button:'left',buttons:0,clickCount:1});
    await until(()=>evaluate(`!document.querySelector('.glass-surface[data-pointer="true"]')`),'Glass remains pinned to the drag origin after release',2000);
  });

  await test('Cursor glass remains off for touch and reduced motion', async () => {
    for (const [width,reduced] of [[390,false],[1440,true]]) {
      await load(width,'full',reduced);
      const p=await evaluate(`(() => {const r=document.querySelector('.lede').getBoundingClientRect();return {x:r.x+40,y:r.y+30};})()`);
      if(width===390){
        await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
        await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y-30}]});
        await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      }else await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      assert.equal(await evaluate(`document.querySelectorAll('.glass-surface[data-pointer="true"]').length`),0,'Pointer effects stick on touch or reduced motion');
    }
  });

  await test('CV download targets remain valid in both modes', async () => {
    for (const mode of ['full', 'minimal']) {
      await load(390, mode);
      const links = await evaluate(`[...document.querySelectorAll('a[download]')].map(el => el.href)`);
      assert(links.some(link => link.endsWith('/Happy-Liang-CV.html')));
      assert(links.some(link => link.endsWith('/Happy-Liang-CV.pdf')));
      for (const link of new Set(links)) assert.equal((await fetch(link)).status, 200, link);
    }
  });

  console.log(`UI checks: ${failures} failure(s)`);
  process.exitCode = failures ? 1 : 0;
} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  fs.rmSync(profile, { recursive: true, force: true });
}
