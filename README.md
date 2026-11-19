# cv-3d — Happy LIANG Yee Ching

A live CV for platform and observability engineering roles. The page pairs an editorial
layout with a three-level technical skill graph: 83 tools connect upward through 12 skill
groups and four capabilities to Happy. The content itself is always plain HTML.

- Live URL: https://happyliang12.github.io/cv/
- Static CV / ATS: https://happyliang12.github.io/cv/cv/
- Downloadable HTML CV: https://happyliang12.github.io/cv/Happy-Liang-CV.html
- Plain text: https://happyliang12.github.io/cv/cv.txt
- LLM summary: https://happyliang12.github.io/cv/llms.txt

## Stack

- Vite 8 + React 19 + TypeScript
- React Three Fiber + drei + three (lazy-loaded)
- CSS custom properties, Instrument Sans and IBM Plex Mono
- No analytics, cookies, or third-party scripts

## Commands

```bash
npm ci
npm run dev        # local dev server
npm run build      # typecheck, regenerate /public artifacts, build
npm run preview    # serve dist at http://localhost:4174/
npm run content    # regenerate public/cv/, cv.txt, llms.txt, sitemap, robots
npm run pdf        # regenerate public/Happy-Liang-CV.pdf (needs local Chrome)
npm run check:pdf  # verify public PDF is 2 pages with a clean text layer
APPLICATION_PHONE=... npm run application-pdf  # private application PDF
```

## Content

`src/data/cv.json` is the single source of truth. `npm run build` regenerates:

- `public/cv/index.html` — static, print-ready CV page
- `public/Happy-Liang-CV.html` — standalone downloadable CV with absolute links
- `public/cv.txt`, `public/llms.txt`
- `public/sitemap.xml`, `public/robots.txt`, `.nojekyll`

The public PDF is generated separately with headless Chrome. Run `npm run pdf` after
changing the CV, before building for deployment; it is two pages and excludes the phone
number. Run `npm run check:pdf` to verify page count and text extraction.

For applications, set `APPLICATION_PHONE` and run `npm run application-pdf`. It writes
`private/LIANG-Yee-Ching-Happy-Application-CV.pdf` with the legal name, email, and phone;
`private/` is gitignored and is never deployed. Do not commit the application PDF.

Contact fields live in `src/data/cv.json` under `contact`. The homepage, `/cv/`, and the
public PDF show the email directly; the site publishes no phone number.

## Deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys to GitHub Pages.

1. Create a **public** repository named `cv` under `HappyLiang12`.
2. Push `main`.
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. GitHub Actions builds with Vite base `/cv/`.

The local project folder is `cv-3d`; the public repository and URL are `cv`. Do not deploy
this project into the existing `happyliang12.github.io` repository; that root site is
separate.

## Progressive behaviour

- **Minimal mode** — header switch, persisted in `localStorage`, replaces the full
  portfolio with a condensed, single-column CV and no 3D scene.
  `prefers-reduced-motion: reduce` lands in Minimal mode automatically.
- **No WebGL** — a hierarchical static SVG schematic replaces the scene.
- **Mobile / tablet** — a simplified static schematic instead of a canvas.
- **No JavaScript** — `<noscript>` contains the summary, roles, projects, and links.
- **AI / ATS** — `/cv/`, downloadable HTML, `cv.txt`, `llms.txt`, PDF, and JSON-LD are
  generated from the same JSON as the visual page.

## Skill graph

- **Hover** a node to trace its path to Happy and update the read-only panel.
- **Click** a capability to reveal its skill groups, then a group to reveal its tools.
- **Click** a node again to release it; **click Background** to reveal roles and education.
- **Drag** to orbit; **scroll** to zoom.
- Tool nodes stay compact; the panel lists every tool in a group, and hovering a tool
  reveals its name and full lineage.
- The graph is deliberately **mouse-only**: no graph-level select menu, chips, buttons, or
  keyboard stops. The static CV remains the keyboard and assistive-technology path.
- Project evidence is folded into the skill model: Agent Control Tower sits under Agent systems;
  Testing & harness includes aria-conductor, and the green edge links the two.

## Verification (2026-11-19)

Chromium, production preview. Screenshots in `docs/screenshots/`.

- 1440 / 1024 / 768 / 390 / 320 px: no horizontal overflow, no console errors.
- 1440 px live WebGL skill graph: shaded 3D nodes, four capabilities, six initially visible
  labels, hover path to Happy, tool drill-down, background expansion.
