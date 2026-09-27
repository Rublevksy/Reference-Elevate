'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import type { Group } from 'three';
import { poseClip, type Pose } from '@/content/mascot';

const MODEL_URL = '/models/mascot.glb';

/**
 * 3D maskot. Aktivní jen když site.mascot3d === true a v /public/models
 * leží zariggovaný mascot.glb s klipy Idle / Walk / Wave / Point / Think /
 * ThumbsUp / Celebrate. Jinak si <Mascot /> nechá 2D sprite.
 */
function Rig({ pose }: { pose: Pose }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const clip = poseClip[pose];
    const action = actions[clip] ?? actions[Object.keys(actions)[0]];
    action?.reset().fadeIn(0.35).play();
    return () => {
      action?.fadeOut(0.35);
    };
  }, [actions, pose]);

  // hlava se lehce otáčí za kurzorem
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y += (state.pointer.x * 0.35 - group.current.rotation.y) * 0.05;
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={1.1} position={[0, -1.1, 0]} />
    </group>
  );
}

export function MascotModel({ pose = 'idle' }: { pose?: Pose }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 3.2], fov: 35 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      className="!h-full !w-full"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <pointLight position={[-3, 1, -2]} intensity={2} color="#1f5bff" />
        <Rig pose={pose} />
        {/* Prostředí z lightformerů — žádné stahování HDRI z CDN */}
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={2.4} color="#ffffff" position={[2, 3, 2]} scale={[6, 6, 1]} />
          <Lightformer intensity={2} color="#1f5bff" position={[-3, 1, -2]} scale={[8, 8, 1]} />
        </Environment>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
