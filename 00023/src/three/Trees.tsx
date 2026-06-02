import { useMemo } from 'react';
import * as THREE from 'three';

interface TreeProps {
  position: [number, number, number];
  scale?: number;
}

function Tree({ position, scale = 1 }: TreeProps) {
  return (
    <group position={position} scale={scale}>
      {/* 树干 */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.35, 2, 6]} />
        <meshStandardMaterial color="#5D4037" flatShading />
      </mesh>

      {/* 树冠层 - 低多边形风格 */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[1.5, 2, 6]} />
        <meshStandardMaterial color="#2E7D32" flatShading />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[1.2, 1.8, 6]} />
        <meshStandardMaterial color="#388E3C" flatShading />
      </mesh>
      <mesh position={[0, 4.6, 0]} castShadow>
        <coneGeometry args={[0.8, 1.5, 6]} />
        <meshStandardMaterial color="#43A047" flatShading />
      </mesh>
    </group>
  );
}

export default function Trees() {
  const treePositions = useMemo(() => {
    const positions: { pos: [number, number, number]; scale: number }[] = [];
    const trees = [
      { x: 12, z: 8 },
      { x: -15, z: 5 },
      { x: 18, z: -10 },
      { x: -12, z: -12 },
      { x: 8, z: 15 },
      { x: -8, z: 18 },
      { x: 20, z: 12 },
      { x: -20, z: -5 },
      { x: 15, z: -18 },
      { x: -18, z: -18 },
      { x: 25, z: 0 },
      { x: -25, z: 10 },
    ];

    trees.forEach((tree) => {
      const scale = 0.7 + Math.random() * 0.8;
      positions.push({
        pos: [tree.x, 0, tree.z],
        scale,
      });
    });

    return positions;
  }, []);

  return (
    <group>
      {treePositions.map((tree, index) => (
        <Tree key={index} position={tree.pos} scale={tree.scale} />
      ))}
    </group>
  );
}
