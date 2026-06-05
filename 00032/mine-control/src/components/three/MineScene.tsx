import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Tunnels } from './Tunnel';
import { WorkFace3D } from './WorkFace3D';
import { MineCart3D } from './MineCart3D';
import { Worker3D } from './Worker3D';
import { Equipment3D } from './Equipment3D';
import { DangerZone3D } from './DangerZone3D';
import { EvacuationRoute3D } from './EvacuationRoute3D';
import { MineBuildings } from './MineBuildings';
import { useMineStore } from '../../store/useMineStore';


export const MineScene: React.FC = () => {
  const {
    workFaces,
    mineCarts,
    workers,
    equipment,
    dangerZones,
    evacuationRoutes,
    emergencyActive,
    simulateDataUpdate,
  } = useMineStore();

  useEffect(() => {
    const interval = setInterval(() => {
      simulateDataUpdate();
    }, 3000);
    return () => clearInterval(interval);
  }, [simulateDataUpdate]);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 100, 80], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(to bottom, #0a1628, #050a14)' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[50, 100, 50]} intensity={0.5} castShadow />
        <pointLight position={[0, 50, 0]} intensity={0.3} color={0x88aaff} />
        <pointLight position={[-30, 20, -40]} intensity={0.4} color={0xffaa44} />
        <pointLight position={[30, 20, -40]} intensity={0.4} color={0xffaa44} />

        <Stars radius={300} depth={60} count={3000} factor={4} saturation={0} fade speed={1} />

        <fog attach="fog" args={['#0a1628', 50, 200]} />

        <MineBuildings />
        <Tunnels />

        {workFaces.map((wf) => (
          <WorkFace3D key={wf.id} workFace={wf} />
        ))}

        {mineCarts.map((cart) => (
          <MineCart3D key={cart.id} cart={cart} />
        ))}

        {workers.map((worker) => (
          <Worker3D key={worker.id} worker={worker} />
        ))}

        {equipment.map((eq) => (
          <Equipment3D key={eq.id} equipment={eq} />
        ))}

        {dangerZones.map((zone) => (
          <DangerZone3D key={zone.id} zone={zone} />
        ))}

        {evacuationRoutes.map((route) => (
          <EvacuationRoute3D key={route.id} route={route} />
        ))}

        {emergencyActive && (
          <pointLight
            position={[0, 50, -50]}
            intensity={2}
            color={0xff0000}
            distance={200}
          />
        )}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
};
