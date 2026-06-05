import React from 'react';
import type { BloodBag as BloodBagType } from '@/types';
import { BloodBag } from './BloodBag';

interface BloodShelfProps {
  position: [number, number, number];
  bloodBags: BloodBagType[];
  lowStockTypes: Set<string>;
  onBloodBagClick: (bag: BloodBagType) => void;
}

export const BloodShelf: React.FC<BloodShelfProps> = ({
  position,
  bloodBags,
  lowStockTypes,
  onBloodBagClick
}) => {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 3]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.7} />
      </mesh>
      
      <mesh position={[-4.1, 1, 0]}>
        <boxGeometry args={[0.2, 2, 3]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[4.1, 1, 0]}>
        <boxGeometry args={[0.2, 2, 3]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {[0.6, 1.2, 1.8].map((y, shelfIndex) => (
        <mesh key={shelfIndex} position={[0, y, 0]}>
          <boxGeometry args={[8, 0.08, 3]} />
          <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      
      {[0, 1, 2, 3].map(colIdx => (
        <mesh key={`v-${colIdx}`} position={[-3 + colIdx * 2, 1, 1.3]}>
          <boxGeometry args={[0.05, 2, 0.05]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      
      {bloodBags.map(bag => {
        const typeKey = `${bag.bloodType}_${bag.component}`;
        const isLowStock = lowStockTypes.has(typeKey) && bag.status === 'available';
        
        return (
          <BloodBag
            key={bag.id}
            bag={bag}
            onClick={onBloodBagClick}
            isLowStock={isLowStock}
          />
        );
      })}
    </group>
  );
};
