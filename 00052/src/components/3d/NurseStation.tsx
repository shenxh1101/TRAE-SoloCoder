import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export const NurseStation: React.FC = () => {
  const groupRef = useRef<Group>(null);
  const screenRef = useRef<any>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (screenRef.current) {
      screenRef.current.material.emissiveIntensity = 0.5 + Math.sin(time * 2) * 0.2;
    }
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.6) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={[6, 0, 5]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[3, 1, 1.5]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.6} />
      </mesh>
      
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3.2, 0.1, 1.7]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <mesh ref={screenRef} position={[0, 1.3, -0.5]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[2, 1.2, 0.08]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive={[0.1, 0.4, 0.8] as [number, number, number]}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <mesh position={[-0.8, 1.3, -0.46]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshBasicMaterial color="#00B42A" transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[0.8, 1.3, -0.46]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshBasicMaterial color="#165DFF" transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[-1, 0.75, 0.6]}>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[-1, 1.05, 0.6]}>
        <boxGeometry args={[0.5, 0.05, 0.4]} />
        <meshStandardMaterial color="#fbbf24" emissive={[0.8, 0.6, 0.1] as [number, number, number]} emissiveIntensity={0.3} />
      </mesh>
      
      <mesh position={[1, 0.75, 0.6]}>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[1, 1.05, 0.6]}>
        <boxGeometry args={[0.4, 0.15, 0.3]} />
        <meshStandardMaterial color="#165DFF" emissive={[0.1, 0.4, 1]} emissiveIntensity={0.3} />
      </mesh>
      
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      <mesh position={[0, 2.2, -0.5]}>
        <boxGeometry args={[1.5, 0.15, 0.05]} />
        <meshStandardMaterial color="#165DFF" emissive={[0.1, 0.4, 1]} emissiveIntensity={0.5} />
      </mesh>
      
      <pointLight position={[0, 2, 0]} color="#ffffff" intensity={1} distance={5} />
    </group>
  );
};
