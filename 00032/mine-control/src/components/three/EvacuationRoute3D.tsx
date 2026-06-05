import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EvacuationRoute } from '../../data/types';

interface EvacuationRoute3DProps {
  route: EvacuationRoute;
}

export const EvacuationRoute3D: React.FC<EvacuationRoute3DProps> = ({ route }) => {
  const arrowsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (arrowsRef.current && route.active) {
      arrowsRef.current.children.forEach((arrow, i) => {
        // Animation timing calculation
        void ((state.clock.elapsedTime * 2 + i * 0.5) % 1);
        arrow.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 4 + i) * 0.1;
        arrow.scale.setScalar(0.8 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.2);
      });
    }
  });

  if (!route.active) return null;

  const points = route.points.map(p => new THREE.Vector3(p.x, 0.3, p.z));
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.1, 8, false);

  const arrowCount = 10;

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color={route.color}
          transparent
          opacity={0.6}
        />
      </mesh>

      <group ref={arrowsRef}>
        {Array.from({ length: arrowCount }).map((_, i) => {
          const t = i / arrowCount;
          const position = curve.getPoint(t);
          const tangent = curve.getTangent(t);
          const rotation = Math.atan2(tangent.x, tangent.z);

          return (
            <group key={i} position={[position.x, position.y + 0.5, position.z]}>
              <mesh rotation={[-Math.PI / 2, 0, rotation]}>
                <coneGeometry args={[0.3, 0.6, 4]} />
                <meshBasicMaterial color={route.color} />
              </mesh>
            </group>
          );
        })}
      </group>

      <mesh position={[route.points[0].x, 1, route.points[0].z]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={route.color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[route.points[route.points.length - 1].x, 1, route.points[route.points.length - 1].z]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={0x00ff00} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};
