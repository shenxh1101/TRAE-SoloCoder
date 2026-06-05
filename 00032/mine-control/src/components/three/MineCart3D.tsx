import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MineCart } from '../../data/types';
import { useMineStore } from '../../store/useMineStore';

interface MineCart3DProps {
  cart: MineCart;
}

const INTERSECTIONS = [
  { id: 'int1', position: { x: 0, y: 0, z: -40 }, radius: 8 },
  { id: 'int2', position: { x: 0, y: 0, z: -80 }, radius: 8 },
  { id: 'int3', position: { x: 0, y: 0, z: 0 }, radius: 8 },
];

export const MineCart3D: React.FC<MineCart3DProps> = ({ cart }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const setSelectedCart = useMineStore((state) => state.setSelectedCart);
  const updateCartPosition = useMineStore((state) => state.updateCartPosition);
  const intersectionQueues = useMineStore((state) => state.intersectionQueues);

  const isNearIntersection = () => {
    for (const intersection of INTERSECTIONS) {
      const dx = cart.position.x - intersection.position.x;
      const dz = cart.position.z - intersection.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < intersection.radius) {
        return intersection.id;
      }
    }
    return null;
  };

  const shouldWait = (intersectionId: string): boolean => {
    const queue = intersectionQueues[intersectionId] || [];
    if (queue.length <= 1) return false;
    return queue[0].cartId !== cart.id;
  };

  useFrame((_, delta) => {
    if (groupRef.current && cart.status === 'transporting' && cart.route.length > 0) {
      const intersectionId = isNearIntersection();
      
      if (intersectionId && shouldWait(intersectionId)) {
        return;
      }

      const currentTarget = cart.route[cart.routeIndex];
      if (currentTarget) {
        const currentPos = new THREE.Vector3(
          cart.position.x,
          cart.position.y,
          cart.position.z
        );
        const targetPos = new THREE.Vector3(
          currentTarget.x,
          currentTarget.y,
          currentTarget.z
        );
        
        const direction = targetPos.clone().sub(currentPos).normalize();
        const distance = currentPos.distanceTo(targetPos);
        
        if (distance < 0.5) {
          const nextIndex = cart.routeIndex + 1;
          if (nextIndex >= cart.route.length) {
            useMineStore.setState((state) => ({
              mineCarts: state.mineCarts.map((c) =>
                c.id === cart.id
                  ? { ...c, status: 'idle' as const, route: [], routeIndex: 0, currentTask: null }
                  : c
              ),
            }));
          } else {
            updateCartPosition(cart.id, currentTarget, cart.rotation, nextIndex);
          }
        } else {
          const speed = cart.speed * delta * 5;
          const newPos = currentPos.add(direction.multiplyScalar(speed));
          const rotation = Math.atan2(direction.x, direction.z);
          updateCartPosition(cart.id, { x: newPos.x, y: newPos.y, z: newPos.z }, rotation, cart.routeIndex);
        }
      }
    }
  });

  const statusColors: Record<string, string> = {
    idle: '#888888',
    transporting: '#00D4FF',
    loading: '#FFD700',
    unloading: '#FF9900',
  };

  const loadPercentage = (cart.load / cart.maxLoad) * 100;

  const routeLines = useMemo(() => {
    if (cart.route.length < 2 || cart.status !== 'transporting') return [];
    const lines: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    for (let i = Math.max(0, cart.routeIndex - 1); i < cart.route.length - 1; i++) {
      lines.push({
        start: new THREE.Vector3(cart.route[i].x, 0.3, cart.route[i].z),
        end: new THREE.Vector3(cart.route[i + 1].x, 0.3, cart.route[i + 1].z),
      });
    }
    return lines;
  }, [cart.route, cart.routeIndex, cart.status]);

  const isQueuing = (() => {
    const intId = isNearIntersection();
    if (!intId) return false;
    return shouldWait(intId);
  })();

  return (
    <group
      ref={groupRef}
      position={[cart.position.x, cart.position.y, cart.position.z]}
      rotation={[0, cart.rotation, 0]}
    >
      <group
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedCart(cart);
        }}
      >
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[2.5, 1.2, 3.5]} />
          <meshStandardMaterial
            color={0x5a4a3a}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>

        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[2.3, 0.1, 3.3]} />
          <meshStandardMaterial
            color={0x3a3a3a}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[2.8, 0.6, 3.8]} />
          <meshStandardMaterial
            color={0x2a2a2a}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 1.2, 0.2, 1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
              <meshStandardMaterial color={0x1a1a1a} />
            </mesh>
            <mesh position={[side * 1.2, 0.2, -1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
              <meshStandardMaterial color={0x1a1a1a} />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 0.8, 1.8]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshBasicMaterial color={statusColors[cart.status]} />
        </mesh>

        <mesh position={[0, 0.3 + loadPercentage / 100 * 0.5, 0]}>
          <boxGeometry args={[2.6, loadPercentage / 100 * 1, 3.6]} />
          <meshStandardMaterial
            color={0x4a3a2a}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {(hovered || cart.status === 'transporting') && (
        <Html position={[0, 2.5, 0]} center distanceFactor={15}>
          <div className="bg-mine-gray/90 border border-mine-blue rounded px-2 py-1 text-xs whitespace-nowrap">
            <div className="font-bold text-mine-blue">{cart.number}</div>
            <div className="text-gray-300">
              载重: <span className="text-white">{cart.load}/{cart.maxLoad}吨</span>
            </div>
            <div style={{ color: statusColors[cart.status] }}>
              {cart.status === 'transporting' ? '运输中' :
               cart.status === 'loading' ? '装载中' :
               cart.status === 'unloading' ? '卸载中' : '空闲'}
            </div>
            {cart.currentTask && (
              <div className="text-gray-400 mt-1">
                {cart.currentTask.from} → {cart.currentTask.to}
              </div>
            )}
            {isQueuing && (
              <div className="text-yellow-400 mt-1 animate-pulse">
                ⏳ 排队等待通行
              </div>
            )}
          </div>
        </Html>
      )}

      {routeLines.length > 0 && cart.status === 'transporting' && (
        <group>
          {routeLines.map((line, i) => {
            const geometry = new THREE.BufferGeometry().setFromPoints([line.start, line.end]);
            const material = new THREE.LineDashedMaterial({
              color: 0x0088ff,
              dashSize: 1,
              gapSize: 0.5,
              transparent: true,
              opacity: 0.7,
            });
            const lineObj = new THREE.Line(geometry, material);
            lineObj.computeLineDistances();
            return <primitive key={i} object={lineObj} />;
          })}
        </group>
      )}
    </group>
  );
};
