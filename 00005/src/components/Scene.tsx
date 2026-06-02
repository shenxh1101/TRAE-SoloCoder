import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Fragment } from './Fragment';
import { Particles } from './Particles';
import { useSceneStore } from '../store/useSceneStore';

export interface GlWithRefs extends THREE.WebGLRenderer {
  sceneRef?: THREE.Scene;
  cameraRef?: THREE.Camera;
}

const SceneContent = () => {
  const fragments = useSceneStore((state) => state.config.fragments);

  return (
    <>
      <color attach="background" args={['#0a0e27']} />
      <fog attach="fog" args={['#0a0e27', 10, 30]} />

      <ambientLight intensity={0.15} />
      <pointLight position={[10, 5, 10]} intensity={0.8} color="#00d4ff" distance={30} />
      <pointLight position={[-10, -5, -10]} intensity={0.6} color="#a855f7" distance={30} />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#ffffff" distance={30} />

      <Particles />

      {fragments.map((fragment, index) => (
        <Fragment key={fragment.id} fragment={fragment} index={index} />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={25}
        enablePan={false}
        autoRotate={false}
      />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.001, 0.001)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Noise opacity={0.03} />
      </EffectComposer>
    </>
  );
};

interface SceneProps {
  onGlReady?: (gl: GlWithRefs) => void;
}

export const Scene = ({ onGlReady }: SceneProps) => {
  return (
    <Canvas
      camera={{ position: [0, 2, 15], fov: 60 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      onCreated={({ gl, scene, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        (gl as GlWithRefs).sceneRef = scene;
        (gl as GlWithRefs).cameraRef = camera;
        onGlReady?.(gl as GlWithRefs);
      }}
      style={{ background: 'linear-gradient(to bottom, #0a0e27, #2d1b4e)' }}
    >
      <SceneContent />
    </Canvas>
  );
};
