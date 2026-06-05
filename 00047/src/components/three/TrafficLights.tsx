import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTrafficStore } from '../../store/useTrafficStore';
import type { Direction, Intersection, EmergencyRoute, BusPriority } from '../../types';
import * as THREE from 'three';

const directionOffsets: Record<Direction, [number, number, number]> = {
  north: [0, 2, -3],
  south: [0, 2, 3],
  east: [-3, 2, 0],
  west: [3, 2, 0],
};

type LightColor = 'red' | 'yellow' | 'green';

function TrafficLight({ position, direction, color, remainingTime, hasEmergency, hasBusPriority }: {
  position: [number, number, number];
  direction: Direction;
  color: LightColor;
  remainingTime: number;
  hasEmergency: boolean;
  hasBusPriority: boolean;
}) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      if (hasEmergency) {
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
      } else if (hasBusPriority) {
        material.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 5) * 0.15;
      } else {
        material.opacity = 0.4;
      }
    }
  });

  const offset = directionOffsets[direction];
  const lightPosition: [number, number, number] = [
    position[0] + offset[0],
    position[1] + offset[1],
    position[2] + offset[2],
  ];

  const colors: Record<LightColor, string> = {
    red: '#FF0000',
    yellow: '#FFFF00',
    green: '#00FF00',
  };

  const activeColor = colors[color];
  const glowIntensity = hasEmergency ? 2 : hasBusPriority ? 1.5 : 1;

  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(activeColor),
    transparent: true,
    opacity: 0.4,
  }), [activeColor]);

  return (
    <group position={lightPosition}>
      <mesh>
        <boxGeometry args={[0.4, 1.2, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0.35, 0.16]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color === 'red' ? activeColor : '#333'}
          emissive={color === 'red' ? activeColor : '#000'}
          emissiveIntensity={(color === 'red' ? 1 : 0) * glowIntensity}
        />
      </mesh>
      {color === 'red' && (
        <mesh ref={glowRef} position={[0, 0.35, 0.16]} material={glowMaterial}>
          <sphereGeometry args={[0.25 * glowIntensity, 16, 16]} />
        </mesh>
      )}
      <mesh position={[0, 0, 0.16]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color === 'yellow' ? activeColor : '#333'}
          emissive={color === 'yellow' ? activeColor : '#000'}
          emissiveIntensity={(color === 'yellow' ? 1 : 0) * glowIntensity}
        />
      </mesh>
      {color === 'yellow' && (
        <mesh ref={glowRef} position={[0, 0, 0.16]} material={glowMaterial}>
          <sphereGeometry args={[0.25 * glowIntensity, 16, 16]} />
        </mesh>
      )}
      <mesh position={[0, -0.35, 0.16]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color === 'green' ? activeColor : '#333'}
          emissive={color === 'green' ? activeColor : '#000'}
          emissiveIntensity={(color === 'green' ? 1 : 0) * glowIntensity}
        />
      </mesh>
      {color === 'green' && (
        <mesh ref={glowRef} position={[0, -0.35, 0.16]} material={glowMaterial}>
          <sphereGeometry args={[0.25 * glowIntensity, 16, 16]} />
        </mesh>
      )}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
    </group>
  );
}

function isIntersectionOnEmergencyRoute(intersection: Intersection, emergencyRoutes: EmergencyRoute[]): boolean {
  return emergencyRoutes.some((route) => {
    if (!route.active) return false;
    
    const allPoints = [route.start, ...route.waypoints, route.end];
    return allPoints.some((point) => {
      const dist = Math.sqrt(
        Math.pow(point[0] - intersection.position[0], 2) +
        Math.pow(point[2] - intersection.position[2], 2)
      );
      return dist < 20;
    });
  });
}

function getBusPriorityForIntersection(intersectionId: string, busPriorities: BusPriority[]): BusPriority | undefined {
  return busPriorities.find((bp) => bp.intersectionId === intersectionId && bp.approaching);
}

function IntersectionLights({ 
  position, 
  signalTiming, 
  hasEmergency, 
  busPriority 
}: {
  position: [number, number, number];
  signalTiming: {
    currentPhase: Direction;
    remainingTime: number;
  };
  hasEmergency: boolean;
  busPriority?: BusPriority;
}) {
  const { currentPhase, remainingTime } = signalTiming;

  const getLightColor = (dir: Direction): LightColor => {
    if (hasEmergency) {
      return 'green';
    }

    const opposite: Record<Direction, Direction> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };

    if (busPriority && (dir === currentPhase || opposite[dir] === currentPhase)) {
      return 'green';
    }

    if (dir === currentPhase || opposite[dir] === currentPhase) {
      if (remainingTime <= 3) return 'yellow';
      return 'green';
    }
    return 'red';
  };

  const getRemainingTime = (dir: Direction): number => {
    const opposite: Record<Direction, Direction> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    if (busPriority && (dir === currentPhase || opposite[dir] === currentPhase)) {
      return remainingTime + busPriority.extendedTime;
    }
    return remainingTime;
  };

  const directions: Direction[] = ['north', 'south', 'east', 'west'];

  return (
    <group>
      {directions.map((dir) => (
        <TrafficLight
          key={dir}
          position={position}
          direction={dir}
          color={getLightColor(dir)}
          remainingTime={getRemainingTime(dir)}
          hasEmergency={hasEmergency}
          hasBusPriority={!!busPriority && (dir === currentPhase || dir === { north: 'south', south: 'north', east: 'west', west: 'east' }[currentPhase])}
        />
      ))}
    </group>
  );
}

interface TrafficLightsProps {
  intersections?: Intersection[];
  emergencyRoute?: EmergencyRoute[];
  busPriorities?: BusPriority[];
}

export function TrafficLights({ intersections, emergencyRoute, busPriorities }: TrafficLightsProps) {
  const storeIntersections = useTrafficStore((state) => state.intersections);
  const storeEmergencyRoutes = useTrafficStore((state) => state.emergencyRoutes);
  const storeBusPriorities = useTrafficStore((state) => state.busPriorities);

  const actualIntersections = intersections ?? storeIntersections;
  const actualEmergencyRoutes = emergencyRoute ?? storeEmergencyRoutes;
  const actualBusPriorities = busPriorities ?? storeBusPriorities;

  return (
    <group>
      {actualIntersections.map((intersection) => {
        const hasEmergency = isIntersectionOnEmergencyRoute(intersection, actualEmergencyRoutes);
        const busPriority = getBusPriorityForIntersection(intersection.id, actualBusPriorities);
        
        return (
          <IntersectionLights
            key={intersection.id}
            position={intersection.position}
            signalTiming={intersection.signalTiming}
            hasEmergency={hasEmergency}
            busPriority={busPriority}
          />
        );
      })}
    </group>
  );
}
