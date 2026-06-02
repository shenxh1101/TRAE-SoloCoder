import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePagodaStore } from '@/store/usePagodaStore';

export default function Ground() {
  const { gridHelper: showGrid } = usePagodaStore((state) => state.config);

  const grassGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.2;
      positions.setZ(i, z);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <group>
      {/* 主地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3d6b3d" />
      </mesh>

      {/* 草地细节层 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={grassGeometry} receiveShadow position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#4a7c4a" />
      </mesh>

      {/* 路径 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <ringGeometry args={[4.5, 6, 64]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* 台阶路径 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -7]} receiveShadow>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#9B8465" />
      </mesh>

      {/* 网格辅助线 */}
      {showGrid && (
        <gridHelper
          args={[100, 50, '#555555', '#333333']}
          position={[0, 0.05, 0]}
        />
      )}
    </group>
  );
}
