import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { ColdStorage as ColdStorageType } from '@/types';
import { useBloodBankStore } from '@/store';
import { websocketService } from '@/services/websocketService';

interface ColdStorageProps {
  coldStorage?: ColdStorageType;
  onClick?: () => void;
}

export const ColdStorage: React.FC<ColdStorageProps> = ({ coldStorage: propColdStorage, onClick }) => {
  const groupRef = useRef<any>(null);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const storeColdStorage = useBloodBankStore(state => state.coldStorage);
  
  useEffect(() => {
    const handleTemperature = (data: any) => {
      const coldStorageData = data.coldStorage || data;
      const temperature = coldStorageData.currentTemperature ?? coldStorageData.temperature ?? 4;
      const alertStatus = coldStorageData.status ?? coldStorageData.alertStatus ?? 'normal';
      const backupCoolingActive = coldStorageData.isBackupCoolingActive ?? coldStorageData.backupCoolingActive ?? false;
      
      useBloodBankStore.setState((state) => ({
        coldStorage: {
          ...state.coldStorage,
          currentTemperature: temperature,
          alertStatus: alertStatus,
          backupCoolingActive: backupCoolingActive,
          lastUpdate: new Date().toISOString()
        }
      }));
    };

    websocketService.onTemperature(handleTemperature);
    
    return () => {
      websocketService.removeAllListeners();
    };
  }, []);

  const coldStorage = propColdStorage || storeColdStorage;
  const isWarning = coldStorage.alertStatus === 'warning';
  const isCritical = coldStorage.alertStatus === 'critical';
  const isAlert = isWarning || isCritical;
  const isBackupCoolingActive = coldStorage.backupCoolingActive;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (isCritical) {
      setPulseIntensity((Math.sin(time * 3) + 1) / 2);
    } else if (isWarning) {
      setPulseIntensity((Math.sin(time * 1.5) + 1) / 2 * 0.5);
    } else {
      setPulseIntensity(0);
    }
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.02;
    }
  });

  const getWallColor = (): [number, number, number] => {
    if (isCritical) {
      const r = 0.8 + pulseIntensity * 0.2;
      const g = 0.1 + pulseIntensity * 0.1;
      const b = 0.1;
      return [r, g, b];
    }
    if (isWarning) {
      const r = 0.7 + pulseIntensity * 0.2;
      const g = 0.2 + pulseIntensity * 0.2;
      const b = 0.1;
      return [r, g, b];
    }
    return [0.2, 0.4, 0.6];
  };

  const getEmissiveColor = (): [number, number, number] => {
    if (isCritical) {
      return [1, 0, 0];
    }
    if (isWarning) {
      return [1, 0.5, 0];
    }
    return [0.1, 0.3, 0.5];
  };

  return (
    <group
      ref={groupRef}
      position={[coldStorage.position3D.x, coldStorage.position3D.y, coldStorage.position3D.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[6, 4, 5]} />
        <meshStandardMaterial
          color={getWallColor()}
          emissive={getEmissiveColor()}
          emissiveIntensity={isCritical ? 0.3 + pulseIntensity * 0.5 : 0.1}
          transparent
          opacity={0.15}
          side={2}
        />
      </mesh>
      
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.8, 4.8]} />
        <meshStandardMaterial
          color="#1e3a5f"
          emissive={[0.1, 0.3, 0.5]}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      <mesh position={[0, 2, 2.51]}>
        <boxGeometry args={[2, 3, 0.1]} />
        <meshStandardMaterial
          color={
            isCritical ? '#4a1515' :
            isWarning ? '#5c3d1e' :
            '#1e3a5f'
          }
          emissive={getEmissiveColor()}
          emissiveIntensity={isCritical ? 0.5 : isWarning ? 0.3 : 0.15}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[6.2, 0.3, 5.2]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[-1.5, 2, 2.5]}>
        <boxGeometry args={[0.08, 0.3, 0.1]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      
      <mesh position={[1.5, 3.5, 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
        <meshStandardMaterial
          color={isBackupCoolingActive ? '#3b82f6' : '#64748b'}
          emissive={isBackupCoolingActive ? [0.2, 0.4, 1] : [0, 0, 0]}
          emissiveIntensity={isBackupCoolingActive ? 0.8 : 0}
        />
      </mesh>
      
      <pointLight
        position={[0, 3, 0]}
        color={
          isBackupCoolingActive ? '#3b82f6' :
          isCritical ? '#ff0000' :
          isWarning ? '#ffa500' :
          '#4da6ff'
        }
        intensity={isCritical ? 2 + pulseIntensity * 2 : isWarning ? 1.5 : 1}
        distance={8}
      />
      
      {isBackupCoolingActive && (
        <>
          <mesh position={[2, 3.8, 0]}>
            <torusGeometry args={[0.2, 0.05, 8, 16]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
          </mesh>
          <pointLight
            position={[2, 3.8, 0]}
            color="#3b82f6"
            intensity={1.5}
            distance={5}
          />
        </>
      )}
    </group>
  );
};
