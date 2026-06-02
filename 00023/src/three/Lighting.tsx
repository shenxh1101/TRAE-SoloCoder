import { useMemo } from 'react';
import { usePagodaStore } from '@/store/usePagodaStore';

export default function Lighting() {
  const { sunPosition, shadowsEnabled } = usePagodaStore((state) => state.config);

  const lightHelperSize = useMemo(() => 5, []);

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.4} color="#ffffff" />

      {/* 主方向光 - 模拟阳光 */}
      <directionalLight
        position={[sunPosition.x, sunPosition.y, sunPosition.z]}
        intensity={1.2}
        castShadow={shadowsEnabled}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />

      {/* 半球光 - 天空和地面反射 */}
      <hemisphereLight
        color="#87CEEB"
        groundColor="#3d6b3d"
        intensity={0.5}
      />

      {/* 补光 - 减少暗部死黑 */}
      <pointLight
        position={[-20, 15, -20]}
        intensity={0.3}
        color="#ffeedd"
      />
    </>
  );
}
