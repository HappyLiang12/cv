import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, Html, OrbitControls } from '@react-three/drei';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  accentEdges,
  adjacency,
  baseEdges,
  baseNodes,
  childrenById,
  crossEdges,
  nodeById,
  pathToRoot,
  type KnowledgeNode,
  type Vec3
} from '../data/knowledgeGraph';

type SceneProps = {
  paused: boolean;
  selected: string | null;
  hovered: string | null;
  wide: boolean;
  resetKey?: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
};

type FocusTween = {
  startedAt: number;
  duration: number;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
};

function labelOffsetY(node: KnowledgeNode) {
  if (node.kind === 'self') return node.size + 0.34;
  if (node.kind === 'capability') return node.size + 0.27;
  if (node.kind === 'background') return node.size + 0.25;
  if (node.kind === 'group') return node.size + 0.23;
  return node.size + 0.2;
}

function Label({
  node,
  dim,
  visible,
  selected,
  onHover,
  onSelect
}: {
  node: KnowledgeNode;
  dim: boolean;
  visible: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const [x, y, z] = node.position!;
  const [inViewport, setInViewport] = useState(false);
  const viewport = useRef(false);
  const labelElement = useRef<HTMLElement | null>(null);
  const dimensions = useRef({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const anchor = useMemo(() => new THREE.Vector3(x, y + labelOffsetY(node), z + 0.08), [node, x, y, z]);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const bindLabel = useCallback((element: HTMLElement | null) => {
    labelElement.current = element;
    observer.current?.disconnect();
    if (!element) return;
    const measure = () => { dimensions.current = { width: element.offsetWidth, height: element.offsetHeight }; };
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(element);
  }, []);

  useFrame(({ camera, size }) => {
    projected.copy(anchor).project(camera);
    const cx = (projected.x + 1) * size.width / 2;
    const cy = (1 - projected.y) * size.height / 2;
    const halfWidth = dimensions.current.width / 2 + 8;
    const halfHeight = dimensions.current.height / 2 + 8;
    const inside = dimensions.current.width > 0 && projected.z >= -1 && projected.z <= 1 &&
      cx >= halfWidth && cx + halfWidth <= size.width && cy >= halfHeight && cy + halfHeight <= size.height;
    if (inside !== viewport.current) {
      viewport.current = inside;
      setInViewport(inside);
    }
  });

  const shown = visible && inViewport;
  useLayoutEffect(() => {
    if (!shown && labelElement.current === document.activeElement) {
      document.getElementById('graph-detail')?.focus({ preventScroll: true });
    }
  }, [shown]);
  const className = `scene-label scene-label-${node.kind}${dim ? ' is-dim' : ''}${shown ? '' : ' is-hidden'}`;
  return (
    <Html
      center
      position={[x, y + labelOffsetY(node), z + 0.08]}
      zIndexRange={[4, 0]}
      pointerEvents="none"
      style={{ pointerEvents: 'none' }}
    >
      {node.kind === 'tool' ? (
        <span ref={bindLabel} className={className} data-node-id={node.id} tabIndex={-1} aria-hidden="true" style={{ pointerEvents: 'none' }}>
          {node.label}
        </span>
      ) : (
        <button
          ref={bindLabel}
          type="button"
          className={className}
          data-node-id={node.id}
          tabIndex={shown ? 0 : -1}
          aria-hidden={!shown}
          aria-pressed={selected}
          aria-controls="graph-detail"
          style={{ pointerEvents: shown ? 'auto' : 'none' }}
          onPointerEnter={() => onHover(node.id)}
          onPointerLeave={() => onHover(null)}
          onPointerCancel={() => onHover(null)}
          onPointerDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation();
            onSelect(node.id);
          }}
        >
          {node.label}
        </button>
      )}
    </Html>
  );
}

function geometryFor(node: KnowledgeNode) {
  if (node.kind === 'self' || node.kind === 'background') {
    return <icosahedronGeometry args={[node.size, 0]} />;
  }
  if (node.kind === 'capability') return <octahedronGeometry args={[node.size, 0]} />;
  if (node.kind === 'group') return <octahedronGeometry args={[node.size, 0]} />;
  return <tetrahedronGeometry args={[node.size, 0]} />;
}

function colorFor(node: KnowledgeNode) {
  if (node.tone === 'pine') return '#355b48';
  if (node.tone === 'muted') return '#8b8a79';
  return '#4b5145';
}

function NodeMesh({
  node,
  dim,
  active,
  selected,
  onHover,
  onSelect
}: {
  node: KnowledgeNode;
  dim: boolean;
  active: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshLambertMaterial>(null);
  const target = selected ? 1.28 : active ? 1.14 : 1;
  const opacity = dim ? 0.3 : node.tone === 'muted' ? 0.78 : 1;

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.scale.setScalar(
      THREE.MathUtils.damp(mesh.current.scale.x, target, 8, delta)
    );
    if (material.current) {
      material.current.opacity = THREE.MathUtils.damp(
        material.current.opacity,
        opacity,
        10,
        delta
      );
    }
  });

  return (
    <group position={node.position!}>
      <mesh ref={mesh} scale={0.05}>
        {geometryFor(node)}
        <meshLambertMaterial
          ref={material}
          color={colorFor(node)}
          flatShading
          transparent
          opacity={0}
        />
      </mesh>
      <mesh
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHover(node.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        <sphereGeometry args={[Math.max(node.size * 2.6, 0.27), 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function ChildNode({
  node,
  dim,
  active,
  onHover,
  onSelect
}: {
  node: KnowledgeNode;
  dim: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshLambertMaterial>(null);
  const opacity = dim ? 0.26 : 0.92;

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.scale.setScalar(
      THREE.MathUtils.damp(mesh.current.scale.x, active ? 1.2 : 1, 10, delta)
    );
    if (material.current) {
      material.current.opacity = THREE.MathUtils.damp(
        material.current.opacity,
        opacity,
        10,
        delta
      );
    }
  });

  return (
    <group position={node.position!}>
      <mesh ref={mesh} scale={0.05}>
        <tetrahedronGeometry args={[node.size, 0]} />
        <meshLambertMaterial
          ref={material}
          color={colorFor(node)}
          flatShading
          transparent
          opacity={0}
        />
      </mesh>
      <mesh
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHover(node.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        {/* Small hit targets avoid overlap; text controls allow precise selection. */}
        <sphereGeometry args={[node.kind === 'tool' ? node.size * 0.6 : Math.max(node.size * 2.9, 0.19), 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

function toLinePositions(pairs: [Vec3, Vec3][]) {
  const positions = new Float32Array(pairs.length * 6);
  pairs.forEach(([a, b], index) => {
    positions.set(a, index * 6);
    positions.set(b, index * 6 + 3);
  });
  return positions;
}

function LevelRings() {
  const pairs = useMemo(() => {
    const result: [Vec3, Vec3][] = [];
    [2.0, 2.95].forEach((radius, ringIndex) => {
      const segments = 96;
      for (let index = 0; index < segments; index += 1) {
        const a = (index / segments) * Math.PI * 2;
        const b = ((index + 1) / segments) * Math.PI * 2;
        result.push([
          [Math.cos(a) * radius, Math.sin(a) * radius, -0.25 - ringIndex * 0.02],
          [Math.cos(b) * radius, Math.sin(b) * radius, -0.25 - ringIndex * 0.02]
        ]);
      }
    });
    return result;
  }, []);

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[toLinePositions(pairs), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#d4d4cd" transparent opacity={0.45} depthWrite={false} />
    </lineSegments>
  );
}

function Edges({ edges, accent }: { edges: [Vec3, Vec3][]; accent?: boolean }) {
  if (edges.length === 0) return null;
  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[toLinePositions(edges), 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={accent ? '#355b48' : '#b8b8b1'}
        transparent
        opacity={accent ? 0.72 : 0.44}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function SelectionHalo({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[0.4, 0.006, 8, 64]} />
        <meshBasicMaterial color="#355b48" transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.8, 0.2, 0]}>
        <torusGeometry args={[0.54, 0.004, 8, 64]} />
        <meshBasicMaterial color="#355b48" transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CoreRings() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[1.1, 0.3, 0.2]}>
        <torusGeometry args={[0.57, 0.005, 8, 64]} />
        <meshBasicMaterial color="#355b48" transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[0.6, -0.4, 0.8]}>
        <torusGeometry args={[0.78, 0.004, 8, 64]} />
        <meshBasicMaterial color="#355b48" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function SceneContents({ selected, hovered, wide, resetKey = 0, onHover, onSelect }: Omit<SceneProps, 'paused'>) {
  const orbit = useRef<OrbitControlsImpl>(null);
  const focusTween = useRef<FocusTween | null>(null);
  const camera = useThree(state => state.camera);
  const active = hovered ?? selected;
  const selectedNode = selected ? nodeById.get(selected) : undefined;
  const lastFocus = useRef({ selected, resetKey });
  const initialTarget = useMemo(() => new THREE.Vector3(0, -0.1, 0), []);

  useEffect(() => {
    if (selected === lastFocus.current.selected && resetKey === lastFocus.current.resetKey) return;
    lastFocus.current = { selected, resetKey };
    if (!orbit.current) return;

    const targetNode = selected ? nodeById.get(selected) : undefined;
    const toTarget = new THREE.Vector3(...(targetNode?.position ?? [0, -0.1, 0]));
    const offset = camera.position.clone().sub(orbit.current.target);
    if (offset.lengthSq() < 0.0001) offset.set(0.3, 0.9, 12);
    offset.setLength(targetNode ? 8.4 : 12);

    focusTween.current = {
      startedAt: performance.now(),
      duration: 650,
      fromTarget: orbit.current.target.clone(),
      toTarget,
      fromPosition: camera.position.clone(),
      toPosition: targetNode ? toTarget.clone().add(offset) : new THREE.Vector3(0.3, 0.8, 12)
    };
  }, [camera, selected, resetKey]);

  useFrame(() => {
    const tween = focusTween.current;
    const controls = orbit.current;
    if (!tween || !controls) return;
    const progress = Math.min(1, (performance.now() - tween.startedAt) / tween.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
    camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
    controls.update();
    if (progress >= 1) focusTween.current = null;
  });

  const activePath = useMemo(
    () => (active ? pathToRoot(active) : []),
    [active]
  );
  const activePathIds = useMemo(
    () => new Set(activePath.map(node => node.id)),
    [activePath]
  );
  const selectedPath = useMemo(
    () => (selected ? pathToRoot(selected) : []),
    [selected]
  );

  const expandedGroup =
    selectedNode?.kind === 'group'
      ? selectedNode.id
      : selectedNode?.kind === 'tool'
        ? selectedNode.parent ?? null
        : null;
  const visibleTools = useMemo(
    () =>
      expandedGroup
        ? (childrenById.get(expandedGroup) ?? []).filter(node => node.kind === 'tool')
        : [],
    [expandedGroup]
  );

  const backgroundOpen = useMemo(
    () =>
      [...activePath, ...selectedPath].some(node => node.id === 'background'),
    [activePath, selectedPath]
  );
  const backgroundChildren = useMemo(
    () =>
      backgroundOpen
        ? (childrenById.get('background') ?? [])
        : [],
    [backgroundOpen]
  );

  const visibleNodes = useMemo(
    () => [...baseNodes, ...visibleTools, ...backgroundChildren],
    [backgroundChildren, visibleTools]
  );

  const visibleEdges = useMemo(() => {
    const edges: [string, string][] = [...baseEdges, ...crossEdges];
    visibleTools.forEach(tool => edges.push([expandedGroup!, tool.id]));
    backgroundChildren.forEach(child => edges.push(['background', child.id]));
    return edges;
  }, [backgroundChildren, expandedGroup, visibleTools]);

  const visiblePairs = useMemo(
    () =>
      visibleEdges
        .map(([a, b]) => [nodeById.get(a)?.position, nodeById.get(b)?.position] as [Vec3, Vec3])
        .filter(([a, b]) => Boolean(a && b)),
    [visibleEdges]
  );

  const highlighted = useMemo(() => {
    if (!active) return null;
    const ids = new Set<string>([active]);
    activePathIds.forEach(id => ids.add(id));
    adjacency.get(active)?.forEach(id => ids.add(id));
    childrenById.get(active)?.forEach(child => ids.add(child.id));
    return ids;
  }, [active, activePathIds]);

  const activePairs = useMemo(
    () =>
      visibleEdges
        .filter(([a, b]) => highlighted?.has(a) && highlighted.has(b))
        .map(([a, b]) => [nodeById.get(a)?.position, nodeById.get(b)?.position] as [Vec3, Vec3])
        .filter(([a, b]) => Boolean(a && b)),
    [highlighted, visibleEdges]
  );

  const selectedPairs = useMemo(
    () =>
      selectedPath
        .slice(0, -1)
        .map((node, index) => {
          const next = selectedPath[index + 1];
          return [node.position, next.position] as [Vec3, Vec3];
        })
        .filter(([a, b]) => Boolean(a && b)),
    [selectedPath]
  );

  const accentPairs = useMemo(
    () =>
      accentEdges
        .map(([a, b]) => [nodeById.get(a)?.position, nodeById.get(b)?.position] as [Vec3, Vec3])
        .filter(([a, b]) => Boolean(a && b)),
    []
  );

  const activeNode = active ? nodeById.get(active) : undefined;

  const showLabel = (node: KnowledgeNode) => {
    if (node.kind === 'self' || node.kind === 'capability' || node.kind === 'background') {
      return true;
    }
    if (node.kind === 'group') {
      return (
        activePathIds.has(node.id) ||
        selectedPath.some(item => item.id === node.id) ||
        (selectedNode?.kind === 'capability' && selectedNode.id === node.parent) ||
        (wide && activeNode?.kind === 'capability' && activeNode.id === node.parent)
      );
    }
    return active === node.id;
  };

  useLayoutEffect(() => {
    document.body.style.cursor = '';
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[3.5, 5, 6]} intensity={2.15} />
      <group>
        <LevelRings />
        <Edges edges={visiblePairs} />
        <Edges edges={accentPairs} accent />
        {activePairs.length > 0 && <Edges edges={activePairs} accent />}
        {selectedPairs.length > 0 && <Edges edges={selectedPairs} accent />}
        {selected && nodeById.get(selected)?.position && (
          <SelectionHalo position={nodeById.get(selected)!.position!} />
        )}
        <CoreRings />
        {visibleNodes.map(node => {
          if (node.kind === 'tool' || node.kind === 'role' || node.kind === 'education') {
            return (
              <ChildNode
                key={node.id}
                node={node}
                dim={Boolean(highlighted && !highlighted.has(node.id))}
                active={active === node.id}
                onHover={onHover}
                onSelect={onSelect}
              />
            );
          }
          return (
            <NodeMesh
              key={node.id}
              node={node}
              dim={Boolean(highlighted && !highlighted.has(node.id))}
              active={active === node.id}
              selected={selected === node.id}
              onHover={onHover}
              onSelect={onSelect}
            />
          );
        })}
        {/* Drei Html drops the first portal's children under React 19; this hidden portal absorbs it. */}
        <Html
          key="label-portal-bootstrap"
          center
          position={[0, 0, -20]}
          pointerEvents="none"
          style={{ display: 'none' }}
        >
          <span />
        </Html>
        {visibleNodes.map(node => (
          <Label
            key={`label-${node.id}`}
            node={node}
            dim={Boolean(highlighted && !highlighted.has(node.id))}
            visible={showLabel(node)}
            selected={selected === node.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </group>
      <OrbitControls
        ref={orbit}
        makeDefault
        onStart={() => {
          focusTween.current = null;
        }}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        enableZoom={false}
        target={initialTarget}
      />
    </>
  );
}

export default function KnowledgeGraphScene(props: SceneProps) {
  return (
    <Canvas
      style={{ overflow: 'clip' }}
      flat
      dpr={[1, 1.6]}
      frameloop={props.paused ? 'never' : 'always'}
      camera={{ position: [0.3, 0.8, 12.0], fov: 32, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <SceneContents {...props} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
