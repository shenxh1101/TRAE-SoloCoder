import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import RoboticArm from './RoboticArm';
import ConveyorBelt from './ConveyorBelt';
import AssemblyTable from './AssemblyTable';
import Part from './Part';
import Floor from './Floor';
import CameraController from '../camera/CameraController';

import { useSceneStore } from '@/store/useSceneStore';
import { usePartFlow } from '@/hooks/usePartFlow';
import { useCollisionDetection } from '@/hooks/useCollisionDetection';
import { RecordingFrame } from '@/types/recording';

const SceneLighting = () => {
  return (
    <>
      <ambientLight intensity={0.3} color="#ffffff" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight
        position={[-5, 8, -5]}
        intensity={0.3}
        color="#4466aa"
      />
      <pointLight position={[-8, 4, 2]} color="#00d4ff" intensity={0.5} distance={10} />
      <pointLight position={[6, 4, 0]} color="#ff3366" intensity={0.4} distance={10} />
      <pointLight position={[0, 5, -5]} color="#a855f7" intensity={0.3} distance={15} />
    </>
  );
};

const GlobalTimeUpdater = () => {
  const updateGlobalTime = useSceneStore((state) => state.updateGlobalTime);

  useFrame((state) => {
    updateGlobalTime(state.clock.elapsedTime);
  });

  return null;
};

const RecordingFrameCapturer = () => {
  const lastCaptureTime = useRef(0);
  const captureInterval = 1000 / 30;

  useFrame(() => {
    const store = useSceneStore.getState();
    if (!store.recording.isRecording) return;

    const now = performance.now();
    if (now - lastCaptureTime.current < captureInterval) return;
    lastCaptureTime.current = now;

    const frame: RecordingFrame = {
      timestamp: now,
      arms: store.arms.map((arm) => ({
        armId: arm.id,
        jointAngles: arm.joints.map((j) => j.angle),
        position: arm.position,
      })),
      parts: store.parts.map((part) => ({
        partId: part.id,
        position: part.position,
        rotation: part.rotation,
      })),
    };

    store.addRecordingFrame(frame);
  });

  return null;
};

const SceneContent = () => {
  const { parts } = usePartFlow();
  useCollisionDetection();

  return (
    <>
      <CameraController />
      <SceneLighting />
      <GlobalTimeUpdater />
      <RecordingFrameCapturer />

      <Floor />
      <ConveyorBelt />
      <AssemblyTable />

      <RoboticArm armId="arm-1" />
      <RoboticArm armId="arm-2" />
      <RoboticArm armId="arm-3" />

      {parts.map((part) => (
        <Part key={part.id} part={part} />
      ))}

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
};

const Scene = () => {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0e17']} />
      <fog attach="fog" args={['#0a0e17', 20, 40]} />
      <SceneContent />
    </Canvas>
  );
};

export default Scene;
