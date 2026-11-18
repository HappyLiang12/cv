import cv from './cv.json';

export type KnowledgeKind =
  | 'self'
  | 'capability'
  | 'group'
  | 'tool'
  | 'background'
  | 'role'
  | 'education';

export type KnowledgeNode = {
  id: string;
  label: string;
  kind: KnowledgeKind;
  parent?: string;
  meta?: string;
  description?: string;
  tone: 'pine' | 'ink' | 'muted';
  size: number;
  position?: Vec3;
};

export type Vec3 = [number, number, number];

type GroupDef = {
  id: string;
  label: string;
  description: string;
  tone?: 'pine' | 'ink' | 'muted';
  tools: string[];
};

type CapabilityDef = {
  id: string;
  label: string;
  description: string;
  position: Vec3;
  groups: GroupDef[];
};

const toolContext: Record<string, string> = {
  backend: 'OOCL platform',
  frontend: 'OOCL & htmlcraft',
  'data-integration': 'OOCL platform',
  'ai-agents': 'Agent Control Tower',
  llm: 'Agent projects & prototypes',
  'control-tower': 'Agent Control Tower',
  'observability-tools': 'OOCL production',
  reliability: 'Release checks',
  distributed: 'Job decomposer',
  cicd: 'Platform engineering',
  containers: 'Platform engineering',
  'testing-harness': 'aria-conductor & OOCL'
};

