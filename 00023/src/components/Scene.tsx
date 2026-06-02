import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Pagoda from '@/three/Pagoda';
import Ground from '@/three/Ground';
import Trees from '@/three/Trees';
import Lighting from '@/three/Lighting';
import Fireflies from '@/three/Fireflies';
import { usePagodaStore } from '@/store/usePagodaStore';

export default function Scene() {
  const shadowsEnabled = usePagodaStore((state) => state.config.shadowsEnabled);

  return (
    <div className="w-full h-full">
      <Canvas
        shadows={shadowsEnabled}
        camera={{ position: [15, 12, 15], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Sky
          distance={450000}
          sunPosition={[100, 50, 100]}
          inclination={0.5}
          azimuth={0.25}
        />

        <fog attach="fog" args={['#87CEEB', 50, 150]} />

        <Lighting />
        <Ground />
        <Trees />
        <Pagoda position={[0, 0, 0]} />
        <Fireflies />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={8}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.1}
          minPolarAngle={0.2}
        />

        <EffectComposer>
          <Bloom
            intensity={0.4}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
