import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DangerZone } from '../../data/types';

interface DangerZone3DProps {
  zone: DangerZone;
}

export const DangerZone3D: React.FC<DangerZone3DProps> = ({ zone }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const getZoneColor = () => {
    switch (zone.type) {
      case 'goaf': return 0xff6600;
      case 'water': return 0x0066ff;
      case 'gas': return 0xff0066;
      default: return 0xff0000;
    }
  };

  return (
    <group position={[zone.position.x, zone.position.y, zone.position.z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[zone.size.width, zone.size.height, zone.size.depth]} />
        <meshBasicMaterial
          color={getZoneColor()}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <boxGeometry args={[
          zone.size.width + 0.2,
          zone.size.height + 0.2,
          zone.size.depth + 0.2
        ]} />
        <meshBasicMaterial
          color={getZoneColor()}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>

      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[
            Math.cos(angle) * zone.size.width / 2,
            zone.size.height / 2 + 1,
            Math.sin(angle) * zone.size.depth / 2,
          ]}>
            <coneGeometry args={[0.2, 0.5, 4]} />
            <meshBasicMaterial color={getZoneColor()} />
          </mesh>
        );
      })}
    </group>
  );
};
