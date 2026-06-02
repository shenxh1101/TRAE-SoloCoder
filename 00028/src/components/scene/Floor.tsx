import { useMemo } from 'react';
import * as THREE from 'three';

const Floor = () => {
  const gridHelper = useMemo(() => {
    return new THREE.GridHelper(40, 40, '#2a3444', '#1a2332');
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#0a0e17"
          metalness={0.3}
          roughness={0.9}
        />
      </mesh>

      <primitive object={gridHelper} position={[0, -0.49, 0]} />

      {[[-12, 0], [12, 0], [0, -8], [0, 8]].map(([x, z], i) => (
        <group key={`pillar-${i}`} position={[x, -0.5, z]}>
          <mesh position={[0, 3, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 6, 0.8]} />
            <meshStandardMaterial
              color="#1a2332"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.2, 1.2]} />
            <meshStandardMaterial
              color="#2a3444"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 6.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.2, 1.2]} />
            <meshStandardMaterial
              color="#2a3444"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <pointLight
            position={[0, 5.5, 0]}
            color="#00d4ff"
            intensity={0.5}
            distance={8}
            decay={2}
          />
        </group>
      ))}

      {[-10, -5, 0, 5, 10].map((x, i) => (
        <mesh
          key={`line-${i}`}
          position={[x, -0.48, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.05, 20]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
};

export default Floor;
