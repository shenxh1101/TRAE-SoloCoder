import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGlassBallStore } from '@/store/useGlassBallStore';
import { ItemModelFactory } from '@/components/ItemModels';

function GlassBallShell({ color }: { color: string }) {
  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[1.8, 64, 64]} />
      <meshPhysicalMaterial
        transparent
        opacity={0.25}
        color={color}
        roughness={0.05}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        envMapIntensity={1}
        side={THREE.DoubleSide}
        transmission={0.6}
        thickness={0.5}
      />
    </mesh>
  );
}

function FloatingItem({ item, onClick }: { item: ReturnType<typeof useGlassBallStore.getState>['items'][number]; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const offset = useMemo(() => item.id.charCodeAt(0) % 10, [item.id]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      ref.current.position.x = item.position[0] + Math.sin(t * 0.4 + offset) * 0.1;
      ref.current.position.y = item.position[1] + Math.sin(t * 0.6 + offset) * 0.15;
      ref.current.position.z = item.position[2] + Math.cos(t * 0.4 + offset) * 0.1;
      ref.current.rotation.y = t * 0.3 + offset;
    }
  });

  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <group scale={1.5}>
        <ItemModelFactory modelType={item.modelType} color={item.isCustom ? '#ff6600' : undefined} />
      </group>
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function GlassBall() {
  const items = useGlassBallStore((s) => s.items);
  const color = useGlassBallStore((s) => s.color);
  const isGenerated = useGlassBallStore((s) => s.isGenerated);
  const selectItem = useGlassBallStore((s) => s.selectItem);
  const setShowItemTooltip = useGlassBallStore((s) => s.setShowItemTooltip);

  if (!isGenerated) return null;

  return (
    <group>
      <GlassBallShell color={color} />
      <pointLight position={[0, 0, 0]} color={color} intensity={1} distance={5} />
      <pointLight position={[2, 2, 2]} color="#ffffff" intensity={0.5} distance={5} />
      {items.map((item) => (
        <FloatingItem
          key={item.id}
          item={item}
          onClick={() => {
            selectItem(item);
            setShowItemTooltip(true);
          }}
        />
      ))}
    </group>
  );
}
