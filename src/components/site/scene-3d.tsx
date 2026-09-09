import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clamp01, lerp, range, scrollState } from "@/lib/scroll";
import { useTheme, type ResolvedTheme } from "@/domain/theme";

const MODEL = "/models/truck.glb";
useGLTF.preload(MODEL);

type Shot = { t: number; pos: readonly [number, number, number]; look: readonly [number, number, number]; fov: number };

const SHOTS: Shot[] = [
  { t: 0, pos: [7.2, 3.1, -10.8], look: [2.2, 0.8, 0], fov: 38 },
  { t: 0.42, pos: [7.2, 2.5, -2.4], look: [1.1, 0.9, -1.6], fov: 37 },
  { t: 0.78, pos: [7.5, 4.8, 2], look: [1.1, 0.7, -3.8], fov: 42 },
  { t: 1, pos: [2.8, 10.8, 2.6], look: [1.1, 0, -4.4], fov: 46 },
] as const;

function progress() {
  return clamp01(scrollState.y / Math.max(scrollState.vh * 1.4, 1));
}

function shotAt(t: number) {
  let a = SHOTS[0] ?? { t: 0, pos: [7.2, 3.1, -10.8], look: [2.2, 0.8, 0], fov: 38 };
  let b = SHOTS[SHOTS.length - 1] ?? a;
  for (let i = 0; i < SHOTS.length - 1; i++) {
    const current = SHOTS[i];
    const next = SHOTS[i + 1];
    if (current && next && t >= current.t && t <= next.t) {
      a = current;
      b = next;
      break;
    }
  }
  const k = range(t, a.t, b.t);
  const e = k * k * (3 - 2 * k);
  return {
    pos: a.pos.map((value, i) => lerp(value, b.pos[i] ?? value, e)) as [number, number, number],
    look: a.look.map((value, i) => lerp(value, b.look[i] ?? value, e)) as [number, number, number],
    fov: lerp(a.fov, b.fov, e),
  };
}

function Truck({ theme }: { theme: ResolvedTheme }) {
  const { scene } = useGLTF(MODEL);
  const group = useRef<THREE.Group>(null);
  const wheelRotation = useRef(0);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const scale = 3.25 / Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(scale);
    clone.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);

    clone.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const source = mesh.material as THREE.MeshStandardMaterial;
      const material = (Array.isArray(source) ? source[0] : source)?.clone() as THREE.MeshStandardMaterial | undefined;
      if (!material) return;
      const name = `${mesh.name} ${mesh.parent?.name ?? ""} ${material.name}`.toLowerCase();
      material.map = null;
      if (name.includes("window") || name.includes("glass")) {
        material.color.set(theme === "dark" ? "#080a0d" : "#24303a");
        material.metalness = 0.35;
        material.roughness = 0.08;
      } else if (name.includes("light")) {
        material.color.set("#d7d8d6");
        material.emissive.set("#c43a30");
        material.emissiveIntensity = 1.8;
      } else {
        material.color.set(theme === "dark" ? "#454a51" : "#85898e");
        material.metalness = 0.76;
        material.roughness = theme === "dark" ? 0.28 : 0.36;
      }
      material.envMapIntensity = theme === "dark" ? 1.5 : 1.1;
      material.needsUpdate = true;
      mesh.material = material;
    });
    return clone;
  }, [scene, theme]);

  useFrame((state, rawDelta) => {
    const truck = group.current;
    if (!truck) return;
    const delta = Math.min(rawDelta, 0.05);
    const t = progress();
    const moving = range(t, 0.08, 0.7);
    const targetZ = -moving * 5.8;
    const previousZ = truck.position.z;
    truck.position.z += (targetZ - truck.position.z) * (1 - Math.exp(-4.5 * delta));
    const distance = Math.abs(truck.position.z - previousZ);
    wheelRotation.current -= distance / 0.3;
    truck.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.012 * moving;
    truck.rotation.y += (scrollState.mx * 0.025 - truck.rotation.y) * (1 - Math.exp(-5 * delta));
    truck.traverse((object) => {
      if (object.name.toLowerCase().includes("wheel")) object.rotation.x = wheelRotation.current;
    });
  });

  return <group ref={group} position={[2.2, 0, 0]}><primitive object={model} rotation-y={Math.PI} /></group>;
}

function Road({ theme }: { theme: ResolvedTheme }) {
  const dashes = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 34;
  const offset = useRef(0);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    offset.current = (offset.current + range(progress(), 0.06, 0.7) * 19 * delta) % 4;
    const mesh = dashes.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0.012, -i * 4 + offset.current + 22);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[20, 180]} /><meshStandardMaterial color={theme === "dark" ? "#090a0c" : "#d8d6d0"} roughness={0.9} /></mesh>
    <instancedMesh ref={dashes} args={[undefined, undefined, count]}><planeGeometry args={[0.14, 1.7]} /><meshStandardMaterial color={theme === "dark" ? "#74777d" : "#696b70"} roughness={0.75} /></instancedMesh>
  </group>;
}

function Rig({ still }: { still: boolean }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, rawDelta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const delta = Math.min(rawDelta, 0.05);
    const shot = shotAt(still ? 0 : progress());
    const ease = 1 - Math.exp(-3.5 * delta);
    cam.position.lerp(new THREE.Vector3(shot.pos[0], shot.pos[1], shot.pos[2]), ease);
    target.set(shot.look[0], shot.look[1], shot.look[2]);
    cam.lookAt(target);
    cam.fov += (shot.fov - cam.fov) * ease;
    cam.updateProjectionMatrix();
  });
  return null;
}

export default function Scene3D({ reduced = false, lite = false }: { reduced?: boolean; lite?: boolean }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const background = dark ? "#0b0c0e" : "#f3f0ea";
  return <Canvas shadows={false} dpr={[1, lite ? 1 : 1.35]} gl={{ antialias: !lite, powerPreference: "high-performance" }} camera={{ position: [7.2, 3.1, -10.8], fov: 38 }} frameloop="always">
    <color attach="background" args={[background]} /><fog attach="fog" args={[background, 18, 54]} />
    <ambientLight intensity={dark ? 0.65 : 1.2} />
    <directionalLight position={[-6, 11, -7]} intensity={dark ? 4.2 : 3.1} />
    <spotLight position={[1, 6, -10]} angle={0.8} penumbra={0.9} intensity={dark ? 520 : 300} color={dark ? "#f3f0ea" : "#ffffff"} distance={55} />
    <spotLight position={[-8, 6, -7]} angle={0.65} penumbra={1} intensity={dark ? 180 : 95} color="#c43a30" distance={38} />
    <Environment resolution={64}><Lightformer intensity={dark ? 5 : 3} position={[0, 7, 4]} scale={[16, 5, 1]} color={dark ? "#f3f0ea" : "#ffffff"}/><Lightformer intensity={2} color="#c43a30" position={[-7, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 1.5, 1]}/></Environment>
    <Suspense fallback={null}><Truck theme={resolvedTheme} /></Suspense><Road theme={resolvedTheme} />
    {!lite && <ContactShadows position={[0, 0.002, -2]} opacity={dark ? 0.7 : 0.35} scale={22} blur={2.4} far={9} resolution={256} />}
    <Rig still={reduced} />
  </Canvas>;
}