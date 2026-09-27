'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { createGlowTexture, createLogoTexture } from './screenTexture';

/** Jen pointer — hero už neřídí scénu skrolem, notebook jen idluje. */
export type HeroPointer = MutableRefObject<{ x: number; y: number }>;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Zavřený notebook, který jemně a nekonečně rotuje a naklání se za
 * kurzorem. Bez otevírání víka a bez „naletu" kamery — tahle dynamika
 * teď žije v samostatné sekci <MacbookIntro /> (plochý PNG mockup,
 * scroll-driven zoom). Tady je jen klidná, smyčkovaná idle scéna.
 */
function Laptop({ pointer }: { pointer: HeroPointer }) {
  const root = useRef<THREE.Group>(null);
  const logo = useMemo(() => createLogoTexture(), []);
  const glow = useMemo(() => createGlowTexture(), []);

  useEffect(() => () => {
    logo.dispose();
    glow.dispose();
  }, [logo, glow]);

  useFrame((state, delta) => {
    const { x, y } = pointer.current;
    if (root.current) {
      const idle = state.clock.elapsedTime * 0.1;
      const targetY = idle + x * 0.18;
      root.current.rotation.y = lerp(root.current.rotation.y, targetY, 1 - Math.pow(0.001, delta));
      root.current.rotation.x = lerp(root.current.rotation.x, -y * 0.05, 0.06);
      root.current.position.y = -0.35 + Math.sin(state.clock.elapsedTime * 0.55) * 0.045;
    }
  });

  return (
    <group ref={root} position={[0, -0.35, 0]} scale={0.86}>
      {/* modrý odlesk na "podlaze" — světlo, ne hraněný podstavec */}
      <mesh position={[0, -0.065, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.5, 5.5]} />
        <meshBasicMaterial map={glow} color="#1f5bff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* spodní díl */}
      <RoundedBox args={[3.2, 0.13, 2.2]} radius={0.055} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#0c0f16" metalness={0.92} roughness={0.28} />
      </RoundedBox>

      {/* klávesnice */}
      <mesh position={[0, 0.069, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.78, 1.35]} />
        <meshStandardMaterial color="#05070c" metalness={0.5} roughness={0.75} />
      </mesh>

      {/* zavřené víko — leží na spodním dílu, logo míří nahoru */}
      <group position={[0, 0.065, -1.05]}>
        <group position={[0, 0, 1.05]}>
          <RoundedBox args={[3.2, 0.1, 2.15]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial color="#0c0f16" metalness={0.95} roughness={0.24} />
          </RoundedBox>
          <mesh position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.7, 0.42]} />
            <meshBasicMaterial map={logo} transparent toneMapped={false} />
          </mesh>
        </group>
      </group>
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

export default function MacbookScene({ pointer }: { pointer: HeroPointer }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [1.9, 1.15, 5.6], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="!h-full !w-full"
    >
      <fog attach="fog" args={['#04060b', 6, 15]} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 3]} intensity={2.1} />
      <pointLight position={[-2.6, 1.2, -0.1]} intensity={5} color="#1f5bff" distance={12} />
      <pointLight position={[4.9, 0.8, 3.5]} intensity={4} color="#c8d8ff" distance={12} />

      {/* scéna posunutá doprava, vlevo zůstává místo na text */}
      <group position={[1.9, 0, 0]}>
        <Laptop pointer={pointer} />
        {/* měkký kontaktní stín — notebook „stojí ve světle", ne na hraněném podstavci */}
        <ContactShadows position={[0, -0.82, 0]} opacity={0.55} scale={6} blur={2.8} far={2} resolution={256} frames={1} color="#000000" />
        <Arc />
      </group>

      <Environment resolution={128} frames={1}>
        <Lightformer intensity={3} color="#ffffff" position={[0, 4, 2]} scale={[8, 4, 1]} />
        <Lightformer intensity={2.2} color="#3d7bff" position={[-4, 1, -3]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.4} color="#ffffff" position={[4, 0, 2]} scale={[4, 8, 1]} />
      </Environment>
    </Canvas>
  );
}
