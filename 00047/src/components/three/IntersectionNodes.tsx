import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useTrafficStore } from '../../store/useTrafficStore';
import { getCongestionColor, getCongestionLevel } from '../../utils/trafficUtils';
import * as THREE from 'three';

function IntersectionNode({ position, name, trafficFlow, congestionIndex, avgDelay }: {
  position: [number, number, number];
  name: string;
  trafficFlow: { north: number; south: number; east: number; west: number };
  congestionIndex: number;
  avgDelay: number;
}) {
  const totalFlow = trafficFlow.north + trafficFlow.south + trafficFlow.east + trafficFlow.west;
  const color = getCongestionColor(congestionIndex);
  const level = getCongestionLevel(congestionIndex);

  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.3,
  }), [color]);

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={glowMaterial}>
        <cylinderGeometry args={[2, 2, 0.01, 16]} />
      </mesh>
      <Html position={[0, 3, 0]} center distanceFactor={20}>
        <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/50 min-w-[180px]">
          <div className="text-cyan-400 font-bold text-sm mb-2">{name}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-300">流量:</div>
            <div className="text-white font-mono">{totalFlow} pcu/h</div>
            <div className="text-gray-300">拥堵:</div>
            <div style={{ color }} className="font-bold">{level}</div>
            <div className="text-gray-300">延误:</div>
            <div className="text-yellow-400 font-mono">{avgDelay.toFixed(1)}s</div>
          </div>
        </div>
      </Html>
    </group>
  );
}

export function IntersectionNodes() {
  const intersections = useTrafficStore((state) => state.intersections);

  return (
    <group>
      {intersections.map((intersection) => (
        <IntersectionNode
          key={intersection.id}
          position={intersection.position}
          name={intersection.name}
          trafficFlow={intersection.trafficFlow}
          congestionIndex={intersection.congestionIndex}
          avgDelay={intersection.avgDelay}
        />
      ))}
    </group>
  );
}
