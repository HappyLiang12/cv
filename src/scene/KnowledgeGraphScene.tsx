import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, Html, OrbitControls } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
  visible
}: {
  node: KnowledgeNode;
  dim: boolean;
  visible: boolean;
}) {
  const [x, y, z] = node.position!;
  return (
    <Html
      key={node.id}
      center
      position={[x, y + labelOffsetY(node), z + 0.08]}
      zIndexRange={[4, 0]}
      pointerEvents="none"
      style={{ pointerEvents: 'none' }}
    >
      <span
        className={`scene-label scene-label-${node.kind}${dim ? ' is-dim' : ''}${
          visible ? '' : ' is-hidden'
        }`}
        aria-hidden="true"
      >
        {node.label}
      </span>
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
  if (node.tone === 'pine') return '#2c5f4f';
  if (node.tone === 'muted') return '#7c7c74';
  return '#45463f';
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
          color={node.tone === 'muted' ? '#73736b' : '#2c5f4f'}
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
        <sphereGeometry args={[Math.max(node.size * 2.9, 0.19), 8, 8]} />
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

function Floor() {
  const positions = useMemo(() => {
    const data: number[] = [];
    const half = 8.4;
    const step = 1.2;
    const y = -3.35;
    for (let x = -half; x <= half; x += step) data.push(x, y, -half, x, y, half);
    for (let z = -half; z <= half; z += step) data.push(-half, y, z, half, y, z);
    return new Float32Array(data);
  }, []);

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#deded8" transparent opacity={0.5} />
    </lineSegments>
  );
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

function Stems({ nodes }: { nodes: KnowledgeNode[] }) {
  const pairs = useMemo(
    () =>
      nodes
        .filter(node => node.kind === 'capability' || node.kind === 'background')
        .map(node => {
          const point = node.position!;
          return [[point[0], -3.35, point[2]], point] as [Vec3, Vec3];
        }),
    [nodes]
  );

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[toLinePositions(pairs), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#c9c9c2" transparent opacity={0.28} />
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
        color={accent ? '#2c5f4f' : '#b8b8b1'}
        transparent
        opacity={accent ? 0.72 : 0.44}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function EdgePulses({ edges }: { edges: [Vec3, Vec3][] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!mesh.current || edges.length === 0) return;
    edges.forEach(([a, b], index) => {
      const t = (clock.elapsedTime * 0.26 + index * 0.31) % 1;
      dummy.position.set(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
      );
      dummy.scale.setScalar(0.034);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (edges.length === 0) return null;
  return (
    <instancedMesh
      key={edges.length}
      ref={mesh}
      args={[undefined, undefined, edges.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#2c5f4f" />
    </instancedMesh>
  );
}

function SelectionHalo({ position }: { position: Vec3 }) {
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.4;
    if (ring2.current) ring2.current.rotation.z = -clock.elapsedTime * 0.3;
  });

  return (
    <group position={position}>
      <mesh ref={ring}>
        <torusGeometry args={[0.4, 0.006, 8, 64]} />
        <meshBasicMaterial color="#2c5f4f" transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <mesh ref={ring2} rotation={[0.8, 0.2, 0]}>
        <torusGeometry args={[0.54, 0.004, 8, 64]} />
        <meshBasicMaterial color="#2c5f4f" transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CoreRings() {
  const first = useRef<THREE.Mesh>(null);
  const second = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (first.current) first.current.rotation.z = clock.elapsedTime * 0.06;
    if (second.current) second.current.rotation.z = -clock.elapsedTime * 0.045;
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={first} rotation={[1.1, 0.3, 0.2]}>
        <torusGeometry args={[0.57, 0.005, 8, 64]} />
        <meshBasicMaterial color="#2c5f4f" transparent opacity={0.28} />
      </mesh>
      <mesh ref={second} rotation={[0.6, -0.4, 0.8]}>
        <torusGeometry args={[0.78, 0.004, 8, 64]} />
        <meshBasicMaterial color="#2c5f4f" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function SceneContents({ selected, hovered, wide, onHover, onSelect }: Omit<SceneProps, 'paused'>) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef<OrbitControlsImpl>(null);
  const focusTween = useRef<FocusTween | null>(null);
  const camera = useThree(state => state.camera);
  const active = hovered ?? selected;
  const selectedNode = selected ? nodeById.get(selected) : undefined;
  const lastSelected = useRef(selected);

  useEffect(() => {
    if (selected === lastSelected.current) return;
    lastSelected.current = selected;
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
      toPosition: toTarget.clone().add(offset)
    };
  }, [camera, selected]);

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
      if (expandedGroup === node.id) return false;
      return (
        activePathIds.has(node.id) ||
        (wide &&
          activeNode?.kind === 'capability' &&
          activeNode.id === node.parent)
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

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      Math.sin(clock.elapsedTime * 0.08) * 0.022,
      1.4,
      delta
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      Math.cos(clock.elapsedTime * 0.06) * 0.01,
      1.4,
      delta
    );
  });

  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[3.5, 5, 6]} intensity={2.15} />
      <group ref={group}>
        <Floor />
        <LevelRings />
        <Stems nodes={baseNodes} />
        <Edges edges={visiblePairs} />
        <Edges edges={accentPairs} accent />
        {activePairs.length > 0 && <Edges edges={activePairs} accent />}
        {selectedPairs.length > 0 && <EdgePulses edges={selectedPairs} />}
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
        zoomSpeed={0.6}
        minDistance={7}
        maxDistance={17}
        autoRotate={!active}
        autoRotateSpeed={0.24}
        target={[0, -0.1, 0]}
      />
    </>
  );
}

export default function KnowledgeGraphScene(props: SceneProps) {
  return (
    <Canvas
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
