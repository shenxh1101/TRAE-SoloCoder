import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import { RoadNetwork } from './RoadNetwork';
import { IntersectionNodes } from './IntersectionNodes';
import { TrafficLights } from './TrafficLights';
import { Vehicles } from './Vehicles';
import { EmergencyPath } from './EmergencyPath';
import { BusPriorityOverlay } from './BusPriorityOverlay';
import { HeatmapLayer } from './HeatmapLayer';
import { RoadClosureAnimation } from './RoadClosureAnimation';
import { CityEnvironment } from './CityEnvironment';
import { useAppStore } from '../../store';
import * as THREE from 'three';

interface SceneProps {
  showHeatmap?: boolean;
  showEmergencyPaths?: boolean;
  showBusPriority?: boolean;
}

export function Scene({
  showHeatmap = true,
  showEmergencyPaths = true,
  showBusPriority = true,
}: SceneProps) {
  const roads = useAppStore((state) => state.roads);
  const controlPlans = useAppStore((state) => state.controlPlans);
  const roadClosureAnimations = useAppStore((state) => state.roadClosureAnimations);

  const activeClosures = useMemo(() => {
    const closures: { roadId: string; startTime: number; duration?: number }[] = [];
    
    controlPlans.forEach((plan) => {
      if (plan.status === 'approved' || plan.status === 'executed' || plan.status === 'approved_government') {
        plan.roadClosures?.forEach((rc) => {
          closures.push({ roadId: rc.roadId, startTime: rc.startTime, duration: rc.endTime - rc.startTime });
        });
      }
    });
    
    roadClosureAnimations.forEach((roadId) => {
      if (!closures.find((c) => c.roadId === roadId)) {
        closures.push({ roadId, startTime: Date.now() });
      }
    });
    
    return closures;
  }, [controlPlans, roadClosureAnimations]);

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [60, 60, 60], fov: 50 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#050510']} />
        <fog attach="fog" args={['#050510', 80, 200]} />

        <ambientLight intensity={0.2} color="#4444ff" />
        <directionalLight
          position={[50, 80, 50]}
          intensity={0.5}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
        />
        <pointLight position={[0, 30, 0]} intensity={0.3} color="#00ffff" distance={100} />
        <pointLight position={[-30, 20, 30]} intensity={0.2} color="#ff00ff" distance={80} />
        <pointLight position={[30, 20, -30]} intensity={0.2} color="#ff4444" distance={80} />

        <CityEnvironment />
        <RoadNetwork />
        {showHeatmap && <HeatmapLayer roads={roads} />}
        <RoadClosureAnimation roadSegments={roads} activeClosures={activeClosures} />
        <IntersectionNodes />
        <TrafficLights />
        <Vehicles />
        {showEmergencyPaths && <EmergencyPath />}
        {showBusPriority && <BusPriorityOverlay />}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 6}
        />

        <EffectComposer>
          <Bloom
            intensity={1.0}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <SSAO
            intensity={0.5}
            radius={5}
            luminanceInfluence={0.5}
            color={new THREE.Color('black')}
            worldDistanceThreshold={1}
            worldDistanceFalloff={0}
            worldProximityThreshold={1}
            worldProximityFalloff={0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default Scene;
