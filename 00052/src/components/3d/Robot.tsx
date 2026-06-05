import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Robot as RobotType, TransportTask } from '@/types';

interface RobotProps {
  robot: RobotType;
  task?: TransportTask;
}

export const Robot: React.FC<RobotProps> = ({ robot, task }) => {
  const groupRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const [rotation, setRotation] = React.useState(0);

  const position = useMemo(() => {
    if (task && task.status === 'in_progress') {
      return task.currentPosition;
    }
    return robot.currentPosition;
  }, [robot, task]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      groupRef.current.position.set(position.x, position.y, position.z);
      
      if (task && task.status === 'in_progress' && task.path.length >= 2) {
        const path = task.path;
        const segmentProgress = task.progress * (path.length - 1);
        const segmentIndex = Math.min(Math.floor(segmentProgress), path.length - 2);
        const segmentT = segmentProgress - segmentIndex;
        
        const start = path[segmentIndex];
        const end = path[segmentIndex + 1];
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
          const targetRotation = Math.atan2(dx, dz);
          setRotation(targetRotation);
        }
      }
      
      groupRef.current.rotation.y = rotation;
      
      if (robot.status === 'busy') {
        groupRef.current.position.y = position.y + Math.sin(time * 10) * 0.01;
      }
    }
    
    wheelRefs.current.forEach(wheel => {
      if (wheel && robot.status === 'busy') {
        wheel.rotation.x += delta * 10;
      }
    });
  });

  const isBusy = robot.status === 'busy';
  const isCharging = robot.status === 'charging';

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.5]} />
        <meshStandardMaterial
          color={isCharging ? '#22c55e' : isBusy ? '#165DFF' : '#475569'}
          metalness={0.6}
          roughness={0.4}
          emissive={isBusy ? [0.1, 0.4, 1] : isCharging ? [0, 0.7, 0.2] : [0, 0, 0]}
          emissiveIntensity={isBusy || isCharging ? 0.5 : 0}
        />
      </mesh>
      
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.4]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial
          color={isBusy ? '#00B42A' : '#64748b'}
          emissive={isBusy ? [0, 0.7, 0.2] : [0, 0, 0]}
          emissiveIntensity={isBusy ? 0.8 : 0}
        />
      </mesh>
      
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial
          color={isBusy ? '#00B42A' : '#94a3b8'}
        />
      </mesh>
      
      <mesh
        ref={el => { if (el) wheelRefs.current[0] = el; }}
        position={[0.25, 0.08, 0.2]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh
        ref={el => { if (el) wheelRefs.current[1] = el; }}
        position={[-0.25, 0.08, 0.2]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh
        ref={el => { if (el) wheelRefs.current[2] = el; }}
        position={[0.25, 0.08, -0.2]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh
        ref={el => { if (el) wheelRefs.current[3] = el; }}
        position={[-0.25, 0.08, -0.2]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {isBusy && (
        <mesh position={[0, 0.85, 0]}>
          <ringGeometry args={[0.12, 0.15, 16]} />
          <meshBasicMaterial color="#00B42A" transparent opacity={0.6} />
        </mesh>
      )}
      
      {isCharging && (
        <>
          <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.35, 16]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
          </mesh>
          <pointLight position={[0, 0.5, 0]} color="#22c55e" intensity={1} distance={2} />
        </>
      )}
    </group>
  );
};
