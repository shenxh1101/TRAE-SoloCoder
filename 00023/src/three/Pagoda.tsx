import { useMemo, useRef, useEffect } from 'react';
import { Cylinder, Cone, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { colorMap, roofColor } from '@/types';
import { usePagodaStore } from '@/store/usePagodaStore';

interface PagodaProps {
  position?: [number, number, number];
}

export default function Pagoda({ position = [0, 0, 0] }: PagodaProps) {
  const { config } = usePagodaStore();
  const { floors, roofAngle, bodyColor, spireType } = config;
  const roofGroupRef = useRef<THREE.Group>(null);

  const floorData = useMemo(() => {
    const result = [];
    const baseHeight = 1.5;
    const floorHeight = 1.2;
    const baseRadius = 2.5;
    const radiusDecay = 0.25;

    for (let i = 0; i < floors; i++) {
      const y = baseHeight + i * floorHeight;
      const radius = baseRadius - i * radiusDecay;
      result.push({ y, radius, height: floorHeight, index: i });
    }
    return result;
  }, [floors]);

  const totalHeight = useMemo(() => {
    const baseHeight = 1.5;
    const floorHeight = 1.2;
    const spireHeight = 2;
    return baseHeight + floors * floorHeight + spireHeight;
  }, [floors]);

  const bodyColorHex = colorMap[bodyColor];

  const createCurvedRoofGeometry = (radius: number, angle: number): THREE.BufferGeometry => {
    const curveAmount = (angle / 45) * 0.5;
    const geometry = new THREE.ConeGeometry(radius, 0.8, 32, 1, true);
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const distFromCenter = Math.sqrt(x * x + z * z);
      const normalizedDist = distFromCenter / radius;
      
      const curve = Math.sin(normalizedDist * Math.PI * 0.5) * curveAmount * radius;
      const newY = y + curve * (y > -0.4 ? 1 : 0);
      
      positions.setY(i, newY);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  };

  const roofGeometries = useMemo(() => {
    return floorData.map((floor) => {
      const outerRadius = floor.radius + 0.9;
      return createCurvedRoofGeometry(outerRadius, roofAngle);
    });
  }, [floorData, roofAngle]);

  useEffect(() => {
    return () => {
      roofGeometries.forEach((geo) => geo.dispose());
    };
  }, [roofGeometries]);

  return (
    <group position={position}>
      {/* 基座 */}
      <Cylinder
        args={[3, 3.5, 1.5, 32]}
        position={[0, 0.75, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#5D4037" />
      </Cylinder>

      {/* 基座台阶 */}
      <Cylinder
        args={[3.8, 4, 0.3, 32]}
        position={[0, 0.15, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#4E342E" />
      </Cylinder>

      {/* 各层塔身和屋檐 */}
      {floorData.map((floor, index) => (
        <group key={`floor-${index}-${floors}`} position={[0, floor.y, 0]}>
          {/* 塔身 */}
          <Cylinder
            args={[floor.radius * 0.85, floor.radius, floor.height, 24]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={bodyColorHex} />
          </Cylinder>

          {/* 屋檐 - 使用动态几何体 */}
          <mesh
            geometry={roofGeometries[index]}
            position={[0, floor.height / 2 + 0.1, 0]}
            rotation={[Math.PI, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={roofColor}
              side={THREE.DoubleSide}
              metalness={0.2}
              roughness={0.8}
            />
          </mesh>

          {/* 屋檐尖端装饰 */}
          <mesh
            position={[0, floor.height / 2 + 0.5, 0]}
            castShadow
          >
            <ringGeometry args={[floor.radius + 0.6, floor.radius + 0.95, 32]} />
            <meshStandardMaterial
              color="#d4af37"
              side={THREE.DoubleSide}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>

          {/* 屋檐下的金色装饰环 */}
          <Cylinder
            args={[floor.radius + 0.55, floor.radius + 0.55, 0.08, 32]}
            position={[0, floor.height / 2 + 0.05, 0]}
            castShadow
          >
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
          </Cylinder>
        </group>
      ))}

      {/* 塔尖基座 */}
      <Cylinder
        args={[0.8, 1.2, 0.5, 16]}
        position={[0, totalHeight - 2.25, 0]}
        castShadow
      >
        <meshStandardMaterial color={roofColor} />
      </Cylinder>

      {/* 塔尖 */}
      {spireType === 'sharp' && (
        <group position={[0, totalHeight - 1.5, 0]}>
          <Cone args={[0.6, 1.8, 16]} castShadow>
            <meshStandardMaterial color={roofColor} />
          </Cone>
          <Sphere args={[0.18, 16, 16]} position={[0, 1.1, 0]}>
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} emissive="#ffd700" emissiveIntensity={0.3} />
          </Sphere>
        </group>
      )}

      {spireType === 'round' && (
        <group position={[0, totalHeight - 1.5, 0]}>
          <Sphere args={[0.9, 32, 32]} castShadow>
            <meshStandardMaterial color={roofColor} />
          </Sphere>
          <Sphere args={[0.18, 16, 16]} position={[0, 1.0, 0]}>
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} emissive="#ffd700" emissiveIntensity={0.3} />
          </Sphere>
        </group>
      )}

      {spireType === 'pearl' && (
        <group position={[0, totalHeight - 1.5, 0]}>
          <Sphere args={[0.7, 32, 32]} castShadow>
            <meshStandardMaterial
              color="#ffd700"
              metalness={0.95}
              roughness={0.05}
              emissive="#ffec8b"
              emissiveIntensity={0.5}
            />
          </Sphere>
          <Sphere args={[0.35, 32, 32]} position={[0, 0.6, 0]}>
            <meshStandardMaterial
              color="#ff4500"
              metalness={0.8}
              roughness={0.2}
              emissive="#ff6347"
              emissiveIntensity={0.4}
            />
          </Sphere>
        </group>
      )}
    </group>
  );
}
