import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null },
});
let failures = 0;
let checks = 0;
const render = (component, props = {}) => renderToStaticMarkup(createElement(component, props));
const escaped = text => renderToStaticMarkup(createElement(Fragment, null, text));
const terms = markup => [...markup.matchAll(/<span class="tech-term">([\s\S]*?)<\/span>/g)].map(match => match[1]);
const withoutTerms = markup => markup.replace(/<span class="tech-term">([\s\S]*?)<\/span>/g, '$1');
const bodies = (markup, tag, attributes = '[^>]*') =>
  [...markup.matchAll(new RegExp(`<${tag}(?=[\\s>])${attributes}>([\\s\\S]*?)</${tag}>`, 'g'))].map(match => match[1]);
const exact = (markup, source) => assert.equal(withoutTerms(markup), escaped(source), 'Visible source text changed');
const includesTerms = (markup, expected) => {
  for (const term of expected) assert(terms(markup).includes(term), `Missing tech-term: ${term}`);
};
const test = async (name, run) => {
  checks++;
  try { await run(); console.log('PASS', name); }
  catch (error) { failures++; console.error('FAIL', name, '-', error.message); }
};
const component = async name => (await server.ssrLoadModule(`/src/components/${name}.tsx`))[name];

try {
  const { default: cv } = await server.ssrLoadModule('/src/data/cv.json');
  const { nodes } = await server.ssrLoadModule('/src/data/knowledgeGraph.ts');

  await test('Hero lede keeps its text and exposes paragraph terms', async () => {
    const html = render(await component('Hero'));
    const [lede] = bodies(html, 'p', ' class="lede rise"[^>]*');
    exact(lede, cv.summary);
    includesTerms(lede, ['AI platform', 'agent platforms']);
  });

  await test('Only the Hero copy receives its first-child glass cursor', async () => {
    const html = render(await component('Hero'));
    assert(/<div class="hero-copy glass-surface"><div class="glass-cursor" aria-hidden="true"><\/div>/.test(html), 'Hero copy is missing its first-child cursor');
    assert.equal((html.match(/class="glass-cursor"/g) ?? []).length, 1);
  });

  await test('Experience bullets and every stack group keep text and expose terms', async () => {
    const html = render(await component('Experience'));
    const bullets = bodies(html, 'li');
    cv.experience.flatMap(job => job.bullets).forEach((text, index) => exact(bullets[index], text));
    includesTerms(bullets.join(''), ['BM25', 'Kotlin', 'Java', 'ReactJS', 'TensorFlow', 'DQN/RL', 'PHP', 'Spring', 'JavaScript', 'microservices']);
    const stacks = bodies(html, 'div', ' class="stack-items"');
    cv.skillGroups.forEach((group, index) => {
      exact(stacks[index], group.items);
      assert(terms(stacks[index]).length > 0, `No stack terms in ${group.label}`);
    });
  });

  await test('ControlTower paragraphs and capability bullets preserve links and markup', async () => {
    const html = render(await component('ControlTower'));
    const paragraphs = bodies(html, 'p');
    exact(paragraphs[0], cv.controlTower.intro);
    includesTerms(paragraphs[0], ['agent platform', 'agent lifecycle', 'warm agent pool', 'knowledge base']);
    assert(withoutTerms(paragraphs[1]).endsWith(` — ${escaped(cv.controlTower.openSource)}`));
    includesTerms(paragraphs[1], ['Java', 'human-in-the-loop']);
    const aria = cv.projects.find(project => project.name === 'aria-conductor');
    assert(paragraphs[1].includes(`<a href="${aria.url}" target="_blank" rel="noopener noreferrer">aria-conductor</a>`));
    includesTerms(bodies(html, 'li', ' class="cap"').join(''), ['Warm agent pool', 'Human-in-the-loop gate', 'Agent lifecycle']);
  });

  await test('Decomposer body exposes technical phrases without touching its diagram', async () => {
    const html = render(await component('Decomposer'));
    const [body] = bodies(html, 'p');
    exact(body, cv.decomposer.body);
    includesTerms(body, ['heartbeat dispatch', 'backpressure', 'observability']);
    assert(!bodies(html, 'figure')[0].includes('tech-term'));
  });

  await test('Observability body and every table description preserve their text', async () => {
    const html = render(await component('Observability'));
    const [body] = bodies(html, 'p');
    exact(body, cv.observability.body);
    includesTerms(body, ['observability', 'Rancher', 'Kubernetes']);
    const cells = bodies(html, 'td');
    cv.observability.scope.forEach((row, index) => {
      exact(cells[index * 2], row.area);
      exact(cells[index * 2 + 1], row.detail);
      assert(terms(cells[index * 2 + 1]).length > 0, `No table terms in ${row.area}`);
    });
    includesTerms(cells.join(''), ['Elasticsearch', 'Filebeat']);
  });

  await test('Projects descriptions preserve text and repository link labels', async () => {
    const html = render(await component('Projects'));
    const paragraphs = bodies(html, 'p');
    cv.projects.forEach((project, index) => exact(paragraphs[index], project.description));
    includesTerms(paragraphs[0], ['agent runtime', 'agent lifecycle']);
    includesTerms(paragraphs[1], ['Java 21', 'React 19']);
    includesTerms(paragraphs[2], ['HTML', 'MCP']);
    assert(bodies(html, 'a').every(link => !link.includes('tech-term')));
    assert(bodies(html, 'h3').every(heading => !heading.includes('tech-term')));
  });

  await test('Contact body marks only the technical phrases', async () => {
    const html = render(await component('Contact'));
    const [body] = bodies(html, 'p');
    exact(body, 'Open to AI platform, agent systems, and observability roles.');
    assert.deepEqual(terms(body), ['AI platform', 'agent systems', 'observability']);
    assert(bodies(html, 'a').every(link => !link.includes('tech-term')));
  });

  await test('Minimal summary, project descriptions and focus items expose terms', async () => {
    const html = render(await component('MinimalView'));
    const [summary] = bodies(html, 'p', ' class="minimal-summary"');
    exact(summary, cv.summary);
    includesTerms(summary, ['AI platform', 'agent platforms']);
    const descriptions = bodies(html, 'p', '');
    cv.projects.slice(0, 4).forEach((project, index) => exact(descriptions[index], project.description));
    includesTerms(descriptions[1], ['Java 21', 'React 19']);
    for (const group of cv.skillGroups) {
      const row = html.split(`<span class="min-focus-label">${group.label}</span><span>`)[1]?.split('</div>')[0];
      assert(row, `Missing focus row ${group.label}`);
      exact(row.slice(0, -'</span>'.length), group.items);
      assert(terms(row).length > 0, `No focus terms in ${group.label}`);
    }
    assert(bodies(html, 'a').every(link => !link.includes('tech-term')));
  });

  await test('Minimal header and all five sections receive first-child glass cursors', async () => {
    const html = render(await component('MinimalView'));
    assert(/<header class="minimal-head glass-surface"><div class="glass-cursor" aria-hidden="true"><\/div>/.test(html), 'Minimal header is missing its first-child cursor');
    assert.equal((html.match(/<section class="min-section glass-surface"[^>]*><div class="glass-cursor" aria-hidden="true"><\/div>/g) ?? []).length, 5);
    assert.equal((html.match(/class="glass-cursor"/g) ?? []).length, 6);
  });

  for (const name of ['GraphInspector', 'SkillExplorer']) {
    await test(`${name} renders actual node descriptions without decorating navigation`, async () => {
      const Component = await component(name);
      const descriptionClass = name === 'GraphInspector' ? 'gi-desc' : 'skill-description';
      for (const node of nodes) {
        const html = render(Component, { selected: node.id, hovered: null, onSelect() {} });
        const [description] = bodies(html, 'p', ` class="${descriptionClass}"`);
        exact(description, node.description);
        if (node.id === 'backend') includesTerms(description, ['Java 21', 'Spring Boot', 'REST', 'OAuth2/OIDC', 'JPA', 'jOOQ']);
        assert(bodies(html, 'button').every(button => !button.includes('tech-term')));
        assert(!html.includes('glass-cursor'));
      }
      if (name === 'GraphInspector') {
        const html = render(Component, { selected: 'platform', hovered: 'backend', onSelect() {} });
        includesTerms(bodies(html, 'p', ' class="gi-desc"')[0], ['Java 21', 'Spring Boot']);
        assert(html.includes('data-selected-id="platform"'));
      }
    });
  }

  const { TechText } = await server.ssrLoadModule('/src/components/TechText.tsx');
  const cases = [
    ['longest matches', 'Java 21 Java JavaScript React 19 React ReactJS Spring Boot/Cloud Spring Boot Spring Cloud Spring', ['Java 21', 'Java', 'JavaScript', 'React 19', 'React', 'ReactJS', 'Spring Boot/Cloud', 'Spring Boot', 'Spring Cloud', 'Spring']],
    ['punctuation and adjacent terms', '(Node.js), REST; Java/React+BM25; JPA/Hibernate OAuth2/OIDC Elasticsearch/Filebeat DQN/RL', ['Node.js', 'REST', 'Java', 'React', 'BM25', 'JPA/Hibernate', 'OAuth2/OIDC', 'Elasticsearch/Filebeat', 'DQN/RL']],
    ['whole-token boundaries and regex punctuation', 'restore RESTful JavaScripted Java21 NodeXjs Node.jsX _Java Java_ préJava Javaé TypeScript2 production framework TypeScript', ['TypeScript']],
    ['case and whitespace', '  sPrInG  bOoT\t&\nREACT 19 — Java\t21  \r\n', ['sPrInG  bOoT', 'REACT 19', 'Java\t21']],
    ['verified prose aliases', 'Kotlin Gradle Maven PHP TensorFlow BM25 JPA Hibernate Elasticsearch Filebeat Node.js OAuth2 OpenID Connect OIDC AI platform agent platform agent platforms agent systems observability microservices', ['Kotlin', 'Gradle', 'Maven', 'PHP', 'TensorFlow', 'BM25', 'JPA', 'Hibernate', 'Elasticsearch', 'Filebeat', 'Node.js', 'OAuth2', 'OpenID Connect', 'OIDC', 'AI platform', 'agent platform', 'agent platforms', 'agent systems', 'observability', 'microservices']],
    ['escaped input is text, not HTML', '<script>alert("Java")</script> & React <img src=x onerror=\'REST\'>', ['Java', 'React', 'REST']],
    ['ordinary nonmatches', 'A production framework for reliable shipping operations.', []],
    ['empty input', '', []],
    ['optional input', undefined, []],
  ];
  for (const [name, text, expected] of cases) {
    await test(`TechText: ${name}`, () => {
      const html = render(TechText, { text });
      exact(html, text);
      assert.deepEqual(terms(html), expected);
      assert(!/<(?:script|img|button|a)\b|tabindex=|onerror=/i.test(html.replace(/&lt;[^]*?&gt;/g, '')));
    });
  }

  await test('TechText derives every core tool label from the real knowledge graph', () => {
    for (const node of nodes.filter(node => node.kind === 'tool')) {
      const html = render(TechText, { text: node.label });
      assert.deepEqual(terms(html), [escaped(node.label)], `Core tool missing: ${node.label}`);
      exact(html, node.label);
    }
  });

  await test('TechText preserves every source-data string and node description', () => {
    const strings = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
    for (const text of [...strings(cv), ...nodes.flatMap(node => [node.label, node.description])]) {
      exact(render(TechText, { text }), text);
    }
  });
} catch (error) {
  failures++;
  console.error('FAIL test setup -', error.message);
} finally {
  await server.close();
}
console.log(`${checks} checks, ${failures} failures`);
process.exitCode = failures ? 1 : 0;