- Graph labels stay mounted and fade between states; inspector detail updates in place without
  stacked layers or clipped text, and rapid hover produces no intermediate inspector titles
  (`scripts/graph-check.mjs`).
- Clicking a node eases the camera toward it and release returns to the overview; the
  selected 1440 px label moved from 162 px to 44 px from the canvas center.
- Mouse-only graph controls verified with `scripts/graph-check.mjs`: inspector has zero
  focusable controls and the canvas has no `tabindex`.
- Minimal mode toggle, persistence, condensed content, hidden section nav, and
  `aria-pressed` checked.
- Reduced motion, WebGL-off fallback, no-JS fallback, static `/cv/` checked.
- Header and contact `CV` actions download `Happy-Liang-CV.html` instead of navigating to
  `/cv/cv/`; the page stays in place, and the download works under the `/cv/` base.
- The downloaded HTML is self-contained with absolute links, `noindex`, and no dependency on
  the site path; it opens correctly outside the deployment.
- Contact email, `/cv/`, downloadable HTML, `cv.txt`, `llms.txt`, and public PDF checked.
- Agent Control Tower is positioned around human decision support, agent execution, and human
  governance; agent lifecycle with queue-based dispatch, advanced human-in-the-loop gates,
  dynamic workflow, dynamic dashboards, knowledge base, active notifications, warm agent pool,
  versioned agent definitions, durable task state, and agent-pod registry are present in the
  summary, OOCL experience, Agent Control Tower copy, project copy, and generated artifacts.
- Job Decomposer copy identifies the core designer, framework-level asynchronous decomposition,
  and the scalability, observability, stability, and robustness goals.
- OOCL experience and core skills include Scrum Master, core technical advisor, CI/CD, clean-code,
  workflow standardisation, and software-factory delivery. Education lists the University of
  Wollongong degree with Distinction and WAM 75.67/100 only; InnoNext is labelled `(HK)`.
- Summary and experience state the container-terminal and shipping operations background and the zero-tolerance requirement for dispatch errors.
- Public PDF is 2 pages with a clean text layer (`npm run check:pdf`), no phone number, and
  no internal system names or stray harness metrics. Its contact line includes the CV,
  LinkedIn, and GitHub URLs. The private application PDF is also 2 pages, with legal name,
  email, phone, and the same URLs.
- GitHub Pages base `/cv/` build served from a subpath: assets and the lazy 3D chunk
  load with the correct prefix; graph interaction check passes.
- Keyboard: skip link activates `#main`; the page shell remains keyboard accessible.
- Lighthouse 12.8.2 (Vite preview, SwiftShader):

| Preset | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop | 100 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms |
| Mobile | 98 | 100 | 100 | 100 | 2.0 s | 0 | 0 ms |

Initial JavaScript is 275 kB raw / 85 kB gzip. The 3D chunk (952 kB raw / 253 kB gzip)
loads only on wide screens (981 px and up) and is not fetched on mobile or in Minimal mode.
The scene mounts without a separate WebGL probe; if the context fails, the static map is
kept and the inspector is hidden.
Run the production graph interaction check with:

```bash
GITHUB_ACTIONS=true npm run build
GITHUB_ACTIONS=true npm run preview
node --experimental-websocket scripts/graph-check.mjs http://localhost:4174/cv/
```

### Screenshots

- `docs/screenshots/desktop-hero.png`
- `docs/screenshots/desktop-graph-capability.png`
- `docs/screenshots/desktop-graph-tool.png`
- `docs/screenshots/desktop-contact.png`
- `docs/screenshots/tablet-768.png`
- `docs/screenshots/mobile-390.png`
- `docs/screenshots/mobile-320.png`
- `docs/screenshots/desktop-minimal.png`
- `docs/screenshots/mobile-minimal.png`
- `docs/screenshots/desktop-no-webgl.png`
- `docs/screenshots/desktop-reduced-full.png`
- `docs/screenshots/cv-static.png`

## Known limitations

- The 3D scene is a schematic skill graph, not live data.
- The graph has no keyboard interaction by design; use the static CV or Minimal mode for
  keyboard and assistive-technology access.
- The application PDF is generated locally under ignored `private/`; it is not published.
- GitHub Pages performance may differ from the local Lighthouse run.
