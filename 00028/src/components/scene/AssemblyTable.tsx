import { useSceneStore } from '@/store/useSceneStore';

const AssemblyTable = () => {
  const assemblySlots = useSceneStore((state) => state.assemblySlots);

  return (
    <group>
      <mesh position={[6, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.3, 5]} />
        <meshStandardMaterial
          color="#2a3444"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[6, 0.4, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.05, 4.8]} />
        <meshStandardMaterial
          color="#1a2332"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {[[-4.8, -0.5], [-4.8, 0.5], [-4.8, 1.5], [-4.8, -1.5]].map(([z, x], i) => (
        <mesh key={`leg-${i}`} position={[6 + x, -0.3, z]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial
            color="#1a2332"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}

      {assemblySlots.map((slot) => (
        <group key={slot.id} position={slot.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[0.25, 0.35, 32]} />
            <meshStandardMaterial
              color={slot.occupied ? '#00ff88' : '#00d4ff'}
              emissive={slot.occupied ? '#00ff88' : '#00d4ff'}
              emissiveIntensity={0.3}
              transparent
              opacity={0.8}
            />
          </mesh>
          {!slot.occupied && (
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.22, 32]} />
              <meshBasicMaterial
                color="#0a0e17"
                transparent
                opacity={0.5}
              />
            </mesh>
          )}
        </group>
      ))}

      <mesh position={[6, 0.5, -2.2]}>
        <boxGeometry args={[1.5, 0.02, 0.1]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh position={[6, 0.5, 2.2]}>
        <boxGeometry args={[1.5, 0.02, 0.1]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

export default AssemblyTable;
