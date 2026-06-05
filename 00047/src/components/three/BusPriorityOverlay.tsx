import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTrafficStore } from '../../store/useTrafficStore';
import * as THREE from 'three';

const directionRotations: Record<string, [number, number, number]> = {
  north: [0, 0, 0],
  south: [0, Math.PI, 0],
  east: [0, -Math.PI / 2, 0],
  west: [0, Math.PI / 2, 0],
};

function ArrowIndicator({ position, direction, lane }: {
  position: [number, number, number];
  direction: string;
  lane: number;
}) {
  const arrowRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (arrowRef.current) {
      const time = state.clock.elapsedTime;
      const pulse = Math.sin(time * 6) * 0.5 + 0.5;
      arrowRef.current.scale.setScalar(0.8 + pulse * 0.4);
      arrowRef.current.position.y = 0.2 + pulse * 0.3;
    }
    if (glowRef.current) {
      const time = state.clock.elapsedTime;
      const pulse = Math.sin(time * 4) * 0.5 + 0.5;
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + pulse * 0.4;
    }
  });

  const rotation = directionRotations[direction] || [0, 0, 0];
  const laneOffset = lane * 2 - 1;
  const arrowPosition: [number, number, number] = [
    position[0] + (direction === 'east' || direction === 'west' ? 0 : laneOffset),
    position[1] + 0.5,
    position[2] + (direction === 'north' || direction === 'south' ? 0 : laneOffset),
  ];

  return (
    <group ref={arrowRef} position={arrowPosition} rotation={rotation}>
      <mesh ref={glowRef}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 8]} />
        <meshBasicMaterial color="#00FF00" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 1.5, 4]} />
        <meshStandardMaterial
          color="#00FF00"
          emissive="#00FF00"
          emissiveIntensity={1}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.6, 0.2, 1]} />
        <meshStandardMaterial
          color="#00FF00"
          emissive="#00FF00"
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

export function BusPriorityOverlay() {
  const busPriorities = useTrafficStore((state) => state.busPriorities);
  const intersections = useTrafficStore((state) => state.intersections);
  const vehicles = useTrafficStore((state) => state.vehicles);

  const activePriorities = useMemo(() => {
    return busPriorities
      .filter(bp => bp.approaching)
      .map(bp => {
        const intersection = intersections.find(i => i.id === bp.intersectionId);
        const bus = vehicles.find(v => v.id === bp.busId);
        if (!intersection || !bus) return null;

        const dx = bus.position[0] - intersection.position[0];
        const dz = bus.position[2] - intersection.position[2];
        let direction = 'north';
        if (Math.abs(dx) > Math.abs(dz)) {
          direction = dx < 0 ? 'east' : 'west';
        } else {
          direction = dz < 0 ? 'north' : 'south';
        }

        return {
          id: `${bp.intersectionId}-${bp.busId}`,
          position: intersection.position,
          direction,
          lane: bp.lane,
          extendedTime: bp.extendedTime,
        };
      })
      .filter(Boolean);
  }, [busPriorities, intersections, vehicles]);

  return (
    <group>
      {activePriorities.map((ap) => ap && (
        <ArrowIndicator
          key={ap.id}
          position={ap.position}
          direction={ap.direction}
          lane={ap.lane}
        />
      ))}
    </group>
  );
}
