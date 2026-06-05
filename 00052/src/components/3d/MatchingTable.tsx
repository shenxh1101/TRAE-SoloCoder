import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export const MatchingTable: React.FC = () => {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<any>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (ringRef.current) {
      ringRef.current.rotation.y = time * 0.5;
    }
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.8) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[3, 0.1, 2]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <mesh position={[-1.2, 0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[1.2, 0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.15, 0.7]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.15, -0.7]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.8, 0.05, 1.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.7} />
      </mesh>
      
      <group ref={ringRef} position={[0, 0.55, 0]}>
        <mesh position={[-0.8, 0, 0]}>
          <torusGeometry args={[0.15, 0.02, 8, 16]} />
          <meshStandardMaterial color="#165DFF" emissive={[0.1, 0.4, 1] as [number, number, number]} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.8, 0, 0]}>
          <torusGeometry args={[0.15, 0.02, 8, 16]} />
          <meshStandardMaterial color="#F53F3F" emissive={[1, 0.2, 0.2] as [number, number, number]} emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      <mesh position={[0, 0.6, -0.5]}>
        <boxGeometry args={[0.5, 0.15, 0.4]} />
        <meshStandardMaterial color="#00B42A" emissive={[0, 0.7, 0.2] as [number, number, number]} emissiveIntensity={0.3} />
      </mesh>
      
      <pointLight position={[0, 1.5, 0]} color="#ffffff" intensity={1.5} distance={5} />
      <spotLight
        position={[0, 2.5, 0]}
        angle={0.4}
        penumbra={0.5}
        intensity={1}
        color="#fff5e6"
        castShadow
      />
    </group>
  );
};
