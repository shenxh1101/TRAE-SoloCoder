import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useBloodBankStore } from '@/store';
import { get3DayThreshold, getDaysOfSupply, calculateInventoryStats } from '@/utils/bloodTypeUtils';
import type { BloodBag as BloodBagType, TransportTask } from '@/types';
import { ColdStorage } from './ColdStorage';
import { BloodShelf } from './BloodShelf';
import { MatchingTable } from './MatchingTable';
import { TransportPath } from './TransportPath';
import { NurseStation } from './NurseStation';
import { Robot } from './Robot';
import { Particles, ColdFog, Floor } from './Particles';

interface SceneContentProps {
  onBloodBagClick: (bag: BloodBagType) => void;
}

const SceneContent: React.FC<SceneContentProps> = ({ onBloodBagClick }) => {
  const {
    bloodBags,
    coldStorage,
    robots,
    transfusionRequests,
    simulateTimeline
  } = useBloodBankStore();

  const stats = calculateInventoryStats(bloodBags);
  const bloodTypes: ('A' | 'B' | 'AB' | 'O')[] = ['A', 'B', 'AB', 'O'];
  const components: ('whole_blood' | 'plasma' | 'platelet')[] = ['whole_blood', 'plasma', 'platelet'];

  const lowStockTypes = useMemo(() => {
    const low = new Set<string>();
    bloodTypes.forEach(bt => {
      components.forEach(comp => {
        const available = stats[bt][comp].available;
        const days = getDaysOfSupply(bt, comp, available);
        if (days < 3) {
          low.add(`${bt}_${comp}`);
        }
      });
    });
    return low;
  }, [stats]);

  const activeTasks = useMemo(() => {
    return transfusionRequests
      .filter(r => r.transportTask)
      .map(r => r.transportTask)
      .filter((t): t is TransportTask => t !== undefined);
  }, [transfusionRequests]);

  useEffect(() => {
    const interval = setInterval(() => {
      simulateTimeline();
    }, 3000);
    return () => clearInterval(interval);
  }, [simulateTimeline]);

  return (
    <>
      <ambientLight intensity={0.4} color="#4a6fa5" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        color="#e6f2ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-10, 10, -5]}
        intensity={0.3}
        color="#87ceeb"
      />
      
      <ColdStorage coldStorage={coldStorage} />
      
      <BloodShelf
        position={[-6, 0, -4]}
        bloodBags={bloodBags.filter(b => b.storageLocation.row < 2)}
        lowStockTypes={lowStockTypes}
        onBloodBagClick={onBloodBagClick}
      />
      
      <BloodShelf
        position={[-6, 0, 1]}
        bloodBags={bloodBags.filter(b => b.storageLocation.row >= 2)}
        lowStockTypes={lowStockTypes}
        onBloodBagClick={onBloodBagClick}
      />
      
      <MatchingTable />
      <TransportPath tasks={activeTasks} />
      <NurseStation />
      
      {robots.map(robot => {
        const task = activeTasks.find(t => t.robotId === robot.id && t.status === 'in_progress');
        return (
          <Robot key={robot.id} robot={robot} task={task} />
        );
      })}
      
      <Floor size={[25, 20]} />
      <Particles count={150} color="#60a5fa" area={[20, 6, 15]} />
      <ColdFog position={[-8, 0, -6]} />
      <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={0.5} />
      
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};

interface BloodBankSceneProps {
  onBloodBagClick: (bag: BloodBagType) => void;
}

export const BloodBankScene: React.FC<BloodBankSceneProps> = ({ onBloodBagClick }) => {
  return (
    <Canvas
      shadows
      camera={{ position: [8, 10, 12], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0f1a']} />
      <fog attach="fog" args={['#0a0f1a', 15, 40]} />
      
      <SceneContent onBloodBagClick={onBloodBagClick} />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={0.3}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
};