const toolNotes: Record<string, string> = {
  'Java 21': 'Primary backend language for the 30+ service platform.',
  'Spring Boot/Cloud': 'Service framework for REST APIs, configuration, and service-to-service calls.',
  'JPA/Hibernate': 'Relational persistence for transactional services.',
  jOOQ: 'Typed SQL for complex queries alongside JPA.',
  REST: 'API contracts between platform services and React UIs.',
  'OAuth2/OIDC': 'OpenID Connect (OIDC) on OAuth2 for authentication and single sign-on.',
  ABAC: 'Attribute-based access control for operator actions.',
  RabbitMQ: 'Asynchronous messaging and fan-out between services.',
  Python: 'Services and tooling; Flask APIs and data scripts.',
  'React 19': 'Operator dashboards and the htmlcraft editor.',
  TypeScript: 'Typed frontend and Node tooling, including the MCP server.',
  Vite: 'Build tooling for React apps and this CV site.',
  'Ant Design': 'Enterprise UI components for operator dashboards.',
  'Redux Toolkit': 'State management for complex React workflows.',
  'HTML/CSS': 'Semantic HTML and CSS for this site and single-file decks.',
  PostgreSQL: 'Primary relational store for platform services.',
  'MySQL/MariaDB': 'Relational stores for services and local stacks.',
  MongoDB: 'Task and thread state for the Agent Control Tower and aria-conductor.',
  Oracle: 'Working knowledge; legacy integration.',
  H2: 'In-memory database for tests and local runs.',
  SQLite: 'Lightweight local storage and test fixtures.',
  Kong: 'API gateway for the 30+ service platform.',
  Nginx: 'Reverse proxy and static file serving.',
  'Agent runtime': 'Self-built agent runtime and agent core for the Agent Control Tower.',
  'Agent templates': 'Reusable scaffolds for LLM-backed agents.',
  'Agent profiles': 'Named overlays in the self-built agent runtime that define model, prompt, tools, agents, and skills.',
  'Agent lifecycle': 'Draft, active, retiring, and retired states.',
  'Agent task queue': 'Queues and dispatches agent tasks across available workers.',
  'Warm agent pool': 'A pool of agent profiles pre-warmed per worker pod, lazily loaded and capped per replica.',
  'Agent-generated dashboard': 'Agent-generated views built from declarative queries.',
  'Human-in-the-loop': 'A person reviews and approves an agent action before it executes.',
  MCP: 'Tool interface used by agents and the htmlcraft MCP server.',
  A2A: 'Agent-to-agent protocol used by the Agent Control Tower.',
  'AG-UI/SSE': 'Streams agent UI events to operator dashboards.',
  'Agent-pod registry': 'Self-built registry of agent pods and loaded profiles.',
  'LLM integration': 'Wiring LLM calls into platform services and agents.',
  'Prompt/tool design': 'Prompts and tool schemas for reliable agent behavior.',
  LangChain: 'LLM orchestration used in prototypes.',
  OpenSandbox: 'Per-agent sandbox containers in aria-conductor.',
  'Knowledge base': 'Shared, versioned knowledge for agent tasks.',
  'Self-improvement pipeline': 'Turns run feedback into agent updates.',
  'Dynamic workflow': 'Workflows defined and changed at runtime.',
  'Active notification system': 'Pushes agent and workflow events to operators.',
  'Dynamic dashboard': 'Live operator views built from current agent status.',
  'Human-in-the-loop gate': 'Review and approve pending agent actions before they run.',
  'Versioned agent definitions': 'Every change to an agent definition is versioned.',
  'Live state tracking': 'Per-agent state and current work in the operator UI.',
  'Multi-replica routing': 'Routes agent tasks across replica workers.',
  'Durable task state': 'Task and thread state persisted for recovery.',
  'Credential proxy': 'Brokers credentials so agents do not hold secrets.',
  Grafana: 'Dashboards for service health and latency.',
  Prometheus: 'Metrics collection and alerting on Kubernetes.',
  'Azure Monitor': 'Cloud monitoring for Azure-hosted services.',
  'Elasticsearch/Filebeat': 'Log shipping and search for production services.',
  Metabase: 'Operational reporting and BI.',
  'p50/p95 latency': 'Latency instrumentation for APIs and releases.',
  'Load E2E': 'End-to-end load tests before release.',
  'Concurrency E2E': 'Concurrent workflow tests, including approval races.',
  'Rollout verification': 'Post-deploy health and metrics checks.',
  'Job → task → sub-task': 'Recursive decomposition across N levels.',
  'Async fan-out': 'Dispatches work over asynchronous messaging.',
  'Heartbeat dispatch': 'Keeps dispatching while workers are alive.',
  Backpressure: 'Respects queue limits so large jobs do not stall.',
  'Resource-aware scaling': 'Scales workers from config or available resources.',
  Jenkins: 'CI/CD pipelines for build, test, and deploy.',
  'GitHub Actions': 'CI and publishing, including OIDC for htmlcraft.',
  SonarQube: 'Static analysis and quality gates.',
  'CI quality gates': 'Builds fail on analysis or test regressions.',
  'OIDC trusted publishing': 'npm publishing from GitHub Actions without stored tokens.',
  Docker: 'Local stacks and service images.',
  Kubernetes: 'Container orchestration for UAT and production.',
  Rancher: 'Kubernetes management for the platform.',
  Linux: 'Primary runtime for services and tooling.',
  'UAT deploys': 'Deploy and verify user-acceptance environments.',
  Playwright: 'Browser E2E tests for UI flows.',
  jsdom: 'DOM-level tests for UI modules.',
  'Deterministic fixtures': 'Repeatable test data for E2E and integration.',
  'Contract/API/E2E': 'Contract, API, and end-to-end test coverage.',
  'Concurrency test': 'Reproduces racing approvals under load.',
  'aria-conductor harness': 'Load and concurrency harness for aria-conductor.'
};

const roleNotes: Record<string, string> = {
  OOCL: 'Design owner of the Agent Control Tower: self-built agent runtime and agent core, warm agent pool, agent lifecycle, and dashboards; production observability, CI/CD, and platform correctness for an estate of 30+ services.',
  'NTT DATA': 'Full-stack development and system revamp; microservices migration and Jenkins CI/CD.',
  'Hutchison Ports': 'Asynchronous microservices for port automation; TensorFlow DQN/RL proof of concept.',
  'InnoNext (HK)': 'Web applications with PHP, Spring, and JavaScript.'
};

const educationNotes: Record<string, string> = {
  'University of Wollongong': 'Bachelor of Computer Science with Distinction (WAM 75.67/100), 2018–2019.'
};


