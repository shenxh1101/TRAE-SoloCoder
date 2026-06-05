import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Worker } from '../../data/types';
import { useMineStore } from '../../store/useMineStore';

interface Worker3DProps {
  worker: Worker;
}

export const Worker3D: React.FC<Worker3DProps> = ({ worker }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const setSelectedWorker = useMineStore((state) => state.setSelectedWorker);
  const lampRef = useRef<THREE.SpotLight>(null);
  const bodyMeshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      if (worker.isInDangerZone || worker.status === 'warning') {
        groupRef.current.position.y = worker.position.y + Math.sin(state.clock.elapsedTime * 8) * 0.15;
      }
    }

    if (bodyMeshRef.current && (worker.isInDangerZone || worker.status === 'warning')) {
      const mat = bodyMeshRef.current.material as THREE.MeshStandardMaterial;
      const flash = Math.sin(state.clock.elapsedTime * 6) > 0;
      mat.emissive.setHex(flash ? 0xff0000 : 0x000000);
      mat.emissiveIntensity = flash ? 0.5 : 0;
    }
  });

  const bodyColor = worker.status === 'evacuating' ? 0xff3b3b :
                   worker.isInDangerZone || worker.status === 'warning' ? 0xff4400 : 0x4a6a8a;

  return (
    <group
      ref={groupRef}
      position={[worker.position.x, worker.position.y, worker.position.z]}
    >
      <group
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedWorker(worker);
        }}
      >
        <mesh ref={bodyMeshRef} position={[0, 0.9, 0]}>
          <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={0xd4a574} />
        </mesh>

        <mesh position={[0, 1.75, 0]}>
          <cylinderGeometry args={[0.22, 0.25, 0.15, 16]} />
          <meshStandardMaterial color={0xffd700} />
        </mesh>

        <mesh position={[0, 1.7, 0.18]}>
          <boxGeometry args={[0.15, 0.08, 0.1]} />
          <meshStandardMaterial color={0x2a2a2a} />
        </mesh>

        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.5, 0.6, 0.25]} />
          <meshStandardMaterial color={0x3a4a5a} />
        </mesh>

        <spotLight
          ref={lampRef}
          position={[0, 1.7, 0.3]}
          angle={0.4}
          penumbra={0.5}
          intensity={worker.isInDangerZone ? 2 : 1}
          distance={10}
          color={worker.isInDangerZone ? '#ff4444' : worker.headlampColor}
          castShadow
        />
      </group>

      <Html position={[0, 2.2, 0]} center distanceFactor={20}>
        <div className={`
          px-2 py-1 rounded text-xs whitespace-nowrap text-center
          ${worker.status === 'evacuating' ? 'bg-red-900/90 border border-red-500 animate-pulse' :
            worker.isInDangerZone || worker.status === 'warning' ? 'bg-orange-900/90 border border-red-500 animate-pulse' :
            hovered ? 'bg-mine-gray/90 border border-mine-blue' : 'bg-mine-gray/80 border border-mine-blue/50'}
        `}>
          <div className="font-bold text-white">{worker.name}</div>
          <div className="text-gray-300 text-[10px]">{worker.jobType}</div>
          <div className="text-mine-blue text-[10px]">⏱ {worker.workDuration.toFixed(1)}h</div>
          {worker.isInDangerZone && (
            <div className="text-red-400 text-[10px] mt-1 font-bold">⚠ 危险区域！</div>
          )}
        </div>
      </Html>

      {(worker.isInDangerZone || worker.status === 'warning') && (
        <Html position={[0, 3.2, 0]} center distanceFactor={20}>
          <div className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-bounce shadow-lg shadow-red-500/50">
            ⚠ 立即撤离！
          </div>
        </Html>
      )}

      {worker.status === 'evacuating' && (
        <Html position={[0, 3.8, 0]} center distanceFactor={20}>
          <div className="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse border border-red-400">
            🚨 按避灾路线撤离
          </div>
        </Html>
      )}
    </group>
  );
};
