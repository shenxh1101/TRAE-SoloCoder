import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { BloodBag as BloodBagType } from '@/types';
import { BLOOD_TYPE_COLORS } from '@/types';

interface BloodBagProps {
  bag: BloodBagType;
  onClick: (bag: BloodBagType) => void;
  isLowStock?: boolean;
}

export const BloodBag: React.FC<BloodBagProps> = ({ bag, onClick, isLowStock }) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);

  const color = BLOOD_TYPE_COLORS[bag.bloodType];
  const isAvailable = bag.status === 'available';
  const isAllocated = bag.status === 'allocated';

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (isLowStock) {
      setPulseIntensity((Math.sin(time * 4) + 1) / 2);
    }
    
    if (hovered && meshRef.current) {
      meshRef.current.position.y = bag.position3D.y + 0.15 + Math.sin(time * 3) * 0.03;
    }
  });

  const getEmissiveColor = (): [number, number, number] => {
    if (isLowStock) {
      const r = 1;
      const g = 0.5 + pulseIntensity * 0.3;
      const b = 0;
      return [r, g, b];
    }
    if (hovered) {
      return [0.2, 0.5, 1];
    }
    return [0, 0, 0];
  };

  return (
    <group
      position={[bag.position3D.x, bag.position3D.y, bag.position3D.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(bag);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh ref={meshRef}>
        <boxGeometry args={[0.3, 0.4, 0.15]} />
        <meshStandardMaterial
          color={color}
          emissive={getEmissiveColor()}
          emissiveIntensity={isLowStock ? 0.5 + pulseIntensity * 0.5 : hovered ? 0.4 : 0.1}
          transparent
          opacity={isAvailable ? 0.85 : isAllocated ? 0.5 : 0.3}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh position={[0, -0.18, 0.08]}>
        <planeGeometry args={[0.25, 0.1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      
      <mesh position={[0, 0, 0.076]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {hovered && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}

      {isLowStock && (
        <mesh position={[0, 0.45, 0]}>
          <ringGeometry args={[0.06, 0.1, 16]} />
          <meshBasicMaterial
            color="#ff7d00"
            transparent
            opacity={0.5 + pulseIntensity * 0.5}
            side={2}
          />
        </mesh>
      )}
    </group>
  );
};