const capabilityDefs: CapabilityDef[] = [
  {
    id: 'platform',
    label: 'Platform',
    description: '30+ services across 32 repositories: Java/Spring, Python, React, Kong and Nginx. System analysis, microservice migration, shared libraries, and API contracts.',
    position: [-2.0, 0.9, 0.2],
    groups: [
      {
        id: 'backend',
        label: 'Backend',
        description: 'Java 21/Spring Boot services for the 30+ service platform: REST APIs, OAuth2/OIDC, ABAC, optimistic locking, RabbitMQ, and JPA + jOOQ.',
        tools: [
          'Java 21',
          'Spring Boot/Cloud',
          'JPA/Hibernate',
          'jOOQ',
          'REST',
          'OAuth2/OIDC',
          'ABAC',
          'RabbitMQ',
          'Python'
        ]
      },
      {
        id: 'frontend',
        label: 'Frontend',
        description: 'React 19 and TypeScript dashboards; htmlcraft visual editor; Ant Design and Redux Toolkit in operator UIs.',
        tools: ['React 19', 'TypeScript', 'Vite', 'Ant Design', 'Redux Toolkit', 'HTML/CSS']
      },
      {
        id: 'data-integration',
        label: 'Data & integration',
        description: 'Relational and document stores; Kong and Nginx. EV Charge Log uses idempotent Google Sheets sync.',
        tools: [
          'PostgreSQL',
          'MySQL/MariaDB',
          'MongoDB',
          'Oracle',
          'H2',
          'SQLite',
          'Kong',
          'Nginx'
        ]
      }
    ]
  },
  {
    id: 'agent',
    label: 'Agent systems',
    description: 'Agent profiles, LLM integration, and the Agent Control Tower: agent task queue, agent lifecycle, warm agent pool, self-improvement, knowledge base, dynamic workflow, active notifications, human-in-the-loop control, live state, versioned agent definitions, and agent-generated dashboards.',
    position: [2.0, 1.0, -0.2],
    groups: [
      {
        id: 'ai-agents',
        label: 'AI agents',
        description: 'Self-built agent runtime, agent profiles and lifecycle, agent task queue, human-in-the-loop control, active notifications, MCP, A2A, AG-UI/SSE, and a self-built agent-pod registry.',
        tools: ['Agent runtime', 'Agent profiles', 'Agent lifecycle', 'Human-in-the-loop', 'Active notification system', 'MCP', 'A2A', 'AG-UI/SSE', 'Agent-pod registry']
      },
      {
        id: 'llm',
        label: 'LLM',
        description: 'LLM integration and prompt/tool design; LangChain and OpenSandbox. AI Glass uses VLM verification.',
        tools: ['LLM integration', 'Prompt/tool design', 'LangChain', 'OpenSandbox']
      },
      {
        id: 'control-tower',
        label: 'Agent Control Tower',
        description: 'Design owner at OOCL: a self-built agent runtime and agent core, with an agent task queue, a warm agent pool, full agent lifecycle, self-improvement pipeline, knowledge base, dynamic workflow, an active notification system, human-in-the-loop control, live state, versioned agent definitions, agent-generated dashboards, multi-replica routing, durable task state, a self-built agent-pod registry, and a credential proxy. aria-conductor is the open-source simplification.',
        tone: 'pine',
        tools: [
          'Agent lifecycle',
          'Agent task queue',
          'Warm agent pool',
          'Self-improvement pipeline',
          'Knowledge base',
          'Dynamic workflow',
          'Active notification system',
          'Agent-generated dashboard',
          'Human-in-the-loop gate',
          'Versioned agent definitions',
          'Live state tracking',
          'A2A',
          'Multi-replica routing',
          'Durable task state',
          'Agent-pod registry',
          'Credential proxy'
        ]
      }
    ]
  },
  {
    id: 'observability',
    label: 'Observability',
    description: 'Metrics, logs, cloud monitoring, and release checks for a 30+ service platform.',
    position: [2.0, -1.05, 0.25],
    groups: [
      {
        id: 'observability-tools',
        label: 'Observability tools',
        description: 'Grafana dashboards, Prometheus metrics, Azure Monitor, Elasticsearch/Filebeat logs, Metabase reporting, and p50/p95 latency.',
        tools: [
          'Grafana',
          'Prometheus',
          'Azure Monitor',
          'Elasticsearch/Filebeat',
          'Metabase',
          'p50/p95 latency'
        ]
      },
      {
        id: 'reliability',
        label: 'Reliability',
        description: 'Load and concurrency E2E, rollout verification, and release checks before production.',
        tools: [
          'Load E2E',
          'Concurrency E2E',
          'Rollout verification'
        ]
      },
      {
        id: 'distributed',
        label: 'Distributed scheduling',
        description: 'Recursive job → task → sub-task decomposition across N levels, async fan-out, heartbeat dispatch, backpressure, and resource-aware scaling.',
        tools: [
          'Job → task → sub-task',
          'Async fan-out',
          'Heartbeat dispatch',
          'Backpressure',
          'Resource-aware scaling'
        ]
      }
    ]
  },
  {
    id: 'delivery',
    label: 'Delivery & ops',
    description: 'CI/CD, containers, and test harnesses for an estate of 30+ services and open-source projects.',
    position: [-2.0, -1.05, -0.15],
    groups: [
      {
        id: 'cicd',
        label: 'CI/CD',
        description: 'Jenkins pipelines, GitHub Actions, SonarQube quality gates, and OIDC trusted publishing for htmlcraft.',
        tools: [
          'Jenkins',
          'GitHub Actions',
          'SonarQube',
          'CI quality gates',
          'OIDC trusted publishing'
        ]
      },
      {
        id: 'containers',
        label: 'Containers & runtime',
        description: 'Docker, Kubernetes, Rancher, Linux, and UAT deploys.',
        tools: ['Docker', 'Kubernetes', 'Rancher', 'Linux', 'UAT deploys']
      },
      {
        id: 'testing-harness',
        label: 'Testing & harness',
        description: 'Playwright, jsdom, deterministic fixtures, and contract/API/E2E tests. aria-conductor includes a concurrency harness for approval races.',
        tone: 'pine',
        tools: [
          'Playwright',
          'jsdom',
          'Deterministic fixtures',
          'Contract/API/E2E',
          'Concurrency test',
          'aria-conductor harness'
        ]
      }
    ]
  }
];

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const self: KnowledgeNode = {
  id: 'happy',
  label: 'Happy',
  kind: 'self',
  meta: cv.role,
  description: 'AI platform engineer with 7+ years on production systems. Design owner of the Agent Control Tower: self-built agent runtime and agent core, warm agent pool, agent lifecycle, and agent-generated dashboards; production observability across an estate of 30+ services.',
  tone: 'pine',
  size: 0.36,
  position: [0, 0, 0]
};

