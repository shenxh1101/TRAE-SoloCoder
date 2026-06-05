import React from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export const MineBuildings: React.FC = () => {
  return (
    <group>
      <group position={[0, 0, 30]}>
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[15, 10, 15]} />
          <meshStandardMaterial color={0x4a5a6a} metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[0, 11, 0]}>
          <boxGeometry args={[16, 1, 16]} />
          <meshStandardMaterial color={0x5a6a7a} metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[15.2, 10.2, 15.2]} />
          <meshBasicMaterial color={0x00d4ff} transparent opacity={0.05} side={THREE.BackSide} />
        </mesh>
        <Html position={[0, 10.5, 0]} center distanceFactor={10}>
          <div className="text-xl font-bold text-mine-blue whitespace-nowrap bg-mine-gray/80 px-2 py-1 rounded">
            调度中心
          </div>
        </Html>
        {[-6, 0, 6].map((x, i) => (
          <mesh key={i} position={[x, 8, 7.6]}>
            <boxGeometry args={[3, 3, 0.2]} />
            <meshStandardMaterial color={0x8ab4f8} emissive={0x4488ff} emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>

      <group position={[-15, 0, 25]}>
        <mesh position={[0, 8, 0]}>
          <cylinderGeometry args={[5, 6, 16, 8]} />
          <meshStandardMaterial color={0x5a5a5a} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 16, 0]}>
          <cylinderGeometry args={[5.5, 5.5, 1, 8]} />
          <meshStandardMaterial color={0x6a6a6a} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 17, 0]}>
          <cylinderGeometry args={[2, 5.5, 1, 8]} />
          <meshStandardMaterial color={0x7a7a7a} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2, 5]}>
          <boxGeometry args={[3, 4, 2]} />
          <meshStandardMaterial color={0x4a4a4a} metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[0.5, 3, 6]} />
          <meshStandardMaterial color={0x8a6a4a} metalness={0.2} roughness={0.8} />
        </mesh>
      </group>

      <group position={[15, 0, 25]}>
        <mesh position={[0, 6, 0]}>
          <cylinderGeometry args={[4, 5, 12, 8]} />
          <meshStandardMaterial color={0x5a5a5a} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 12, 0]}>
          <cylinderGeometry args={[4.5, 4.5, 1, 8]} />
          <meshStandardMaterial color={0x6a6a6a} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 13, 0]}>
          <cylinderGeometry args={[1.5, 4.5, 1, 8]} />
          <meshStandardMaterial color={0x7a7a7a} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2, 4]}>
          <boxGeometry args={[2.5, 3.5, 2]} />
          <meshStandardMaterial color={0x4a4a4a} metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      <group position={[0, 0, 20]}>
        {[-20, -10, 0, 10, 20].map((x, i) => (
          <group key={i} position={[x, 4, 0]}>
            <mesh>
              <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
              <meshStandardMaterial color={0x3a4a5a} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 4, 0]}>
              <boxGeometry args={[0.5, 0.5, 2]} />
              <meshStandardMaterial color={0x2a2a2a} />
            </mesh>
            <pointLight position={[0, 4, 0.8]} intensity={0.5} distance={15} color={0xffffaa} />
          </group>
        ))}
      </group>

      <group position={[-50, 0, -50]}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[12, 6, 10]} />
          <meshStandardMaterial color={0x4a4a3a} metalness={0.2} roughness={0.8} />
        </mesh>
        <mesh position={[0, 6.5, 0]}>
          <boxGeometry args={[13, 1, 11]} />
          <meshStandardMaterial color={0x5a5a4a} metalness={0.3} roughness={0.7} />
        </mesh>
        {[-3, 3].map((x, i) => (
          <mesh key={i} position={[x, 3, 5.1]}>
            <boxGeometry args={[3, 3.5, 0.2]} />
            <meshStandardMaterial color={0x6a5a4a} metalness={0.1} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[14, 1, 12]} />
          <meshStandardMaterial color={0x3a3a2a} />
        </mesh>
      </group>

      <mesh position={[0, -5, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={0x1a1a1a} roughness={1} />
      </mesh>

      <mesh position={[0, 0, -30]}>
        <fog attach="fog" args={['#0a0a0a', 30, 150]} />
      </mesh>
    </group>
  );
};
