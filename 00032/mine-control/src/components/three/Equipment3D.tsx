import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Equipment } from '../../data/types';

interface Equipment3DProps {
  equipment: Equipment;
}

export const Equipment3D: React.FC<Equipment3DProps> = ({ equipment }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (rotorRef.current && equipment.status === 'running') {
      if (equipment.type === 'ventilator') {
        rotorRef.current.rotation.z += 0.2;
      } else if (equipment.type === 'conveyor') {
        rotorRef.current.position.x = (state.clock.elapsedTime * 2) % 2 - 1;
      }
    }
  });

  const getEquipmentModel = () => {
    switch (equipment.type) {
      case 'shearer':
        return (
          <group>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[4, 1.5, 2]} />
              <meshStandardMaterial color={0x4a4a4a} metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 2, 0]}>
              <boxGeometry args={[3, 0.8, 1.5]} />
              <meshStandardMaterial color={0x6a6a6a} metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[2.5, 1.5, 0]} rotation={[0, 0, 0.3]}>
              <cylinderGeometry args={[0.3, 0.3, 3, 8]} />
              <meshStandardMaterial color={0x5a5a5a} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[-1.5, 0.5, 0]}>
              <boxGeometry args={[1.5, 1, 1.8]} />
              <meshStandardMaterial color={0x3a3a3a} />
            </mesh>
          </group>
        );
      case 'conveyor':
        return (
          <group>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[2, 1, 6]} />
              <meshStandardMaterial color={0x5a4a3a} metalness={0.3} roughness={0.7} />
            </mesh>
            <group ref={rotorRef}>
              <mesh position={[0, 1.1, 0]}>
                <boxGeometry args={[1.8, 0.1, 0.5]} />
                <meshStandardMaterial color={0x2a2a2a} />
              </mesh>
            </group>
            {[-2.5, 2.5].map((z, i) => (
              <mesh key={i} position={[0, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 1.5, 8]} />
                <meshStandardMaterial color={0x3a3a3a} />
              </mesh>
            ))}
          </group>
        );
      case 'ventilator':
        return (
          <group>
            <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1, 1.2, 0.8, 16]} />
              <meshStandardMaterial color={0x3a5a7a} metalness={0.6} roughness={0.4} />
            </mesh>
            <group ref={rotorRef} position={[0, 1, 0]}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
                  <boxGeometry args={[0.05, 0.6, 0.8]} />
                  <meshStandardMaterial color={0x2a3a4a} metalness={0.8} roughness={0.2} />
                </mesh>
              ))}
            </group>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.3, 0.4, 0.6, 8]} />
              <meshStandardMaterial color={0x4a4a4a} />
            </mesh>
          </group>
        );
      case 'pump':
        return (
          <group>
            <mesh position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.8, 1, 1.2, 16]} />
              <meshStandardMaterial color={0x4a5a6a} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[1, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 1.5, 8]} />
              <meshStandardMaterial color={0x5a6a7a} metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[1.5, 0.4, 1.5]} />
              <meshStandardMaterial color={0x3a4a5a} />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  const statusColor = equipment.status === 'running' ? '#00FF88' :
                      equipment.status === 'maintenance' ? '#FFD700' : '#888888';

  return (
    <group
      ref={groupRef}
      position={[equipment.position.x, equipment.position.y, equipment.position.z]}
    >
      {getEquipmentModel()}
      
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {equipment.maintenanceWarning && (
        <Html position={[0, 3.5, 0]} center distanceFactor={20}>
          <div className="bg-yellow-900/90 border border-yellow-500 px-2 py-1 rounded text-xs text-yellow-300 animate-pulse">
            ⚠ 需检修
          </div>
        </Html>
      )}
    </group>
  );
};