const capabilities: KnowledgeNode[] = capabilityDefs.map(def => ({
  id: def.id,
  label: def.label,
  kind: 'capability',
  parent: 'happy',
  meta: `${def.groups.length} skill groups`,
  description: def.description,
  tone: 'ink',
  size: 0.22,
  position: def.position
}));

const groups: KnowledgeNode[] = [];
const tools: KnowledgeNode[] = [];

capabilityDefs.forEach(def => {
  const capability = capabilities.find(node => node.id === def.id)!;
  const [cx, cy, cz] = capability.position!;
  const outward = Math.atan2(cy, cx);
  def.groups.forEach((groupDef, index) => {
    const angle = outward + (index - (def.groups.length - 1) / 2) * 0.78;
    const group: KnowledgeNode = {
      id: groupDef.id,
      label: groupDef.label,
      kind: 'group',
      parent: def.id,
      meta: `${groupDef.tools.length} tools`,
      description: groupDef.description,
      tone: groupDef.tone ?? 'ink',
      size: 0.125,
      position: [
        cx + Math.cos(angle) * 0.95,
        cy + Math.sin(angle) * 0.95,
        cz + (index % 2 === 0 ? 0.16 : -0.12)
      ]
    };
    groups.push(group);

    const [gx, gy, gz] = group.position!;
    const groupOutward = Math.atan2(gy, gx);
    groupDef.tools.forEach((label, toolIndex) => {
      const toolAngle =
        groupOutward +
        (toolIndex - (groupDef.tools.length - 1) / 2) *
          (groupDef.tools.length > 1 ? 2.15 / (groupDef.tools.length - 1) : 0);
      const radius = 0.74;
      tools.push({
        id: `${group.id}-${slug(label)}`,
        label,
        kind: 'tool',
        parent: group.id,
        meta: toolContext[group.id] ?? groupDef.label,
        description: toolNotes[label] ?? groupDef.description,
        tone: 'muted',
        size: 0.078,
        position: [
          gx + Math.cos(toolAngle) * radius,
          gy + Math.sin(toolAngle) * radius,
          gz + (toolIndex % 3 - 1) * 0.05
        ]
      });
    });
  });
});

