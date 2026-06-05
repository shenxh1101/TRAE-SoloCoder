import React from 'react';
import * as THREE from 'three';
import { tunnelSegments } from '../../data/mockData';

export const Tunnels: React.FC = () => {
  const createTunnelGeometry = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number,
    height: number
  ) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const geometry = new THREE.BoxGeometry(width, height, length);
    geometry.translate(0, height / 2, 0);

    const rotation = new THREE.Euler();
    rotation.setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction.clone().normalize()
      )
    );

    return { geometry, position: center, rotation };
  };

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 1,
    metalness: 0,
  });

  return (
    <group>
      {tunnelSegments.map((segment) => {
        const start = new THREE.Vector3(
          segment.start.x,
          segment.start.y,
          segment.start.z
        );
        const end = new THREE.Vector3(
          segment.end.x,
          segment.end.y,
          segment.end.z
        );
        const { geometry, position, rotation } = createTunnelGeometry(
          start,
          end,
          segment.width,
          segment.height
        );

        return (
          <group key={segment.id}>
            <mesh
              geometry={geometry}
              material={wallMaterial}
              position={[position.x, position.y, position.z]}
              rotation={[rotation.x, rotation.y, rotation.z]}
            >
              <meshStandardMaterial
                color={0x3a3a3a}
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>

            <mesh
              position={[position.x, -0.1, position.z]}
              rotation={[rotation.x, rotation.y, rotation.z]}
            >
              <boxGeometry args={[segment.width, 0.2, end.distanceTo(start)]} />
              <meshStandardMaterial {...floorMaterial} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
