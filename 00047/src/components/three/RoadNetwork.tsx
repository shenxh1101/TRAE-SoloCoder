import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useTrafficStore } from '../../store/useTrafficStore';
import { getCongestionColor } from '../../utils/trafficUtils';

export function RoadNetwork() {
  const roads = useTrafficStore((state) => state.roads);

  const roadData = useMemo(() => {
    return roads.map((road) => ({
      id: road.id,
      points: [road.start, road.end] as [[number, number, number], [number, number, number]],
      color: getCongestionColor(road.congestionIndex),
      lineWidth: road.isClosed ? 0.5 : road.lanes * 1.5,
      opacity: road.isClosed ? 0.3 : 1,
    }));
  }, [roads]);

  return (
    <group>
      {roadData.map((road) => (
        <Line
          key={road.id}
          points={road.points}
          color={road.color}
          lineWidth={road.lineWidth}
          transparent
          opacity={road.opacity}
        />
      ))}
    </group>
  );
}