const backgroundChildren: KnowledgeNode[] = [
  ...cv.experience.map((job, index) => ({
    id: `role-${slug(job.company)}`,
    label: job.company,
    kind: 'role' as const,
    parent: 'background',
    meta: `${job.role} · ${job.period}`,
    description: roleNotes[job.company] ?? job.bullets[0],
    tone: 'muted' as const,
    size: 0.07,
    position: [
      (index - (cv.experience.length - 1) / 2) * 0.6,
      -2.72,
      0.15 + (index % 2 === 0 ? 0.12 : -0.1)
    ] as Vec3
  })),
  ...cv.education.map((item, index) => ({
    id: `education-${slug(item.school)}`,
    label: item.school,
    kind: 'education' as const,
    parent: 'background',
    meta: `${item.degree} · ${item.period}`,
    description: educationNotes[item.school] ?? `${item.degree} — ${item.school} (${item.period})`,
    tone: 'muted' as const,
    size: 0.07,
    position: [
      (index - (cv.education.length - 1) / 2) * 0.7,
      -2.95,
      0.2 + (index % 2 === 0 ? 0.15 : -0.05)
    ] as Vec3
  }))
];

const background: KnowledgeNode = {
  id: 'background',
  label: 'Background',
  kind: 'background',
  parent: 'happy',
  meta: 'Experience & education',
  description: 'OOCL, NTT DATA, Hutchison Ports, InnoNext; BSc Computer Science with Distinction, University of Wollongong (WAM 75.67/100).',
  tone: 'muted',
  size: 0.17,
  position: [0, -2.55, 0.2]
};

export const nodes: KnowledgeNode[] = [
  self,
  ...capabilities,
  ...groups,
  ...tools,
  background,
  ...backgroundChildren
];

export const nodeById = new Map(nodes.map(node => [node.id, node]));

export const baseNodes: KnowledgeNode[] = [
  self,
  ...capabilities,
  ...groups,
  background
];

export const childrenById = new Map<string, KnowledgeNode[]>();
nodes.forEach(node => {
  if (!node.parent) return;
  const list = childrenById.get(node.parent) ?? [];
  list.push(node);
  childrenById.set(node.parent, list);
});

export const baseEdges: [string, string][] = [
  ...capabilities.map(capability => ['happy', capability.id] as [string, string]),
  ['happy', 'background'],
  ...groups.map(group => [group.parent!, group.id] as [string, string])
];

export const crossEdges: [string, string][] = [
  ['control-tower', 'testing-harness'],
  ['llm', 'testing-harness'],
  ['distributed', 'control-tower'],
  ['cicd', 'backend'],
  ['frontend', 'testing-harness'],
  ['observability-tools', 'containers'],
  ['background', 'control-tower'],
  ['data-integration', 'backend'],
  ['ai-agents', 'llm']
];

export const accentEdges: [string, string][] = [
  ['control-tower', 'testing-harness']
];

export const adjacency = new Map<string, Set<string>>();
[...baseEdges, ...crossEdges].forEach(([a, b]) => {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)!.add(b);
  adjacency.get(b)!.add(a);
});

export function pathToRoot(id: string): KnowledgeNode[] {
  const path: KnowledgeNode[] = [];
  let node = nodeById.get(id);
  while (node) {
    path.push(node);
    node = node.parent ? nodeById.get(node.parent) : undefined;
  }
  return path;
}

export const toolCount = tools.length;
export const groupCount = groups.length;
export const capabilityCount = capabilities.length;
