import type { ModelType } from '@/data/eraMapping';

export function PhoneModel({ color = '#4A7C59' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 0.18, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.04, 0.016]}>
        <boxGeometry args={[0.07, 0.06, 0.002]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.05, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function TapeModel({ color = '#8B4513' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.13, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.045, 0, 0.016]}>
        <cylinderGeometry args={[0.03, 0.03, 0.01, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.045, 0, 0.016]}>
        <cylinderGeometry args={[0.03, 0.03, 0.01, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

export function TvModel({ color = '#2F4F4F' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.22, 0.18, 0.18]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02, 0.091]}>
        <boxGeometry args={[0.16, 0.12, 0.002]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>
      <mesh position={[-0.06, 0.12, -0.06]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.1, 6]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      <mesh position={[0.06, 0.12, -0.06]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.1, 6]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
    </group>
  );
}

export function CameraModel({ color = '#C4A35A' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.025, 0.06, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

export function ComputerModel({ color = '#5B6B7C' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.05, 0.021]}>
        <boxGeometry args={[0.15, 0.1, 0.002]} />
        <meshStandardMaterial color="#1a2a3a" />
      </mesh>
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.04, 0.04]}>
        <boxGeometry args={[0.16, 0.005, 0.05]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

export function RadioModel({ color = '#8B0000' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.05, -0.03, 0.051]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[0.05, -0.03, 0.051]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 6]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
    </group>
  );
}

export function WalkmanModel({ color = '#4682B4' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.16, 0.1, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.03, 0, 0.016]}>
        <cylinderGeometry args={[0.03, 0.03, 0.01, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

export function FloppyModel({ color = '#708090' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.05, 0.011]}>
        <boxGeometry args={[0.06, 0.04, 0.002]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[0, 0.07, 0.005]}>
        <boxGeometry args={[0.08, 0.02, 0.01]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

export function GameboyModel({ color = '#9370DB' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 0.16, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.04, 0.016]}>
        <boxGeometry args={[0.06, 0.04, 0.002]} />
        <meshStandardMaterial color="#2a3a2a" />
      </mesh>
      <mesh position={[-0.02, -0.03, 0.016]}>
        <boxGeometry args={[0.015, 0.015, 0.005]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.02, -0.03, 0.016]}>
        <boxGeometry args={[0.035, 0.012, 0.005]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

export function CdModel({ color = '#DAA520' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.005, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.006, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

export function PagerModel({ color = '#2E8B57' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.07, 0.1, 0.025]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02, 0.013]}>
        <boxGeometry args={[0.045, 0.03, 0.002]} />
        <meshStandardMaterial color="#1a2a1a" />
      </mesh>
    </group>
  );
}

export function VhsModel({ color = '#696969' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.03, 0.016]}>
        <boxGeometry args={[0.16, 0.03, 0.002]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
    </group>
  );
}

export function NewspaperModel({ color = '#D2B48C' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.18, 0.22, 0.005]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, -0.003]}>
        <boxGeometry args={[0.16, 0.2, 0.005]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function TypewriterModel({ color = '#3C3C3C' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.22, 0.08, 0.16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.05, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 12]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.05, 0.045, 0.081]}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0, 0.045, 0.081]}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0.05, 0.045, 0.081]}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  );
}

export function CustomModel({ color = '#ff6600' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

const modelMap: Record<ModelType, React.FC<{ color?: string }>> = {
  phone: PhoneModel,
  tape: TapeModel,
  tv: TvModel,
  camera: CameraModel,
  computer: ComputerModel,
  radio: RadioModel,
  walkman: WalkmanModel,
  floppy: FloppyModel,
  gameboy: GameboyModel,
  cd: CdModel,
  pager: PagerModel,
  vhs: VhsModel,
  newspaper: NewspaperModel,
  typewriter: TypewriterModel,
  custom: CustomModel,
};

export function ItemModelFactory({ modelType, color }: { modelType: ModelType; color?: string }) {
  const Component = modelMap[modelType];
  return <Component color={color} />;
}
