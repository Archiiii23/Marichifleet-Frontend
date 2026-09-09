import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clamp01, lerp, range, scrollState } from "@/lib/scroll";

const MODEL = "/models/truck.glb";
useGLTF.preload(MODEL);

/** Cinematic camera keyframes across the scroll story (front → side → rear → top). */
const SHOTS: { t: number; pos: [number, number, number]; look: [number, number, number]; fov: number }[] = [
  { t: 0.0, pos: [1.9, 1.25, 8.6], look: [1.35, 0.85, 0], fov: 32 },
  { t: 0.26, pos: [8.4, 1.9, 3.6], look: [0.8, 0.9, 0], fov: 34 },
  { t: 0.52, pos: [-6.2, 2.9, -8.2], look: [0, 0.9, -1], fov: 38 },
  { t: 0.78, pos: [0.4, 10.4, 6.6], look: [0, 0.2, -1.2], fov: 44 },
  { t: 1.0, pos: [0.0, 19.5, 1.1], look: [0, 0, -0.4], fov: 48 },
];


function shotAt(t: number) {
  let a = SHOTS[0]!;
  let b = SHOTS[SHOTS.length - 1]!;
  for (let i = 0; i < SHOTS.length - 1; i++) {
    if (t >= SHOTS[i]!.t && t <= SHOTS[i + 1]!.t) {
      a = SHOTS[i]!;
      b = SHOTS[i + 1]!;
      break;
    }
  }
  const k = range(t, a.t, b.t);
  const e = k * k * (3 - 2 * k); // smoothstep
  return {
    pos: [lerp(a.pos[0], b.pos[0], e), lerp(a.pos[1], b.pos[1], e), lerp(a.pos[2], b.pos[2], e)] as const,
    look: [lerp(a.look[0], b.look[0], e), lerp(a.look[1], b.look[1], e), lerp(a.look[2], b.look[2], e)] as const,
    fov: lerp(a.fov, b.fov, e),
  };
}

/** Reads the story progress from the cinematic scroll zone height. */
function progress() {
  const zone = scrollState.vh * 3.4;
  return clamp01(scrollState.y / zone);
}

function Truck() {
  const { scene } = useGLTF(MODEL);
  const group = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const k = 3.6 / Math.max(size.x, size.y, size.z);
    s.scale.setScalar(k);
    s.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);

    const graphite = new THREE.Color("#2a2e34");
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const src = m.material as THREE.MeshStandardMaterial;
      const mat = (Array.isArray(src) ? src[0]! : src).clone() as THREE.MeshStandardMaterial;
      const name = (mat.name || "").toLowerCase();
      // The source kit ships a bright colour atlas; drop it for a single
      // premium graphite bodywork read.
      mat.map = null;
      if (name.includes("window") || name.includes("glass")) {
        mat.color = new THREE.Color("#0a0d12");
        mat.metalness = 0.2;
        mat.roughness = 0.06;
      } else if (name.includes("light")) {
        mat.emissive = new THREE.Color("#ff8a5c");
        mat.emissiveIntensity = 2.2;
        mat.roughness = 0.4;
      } else {
        mat.color = graphite.clone();
        mat.metalness = 0.82;
        mat.roughness = 0.26;
      }
      mat.envMapIntensity = 1.35;
      mat.needsUpdate = true;
      m.material = mat;
    });

    return s;
  }, [scene]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = progress();

    // Idle presentation turn early on, then locks forward as the truck sets off.
    const settle = 1 - range(t, 0.06, 0.2);
    const targetY = Math.PI * 0.14 * settle + scrollState.mx * 0.12 * settle;
    g.rotation.y += (targetY - g.rotation.y) * (1 - Math.exp(-6 * dt));

    // Forward travel through the story.
    const travel = -range(t, 0.12, 1) * 5.2;
    g.position.z += (travel - g.position.z) * (1 - Math.exp(-4 * dt));

    // Suspension breathing while moving.
    const moving = range(t, 0.12, 0.24);
    g.position.y = Math.sin(performance.now() * 0.006) * 0.018 * moving;
  });

  return (
    <group ref={group} position-x={1.35}>
      <primitive object={model} />
    </group>
  );
}

