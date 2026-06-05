import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useTrafficStore } from '../../store/useTrafficStore';
import * as THREE from 'three';

const colors: Record<string, string> = {
  fire: '#FF4444',
  ambulance: '#4444FF',
};

function FlowingLine({ points, color }: {
  points: [number, number, number][];
  color: string;
}) {
  const lineOpacityRef = useRef(0.8);
  const glowOpacityRef = useRef(0.4);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    lineOpacityRef.current = 0.6 + Math.sin(time * 4) * 0.4;
    glowOpacityRef.current = 0.3 + Math.sin(time * 2) * 0.2;
  });

  const glowPoints = useMemo(() => {
    return points.map(p => [p[0], p[1] + 0.5, p[2]]) as [number, number, number][];
  }, [points]);

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={3}
        transparent
        opacity={lineOpacityRef.current}
      />
      <Line
        points={glowPoints}
        color={color}
        lineWidth={8}
        transparent
        opacity={glowOpacityRef.current}
      />
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function EmergencyPath() {
  const routes = useTrafficStore((state) => state.emergencyRoutes);

  const routeData = useMemo(() => {
    return routes.filter(r => r.active).map(route => {
      const fullPath: [number, number, number][] = [
        route.start,
        ...route.waypoints,
        route.end,
      ];
      return {
        id: route.id,
        points: fullPath,
        color: colors[route.vehicleType] || '#FF4444',
      };
    });
  }, [routes]);

  return (
    <group>
      {routeData.map((route) => (
        <FlowingLine
          key={route.id}
          points={route.points}
          color={route.color}
        />
      ))}
    </group>
  );
}
