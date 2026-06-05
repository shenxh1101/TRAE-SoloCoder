import { useRef, useMemo, useEffect } from 'react';
import { useTrafficStore } from '../../store/useTrafficStore';
import { getVehicleColor } from '../../utils/trafficUtils';
import type { Vehicle } from '../../types';
import * as THREE from 'three';

const dummy = new THREE.Object3D();

function VehicleMesh({ type }: { type: Vehicle['type'] }) {
  const color = getVehicleColor(type);

  if (type === 'bus') {
    return (
      <group>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.8, 0.6, 2.5]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.7, 0.4, 2.2]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.5} roughness={0.3} transparent opacity={0.6} />
        </mesh>
        {[[-0.35, 0.2, 0.9], [0.35, 0.2, 0.9], [-0.35, 0.2, -0.9], [0.35, 0.2, -0.9]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === 'fire' || type === 'ambulance') {
    return (
      <group>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.6, 0.5, 1.8]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.7, -0.3]}>
          <boxGeometry args={[0.55, 0.3, 0.8]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.3]} />
          <meshStandardMaterial
            color={type === 'fire' ? '#FF0000' : '#0000FF'}
            emissive={type === 'fire' ? '#FF0000' : '#0000FF'}
            emissiveIntensity={1}
          />
        </mesh>
        {[[-0.25, 0.15, 0.7], [0.25, 0.15, 0.7], [-0.25, 0.15, -0.7], [0.25, 0.15, -0.7]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.5, 0.35, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.45, -0.1]}>
        <boxGeometry args={[0.45, 0.25, 0.6]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} transparent opacity={0.5} />
      </mesh>
      {[[-0.22, 0.1, 0.45], [0.22, 0.1, 0.45], [-0.22, 0.1, -0.45], [0.22, 0.1, -0.45]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

export function Vehicles() {
  const vehicles = useTrafficStore((state) => state.vehicles);
  const carRef = useRef<THREE.InstancedMesh>(null);
  const busRef = useRef<THREE.InstancedMesh>(null);
  const emergencyRef = useRef<THREE.InstancedMesh>(null);

  const { carData, busData, emergencyData } = useMemo(() => {
    const carData: Vehicle[] = [];
    const busData: Vehicle[] = [];
    const emergencyData: Vehicle[] = [];

    vehicles.forEach((v) => {
      if (v.type === 'car') carData.push(v);
      else if (v.type === 'bus') busData.push(v);
      else emergencyData.push(v);
    });

    return { carData, busData, emergencyData };
  }, [vehicles]);

  useEffect(() => {
    const updateInstances = (ref: THREE.InstancedMesh | null, data: Vehicle[]) => {
      if (!ref) return;
      data.forEach((vehicle, i) => {
        dummy.position.set(...vehicle.position);
        dummy.rotation.set(...vehicle.rotation);
        dummy.updateMatrix();
        ref.setMatrixAt(i, dummy.matrix);
      });
      ref.instanceMatrix.needsUpdate = true;
    };

    updateInstances(carRef.current, carData);
    updateInstances(busRef.current, busData);
    updateInstances(emergencyRef.current, emergencyData);
  }, [carData, busData, emergencyData]);

  return (
    <group>
      <instancedMesh ref={carRef} args={[undefined, undefined, carData.length]}>
        <boxGeometry args={[0.5, 0.35, 1.2]} />
        <meshStandardMaterial color="#A8A8A8" metalness={0.6} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={busRef} args={[undefined, undefined, busData.length]}>
        <boxGeometry args={[0.8, 0.6, 2.5]} />
        <meshStandardMaterial color="#2563EB" metalness={0.3} roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={emergencyRef} args={[undefined, undefined, emergencyData.length]}>
        <boxGeometry args={[0.6, 0.5, 1.8]} />
        <meshStandardMaterial color="#DC2626" metalness={0.4} roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
