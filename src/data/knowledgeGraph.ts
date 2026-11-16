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

const capabilityDefs: CapabilityDef[] = [
  {
    id: 'platform',
    label: 'Platform',
    description: '20+ service estate across Java/Spring, Python, React, Kong and Nginx.',
    position: [-2.0, 0.9, 0.2],
    groups: [
      {
        id: 'backend',
        label: 'Backend',
        description: 'Java 21/Spring Boot, Python, REST, auth and messaging across a 20+ service estate.',
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
        description: 'React 19 and TypeScript; htmlcraft CLI, editor and MCP server.',
        tools: ['React 19', 'TypeScript', 'Vite', 'Ant Design', 'Redux Toolkit', 'HTML/CSS']
      },
      {
        id: 'data-integration',
        label: 'Data & integration',
        description: 'Relational and document stores; Kong, Nginx and ADK. EV Charge Log uses idempotent Sheets sync.',
        tools: [
          'PostgreSQL',
          'MySQL/MariaDB',
          'MongoDB',
          'Oracle',
          'H2',
          'SQLite',
          'Kong',
          'Nginx',
          'ADK'
        ]
      }
    ]
  },
  {
    id: 'agent',
    label: 'Agent systems',
    description: 'Agent templates, LLM integration and an approval-gated control tower.',
    position: [2.0, 1.0, -0.2],
    groups: [
      {
        id: 'ai-agents',
        label: 'AI agents',
        description: 'Agent templates, A2A v1.0, AG-UI/SSE, approval gates and agent registration.',
        tools: ['Agent templates', 'Approval gates', 'MCP', 'A2A v1.0', 'AG-UI/SSE', 'Agent registry']
      },
      {
        id: 'llm',
        label: 'LLM',
        description: 'LLM integration and prompt/tool design; LangChain, OpenSandbox. AI Glass uses VLM verification.',
        tools: ['LLM integration', 'Prompt/tool design', 'LangChain', 'OpenSandbox']
      },
      {
        id: 'control-tower',
        label: 'Control Tower',
        description: 'Design owner at OOCL: a warm agent pool for high-volume tasks, with a generic agent platform on top — HITL approval, spec versioning, live status, multi-replica routing, Mongo state and credential proxy. aria-conductor is the open-source simplification.',
        tone: 'pine',
        tools: [
          'HITL approval',
          'Spec versioning',
          'Live agent status',
          'A2A v1.0',
          'Multi-replica routing',
          'Mongo task state',
          'Credential proxy'
        ]
      }
    ]
  },
  {
    id: 'observability',
    label: 'Observability',
    description: 'Metrics, logs and distributed scheduling under production load.',
    position: [2.0, -1.05, 0.25],
    groups: [
      {
        id: 'observability-tools',
        label: 'Observability tools',
        description: 'Grafana, Prometheus, Azure Monitor, Elasticsearch/Filebeat and Metabase.',
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
        description: 'Load and concurrency E2E, rollout verification, zero 5xx and error-rate evidence.',
        tools: [
          'Load E2E',
          'Concurrency E2E',
          'Rollout verification',
          'Zero 5xx',
          'errorRate = 0',
          '6× pool saturation'
        ]
      },
      {
        id: 'distributed',
        label: 'Distributed scheduling',
        description: 'Recursive decomposition, async fan-out, heartbeat dispatch, backpressure and resource-aware scaling.',
        tools: [
          'Recursive decomposition',
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
    description: 'CI/CD, containers and deterministic test harnesses.',
    position: [-2.0, -1.05, -0.15],
    groups: [
      {
        id: 'cicd',
        label: 'CI/CD',
        description: 'Jenkins, GitHub Actions and SonarQube quality gates; OIDC trusted publishing for htmlcraft.',
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
        description: 'Docker, Kubernetes, Rancher, Linux and UAT deploys.',
        tools: ['Docker', 'Kubernetes', 'Rancher', 'Linux', 'UAT deploys']
      },
      {
        id: 'testing-harness',
        label: 'Testing & harness',
        description: 'Playwright, jsdom and deterministic fixtures. aria-conductor harness: 100-read p95 ≈0.9 s, 16-client errorRate=0, 6× pool saturation zero 5xx.',
        tone: 'pine',
        tools: [
          'Playwright',
          'jsdom',
          'Deterministic fixtures',
          'Contract/API/E2E',
          'TOCTOU concurrency test',
          'aria load harness'
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
  description: cv.summary,
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
    description: job.bullets[0],
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
  description: 'OOCL, NTT DATA, Hutchison Ports and InnoNext; BSc Computer Science, University of Wollongong.',
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
