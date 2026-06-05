import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TransportTask } from '@/types';
import { useBloodBankStore } from '@/store';

interface TransportPathProps {
  tasks?: TransportTask[];
}

export const TransportPath: React.FC<TransportPathProps> = ({ tasks }) => {
  const transportTasks = useBloodBankStore(state => state.transportTasks);
  const activeTasks = (tasks || transportTasks).filter(t => t.status === 'in_progress');

  return (
    <group>
      <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 10]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={[0.1, 0.2, 0.4] as [number, number, number]}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[0, 0.03, -1 + i * 1.5]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[0.1, 0.15, 4]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}
      
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`r-${i}`} position={[0, 0.03, 2 + i * 1.5]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[0.1, 0.15, 4]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}
      
      <mesh position={[3, 0.02, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 1.5]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={[0.1, 0.2, 0.4] as [number, number, number]}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`h-${i}`} position={[-1 + i * 2, 0.03, 4]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.15, 4]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}
      
      {activeTasks.map(task => (
        <ActivePath key={task.id} task={task} />
      ))}
    </group>
  );
};

interface ActivePathProps {
  task: TransportTask;
}

const ActivePath: React.FC<ActivePathProps> = ({ task }) => {
  const lineRef = useRef<THREE.Line>(null);
  const [offset, setOffset] = React.useState(0);

  const points = useMemo(() => {
    return task.path.map(p => new THREE.Vector3(p.x, 0.1, p.z));
  }, [task.path]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  useFrame((state) => {
    setOffset((prev) => (prev + 0.02) % 1);
  });

  return (
    <group>
      <primitive
        object={new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial({
            color: 0x00B42A,
            transparent: true,
            opacity: 0.6
          })
        )}
        ref={lineRef as any}
      />
      
      <TrailEffect task={task} offset={offset} />
    </group>
  );
};

interface TrailEffectProps {
  task: TransportTask;
  offset: number;
}

const TrailEffect: React.FC<TrailEffectProps> = ({ task, offset }) => {
  const pos = task.currentPosition;
  
  const getTrailPosition = () => {
    const path = task.path;
    if (path.length < 2) return pos;
    
    const progressIndex = Math.min(
      Math.floor(task.progress * (path.length - 1)),
      path.length - 2
    );
    
    const trailIndex = Math.max(0, progressIndex - 1);
    return path[trailIndex];
  };

  const trailPos = getTrailPosition();

  return (
    <>
      <mesh position={[pos.x, 0.15, pos.z]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#00B42A" transparent opacity={0.9} />
      </mesh>
      
      <mesh position={[pos.x, 0.15, pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.15, 16]} />
        <meshBasicMaterial color="#00B42A" transparent opacity={0.5} />
      </mesh>
      
      <mesh 
        position={[
          (pos.x + trailPos.x) / 2,
          0.1,
          (pos.z + trailPos.z) / 2
        ]}
        rotation={[Math.PI / 2, 0, Math.atan2(pos.z - trailPos.z, pos.x - trailPos.x)]}
      >
        <cylinderGeometry
          args={[0.05, 0.08, 0.02, 8]}
        />
        <meshBasicMaterial color="#00B42A" transparent opacity={0.6} />
      </mesh>
    </>
  );
};
