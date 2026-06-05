import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { WorkFace } from '../../data/types';
import { useMineStore } from '../../store/useMineStore';

interface WorkFace3DProps {
  workFace: WorkFace;
}

export const WorkFace3D: React.FC<WorkFace3DProps> = ({ workFace }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const setSelectedWorkFace = useMineStore((state) => state.setSelectedWorkFace);
  const borderRef = useRef<THREE.Mesh>(null);
  const arrowsRef = useRef<THREE.Group>(null);

  const arrowOffsets = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      x: (i % 4 - 1.5) * 2.5,
      y: 1 + (i % 3) * 2,
      z: -i * 1.5,
    })), 
  []);

  useFrame((state) => {
    if (borderRef.current && workFace.isWarning) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
      borderRef.current.scale.setScalar(scale);
      const mat = borderRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.3;
    }

    if (arrowsRef.current && workFace.ventilatorActive) {
      arrowsRef.current.children.forEach((arrow, i) => {
        const baseZ = arrowOffsets[i].z;
        arrow.position.z = baseZ + ((state.clock.elapsedTime * 3 + i * 0.8) % 6) - 3;
        arrow.position.y = arrowOffsets[i].y + Math.sin(state.clock.elapsedTime * 2 + i) * 0.3;
        const meshChild = arrow as THREE.Mesh;
        const mat = meshChild.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 3 + i * 0.5) * 0.3;
      });
    }
  });

  const borderColor = workFace.isWarning ? 0xff3b3b : 0x00d4ff;
  const borderOpacity = workFace.isWarning ? 0.8 : 0.3;

  return (
    <group position={[workFace.position.x, workFace.position.y, workFace.position.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedWorkFace(workFace);
        }}
      >
        <boxGeometry args={[workFace.size.width, workFace.size.height, workFace.size.depth]} />
        <meshStandardMaterial
          color={workFace.isWarning ? 0x4a2020 : 0x2a3a4a}
          transparent
          opacity={hovered ? 0.8 : 0.6}
          emissive={workFace.isWarning ? 0xff0000 : 0x0066aa}
          emissiveIntensity={workFace.isWarning ? 0.3 : 0.1}
        />
      </mesh>

      <mesh ref={borderRef}>
        <boxGeometry args={[
          workFace.size.width + 0.5,
          workFace.size.height + 0.5,
          workFace.size.depth + 0.5
        ]} />
        <meshBasicMaterial
          color={borderColor}
          transparent
          opacity={borderOpacity}
          side={THREE.BackSide}
        />
      </mesh>

      {(hovered || workFace.isWarning) && (
        <Html position={[0, workFace.size.height / 2 + 2, 0]} center distanceFactor={10}>
          <div className={`
            px-3 py-2 rounded-lg text-sm whitespace-nowrap
            ${workFace.isWarning ? 'bg-red-900/90 border border-red-500' : 'bg-mine-gray/90 border border-mine-blue'}
          `}>
            <div className="font-bold text-white mb-1">{workFace.name}</div>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-gray-300">瓦斯:</span>
                <span className={workFace.isWarning ? 'text-red-400 font-bold' : 'text-mine-green'}>
                  {workFace.gasConcentration.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-300">粉尘:</span>
                <span className={workFace.dustConcentration >= 10 ? 'text-yellow-400' : 'text-mine-blue'}>
                  {workFace.dustConcentration.toFixed(1)}mg/m³
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-300">温度:</span>
                <span className="text-mine-blue">{workFace.temperature.toFixed(1)}°C</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-300">进尺:</span>
                <span className="text-white font-mono">{workFace.progress}m</span>
              </div>
            </div>
            {workFace.ventilatorActive && (
              <div className="mt-1 text-xs text-mine-green animate-pulse">
                ⚡ 通风机运行中
              </div>
            )}
          </div>
        </Html>
      )}

      {workFace.ventilatorActive && (
        <group ref={arrowsRef} position={[0, 0, -workFace.size.depth / 2 - 2]}>
          {arrowOffsets.map((offset, i) => (
            <mesh key={i} position={[offset.x, offset.y, offset.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.3, 1.2, 4]} />
              <meshBasicMaterial color={0x00ff88} transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