/** Dark asphalt with lane dashes that stream once the truck sets off. */
function Road() {
  const dashes = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 40;
  const offset = useRef(0);

  useFrame((_, delta) => {
    const t = progress();
    const speed = range(t, 0.1, 0.28) * 26;
    offset.current = (offset.current + speed * Math.min(delta, 0.05)) % 4;
    const mesh = dashes.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0.012, -i * 4 + offset.current + 20);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    (mesh.material as THREE.MeshStandardMaterial).opacity = range(t, 0.08, 0.24) * 0.85;
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[26, 260]} />
        <meshStandardMaterial color="#0b0c0f" roughness={0.82} metalness={0.15} />
      </mesh>
      <instancedMesh ref={dashes} args={[undefined, undefined, count]}>
        <planeGeometry args={[0.18, 1.9]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0}
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </instancedMesh>
    </group>
  );
}

/** Atmospheric dust — sells scale and volumetric light. */
function Atmosphere({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 34;
      arr[i * 3 + 1] = Math.random() * 9;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={points} geometry={geo}>
      <pointsMaterial size={0.035} color="#9fb0c4" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Route nodes that bloom into a network as the camera lifts to the top shot. */
function Network() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 5 + ((i * 37) % 9);
        return [Math.cos(a) * r, 0.06, Math.sin(a) * r * 0.8 - 2] as [number, number, number];
      }),
    [],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = range(progress(), 0.6, 0.97);
    g.visible = t > 0.01;
    g.scale.setScalar(0.7 + t * 0.3);
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) (m.material as THREE.MeshBasicMaterial).opacity = t;
    });
  });

  return (
    <group ref={group} visible={false}>
      {nodes.map((p, i) => (
        <group key={i}>
          <mesh position={p} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.22, 0.3, 32]} />
            <meshBasicMaterial color={i % 4 === 0 ? "#e2483a" : "#66a8e0"} transparent opacity={0} />
          </mesh>
          <line>
            <bufferGeometry
              attach="geometry"
              onUpdate={(g) =>
                g.setFromPoints([new THREE.Vector3(0, 0.06, -2), new THREE.Vector3(p[0], p[1], p[2])])
              }
            />
            <lineBasicMaterial attach="material" color="#3f6d97" transparent opacity={0} />
          </line>
        </group>
      ))}
    </group>
  );
}

function Rig({ still }: { still: boolean }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.05);
    const s = shotAt(still ? 0 : progress());
    const k = 1 - Math.exp(-5 * dt);
    const driftX = still ? 0 : scrollState.mx * 0.45;
    const driftY = still ? 0 : -scrollState.my * 0.28;
    cam.position.x += (s.pos[0] + driftX - cam.position.x) * k;
    cam.position.y += (s.pos[1] + driftY - cam.position.y) * k;
    cam.position.z += (s.pos[2] - cam.position.z) * k;
    look.set(s.look[0], s.look[1], s.look[2]);
    cam.lookAt(look);
    if (Math.abs(cam.fov - s.fov) > 0.01) {
      cam.fov += (s.fov - cam.fov) * k;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export default function Scene3D({ reduced = false, lite = false }: { reduced?: boolean; lite?: boolean }) {
  return (
    <Canvas
      shadows={!lite}
      dpr={[1, lite ? 1.25 : 1.75]}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
      camera={{ position: [0.2, 1.05, 6.4], fov: 34 }}
      frameloop={reduced ? "demand" : "always"}
    >
      <color attach="background" args={["#0a0b0d"]} />
      <fog attach="fog" args={["#0a0b0d", 12, 46]} />

      <ambientLight intensity={0.22} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={2.1}
        castShadow={!lite}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight position={[-8, 9, -6]} angle={0.7} penumbra={1} intensity={90} color="#e2483a" distance={40} />
      <spotLight position={[9, 6, -10]} angle={0.8} penumbra={1} intensity={60} color="#6fa8dc" distance={44} />

      <Environment resolution={128}>
        <Lightformer intensity={2.6} position={[0, 6, 2]} scale={[12, 5, 1]} color="#ffffff" />
        <Lightformer
          intensity={1.5}
          color="#8fb4d8"
          position={[-7, 2, -2]}
          rotation-y={Math.PI / 2}
          scale={[24, 2, 1]}
        />
        <Lightformer
          intensity={1.2}
          color="#e2483a"
          position={[7, 2, -4]}
          rotation-y={-Math.PI / 2}
          scale={[24, 1.5, 1]}
        />
      </Environment>

      <Suspense fallback={null}>
        <Truck />
      </Suspense>
      <Road />
      <Network />
      {!lite && <Atmosphere count={reduced ? 120 : 420} />}
      {!lite && (
        <ContactShadows position={[0, 0.002, 0]} opacity={0.72} scale={22} blur={2.6} far={9} resolution={512} />
      )}

      <Rig still={reduced} />
    </Canvas>
  );
}
