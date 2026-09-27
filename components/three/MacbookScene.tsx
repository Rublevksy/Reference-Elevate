'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { createLogoTexture, createScreenTexture } from './screenTexture';

export type HeroProgress = MutableRefObject<{ scroll: number; pointerX: number; pointerY: number }>;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Normalizuje `value` do 0..1 v rozsahu <start, end>. */
const range = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));

function Laptop({ progress }: { progress: HeroProgress }) {
  const root = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const screen = useMemo(() => createScreenTexture(), []);
  const logo = useMemo(() => createLogoTexture(), []);

  useEffect(() => () => {
    screen.dispose();
    logo.dispose();
  }, [screen, logo]);

  useFrame((state, delta) => {
    const { scroll, pointerX, pointerY } = progress.current;

    // 0–0.35 otáčení kolem osy Y, 0.35–0.7 otevírání víka, 0.7–1 nálet kamery
    const spin = range(scroll, 0, 0.36);
    const open = range(scroll, 0.34, 0.72);

    if (root.current) {
      const idleSpin = scroll < 0.02 ? state.clock.elapsedTime * 0.12 : 0;
      const targetY = lerp(-2.2 + idleSpin, 0, spin) + pointerX * 0.14 * (1 - spin);
      root.current.rotation.y = lerp(root.current.rotation.y, targetY, 1 - Math.pow(0.001, delta));
      root.current.rotation.x = lerp(root.current.rotation.x, -pointerY * 0.06 * (1 - open), 0.06);
      root.current.position.y = lerp(-0.35, -0.1, open);
    }

    if (lid.current) {
      // 0 = zavřeno, -1.92 rad ≈ otevřeno
      lid.current.rotation.x = lerp(0, -1.92, open);
    }

    if (screenMat.current) {
      screenMat.current.opacity = clamp01((open - 0.12) * 3);
    }

    screen.draw(range(scroll, 0.4, 0.78), state.clock.elapsedTime);
  });

  return (
    <group ref={root} position={[0, -0.35, 0]} scale={0.82}>
      {/* spodní díl */}
      <RoundedBox args={[3.2, 0.13, 2.2]} radius={0.055} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#0c0f16" metalness={0.92} roughness={0.28} />
      </RoundedBox>

      {/* klávesnice + trackpad */}
      <mesh position={[0, 0.069, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.78, 1.35]} />
        <meshStandardMaterial color="#05070c" metalness={0.5} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.071, 0.78]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.06, 0.66]} />
        <meshStandardMaterial color="#0a0d14" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* víko — pivot na zadní hraně */}
      <group ref={lid} position={[0, 0.065, -1.05]}>
        <group position={[0, 0, 1.05]}>
          <RoundedBox args={[3.2, 0.1, 2.15]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial color="#0c0f16" metalness={0.95} roughness={0.24} />
          </RoundedBox>

          {/* logo na vnější straně víka */}
          <mesh position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.7, 0.42]} />
            <meshBasicMaterial map={logo} transparent toneMapped={false} />
          </mesh>

          {/* displej — míří dolů na klávesnici, po otevření na diváka */}
          <mesh position={[0, -0.053, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.92, 1.88]} />
            <meshBasicMaterial ref={screenMat} map={screen.texture} transparent toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.052, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.0, 1.98]} />
            <meshStandardMaterial color="#02040a" metalness={0.3} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Kamenný podstavec pod notebookem. */
function Pedestal() {
  return (
    <group position={[0, -1.15, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[3.9, 1.6, 2.5]} />
        <meshStandardMaterial color="#06080d" metalness={0.1} roughness={1} />
      </mesh>
      {/* naleštěná deska, ve které se notebook lehce zrcadlí */}
      <mesh position={[0, 0.801, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.9, 2.5]} />
        <meshStandardMaterial color="#0b0e14" metalness={0.6} roughness={0.28} />
      </mesh>
    </group>
  );
}

/** Světelný oblouk za notebookem. */
function Arc() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = -0.35 + Math.sin(state.clock.elapsedTime * 0.25) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={[1.9, 1.4, -4.6]} rotation={[0, 0, -0.55]}>
      <torusGeometry args={[3.1, 0.014, 12, 120, Math.PI * 0.85]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
}

function CameraRig({ progress }: { progress: HeroProgress }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const { scroll, pointerX, pointerY } = progress.current;
    const dive = range(scroll, 0.74, 1);

    const targetZ = lerp(8.4, 3.4, dive);
    const targetY = lerp(1.35, 0.85, dive) + pointerY * 0.12;
    // kamera startuje vlevo od notebooku (vedle textu) a při náletu se k němu stáčí
    const targetX = lerp(0.15, 1.9, dive) + pointerX * 0.25 * (1 - dive);

    const k = 1 - Math.pow(0.0015, delta);
    camera.position.x = lerp(camera.position.x, targetX, k);
    camera.position.y = lerp(camera.position.y, targetY, k);
    camera.position.z = lerp(camera.position.z, targetZ, k);
    camera.lookAt(lerp(0.75, 1.9, dive), lerp(-0.25, 0.5, dive), lerp(0, -0.9, dive));
  });

  return null;
}

export default function MacbookScene({ progress }: { progress: HeroProgress }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0.15, 1.35, 8.4], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="!h-full !w-full"
    >
      <fog attach="fog" args={['#04060b', 7, 18]} />

      <ambientLight intensity={0.28} />
      <directionalLight position={[3, 5, 3]} intensity={2.1} />
      <pointLight position={[-4.5, 1.2, -2]} intensity={5} color="#1f5bff" distance={12} />
      <pointLight position={[3, 0.8, 3.5]} intensity={4} color="#c8d8ff" distance={12} />

      {/* celá scéna je posunutá doprava, vlevo zůstává místo na text */}
      <group position={[1.9, 0, 0]}>
        <Laptop progress={progress} />
        {/* měkký kontaktní stín, ať notebook nevisí ve vzduchu */}
        <ContactShadows
          position={[0, -0.42, 0]}
          opacity={0.7}
          scale={7}
          blur={2.6}
          far={2.2}
          resolution={256}
          frames={1}
          color="#000000"
        />
        <Pedestal />
        <Arc />
      </group>
      <CameraRig progress={progress} />

      <Environment resolution={128} frames={1}>
        <Lightformer intensity={3} color="#ffffff" position={[0, 4, 2]} scale={[8, 4, 1]} />
        <Lightformer intensity={2.2} color="#3d7bff" position={[-4, 1, -3]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.4} color="#ffffff" position={[4, 0, 2]} scale={[4, 8, 1]} />
      </Environment>
    </Canvas>
  );
}
