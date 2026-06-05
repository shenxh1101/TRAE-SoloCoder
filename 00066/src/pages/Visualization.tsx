import { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Maximize2, 
  Camera,
  Layers,
  Thermometer,
  Activity
} from 'lucide-react';

function RoomModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 轻微呼吸动画效果
      meshRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#1a365d" transparent opacity={0.6} />
      </mesh>

      {/* 后墙 */}
      <mesh position={[0, 2, -4]} receiveShadow>
        <boxGeometry args={[10, 4, 0.1]} />
        <meshStandardMaterial color="#2d3748" transparent opacity={0.7} wireframe />
      </mesh>

      {/* 前墙 */}
      <mesh ref={meshRef} position={[0, 2, 4]}>
        <boxGeometry args={[10, 4, 0.1]} />
        <meshStandardMaterial 
          color="#00D4FF" 
          transparent 
          opacity={0.35}
          emissive="#00D4FF"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* 左墙 */}
      <mesh position={[-5, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[8, 4, 0.1]} />
        <meshStandardMaterial color="#2d3748" transparent opacity={0.7} wireframe />
      </mesh>

      {/* 右墙 */}
      <mesh position={[5, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[8, 4, 0.1]} />
        <meshStandardMaterial color="#2d3748" transparent opacity={0.7} wireframe />
      </mesh>

      {/* 天花板 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#1a365d" transparent opacity={0.4} />
      </mesh>

      {/* 声源位置 - 发光球体 */}
      <mesh position={[2, 1.5, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial 
          color="#00FFCC" 
          emissive="#00FFCC"
          emissiveIntensity={2}
        />
      </mesh>

      {/* 声波扩散效果 */}
      {[1, 2, 3].map((i) => (
        <mesh key={i} position={[2, 1.5, 0]}>
          <sphereGeometry args={[0.3 + i * 0.4, 32, 32]} />
          <meshStandardMaterial 
            color="#00D4FF" 
            transparent 
            opacity={0.05 / i}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* 测点标记 */}
      {[
        [-3, 1, -2],
        [0, 1, 0],
        [3, 1, 2],
        [-3, 1, 2],
        [3, 1, -2],
      ].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshBasicMaterial color="#FF9800" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SPLHeatmap() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 动态热力图效果
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.color.setHSL(
        0.55 + Math.sin(state.clock.elapsedTime + meshRef.current.position.x) * 0.1,
        0.8,
        0.5
      );
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <planeGeometry args={[10, 8, 20, 20]} />
      <meshBasicMaterial 
        color="#00D4FF" 
        transparent 
        opacity={0.3}
        side={THREE.DoubleSide}
        wireframe
      />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8}
        castShadow
      />
      <pointLight 
        position={[2, 3, 0]} 
        intensity={1} 
        color="#00D4FF"
        distance={15}
      />

      <RoomModel />
      <SPLHeatmap />

      <Grid 
        args={[20, 20]}
        position={[0, -0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d3748"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#00D4FF"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
      />

      <OrbitControls 
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
      />

      <Environment preset="night" />
    </>
  );
}

export default function Visualization() {
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'side'>('3d');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMeasurePoints, setShowMeasurePoints] = useState(true);

  const viewModes = [
    { id: '3d', label: '3D视图', icon: RotateCcw },
    { id: 'top', label: '俯视图', icon: Maximize2 },
    { id: 'side', label: '侧视图', icon: Camera },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">声场可视化</h1>
          <p className="text-gray-400 text-sm">实时查看房间声压级分布、等声级线和热力图</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="status-dot status-running"></span>
          <span className="text-sm font-mono text-gray-400">实时渲染</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-card overflow-hidden" style={{ height: '600px' }}>
          <Canvas
            camera={{ position: [12, 8, 12], fov: 50 }}
            shadows
            gl={{ antialias: true, alpha: true }}
          >
            <color attach="background" args={['#000510']} />
            <fog attach="fog" args={['#000510', 15, 30]} />
            
            <Suspense fallback={null}>
              <SceneContent />
            </Suspense>
          </Canvas>

          <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`p-2 rounded-lg backdrop-blur-md transition-all ${
                    viewMode === mode.id
                      ? 'bg-acoustic-cyber/20 border border-acoustic-cyber text-acoustic-cyber'
                      : 'bg-acoustic-navy/60 border border-acoustic-steel/30 text-gray-400 hover:text-white'
                  }`}
                  title={mode.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>

          <div className="absolute top-4 right-4 space-y-2 z-10">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2 rounded-lg backdrop-blur-md text-xs font-mono transition-all ${
                showHeatmap
                  ? 'bg-acoustic-warning/20 border border-acoustic-warning text-acoustic-warning'
                  : 'bg-acoustic-navy/60 border border-acoustic-steel/30 text-gray-400'
              }`}
            >
              <Thermometer className="w-4 h-4 inline mr-1" />
              热力图
            </button>
            
            <button
              onClick={() => setShowMeasurePoints(!showMeasurePoints)}
              className={`px-3 py-2 rounded-lg backdrop-blur-md text-xs font-mono transition-all block ${
                showMeasurePoints
                  ? 'bg-acoustic-success/20 border border-acoustic-success text-acoustic-success'
                  : 'bg-acoustic-navy/60 border border-acoustic-steel/30 text-gray-400'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-1" />
              测点
            </button>
          </div>

          <div className="absolute bottom-4 left-4 glass-card p-3 z-10">
            <div className="text-xs font-mono space-y-1">
              <div className="flex items-center justify-between space-x-4">
                <span className="text-gray-400">最大SPL:</span>
                <span className="data-value text-acoustic-danger">82.3 dBA</span>
              </div>
              <div className="flex items-center justify-between space-x-4">
                <span className="text-gray-400">平均SPL:</span>
                <span className="data-value text-acoustic-cyber">76.8 dBA</span>
              </div>
              <div className="flex items-center justify-between space-x-4">
                <span className="text-gray-400">均匀度:</span>
                <span className="data-value text-acoustic-success">87.2%</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 glass-card p-3 z-10">
            <div className="text-xs text-gray-400 mb-2">声压级色阶 (dB)</div>
            <div className="w-32 h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500"></div>
            <div className="flex justify-between text-xs font-mono mt-1 text-gray-500">
              <span>65</span>
              <span>85</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider flex items-center">
              <Layers className="w-4 h-4 mr-2 text-acoustic-cyber" />
              图层控制
            </h3>
            <div className="space-y-2">
              {[
                { label: '房间模型', active: true },
                { label: 'SPL热力图', active: showHeatmap },
                { label: '测点标记', active: showMeasurePoints },
                { label: '等声级线', active: true },
                { label: '声源位置', active: true },
              ].map((layer) => (
                <label key={layer.label} className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layer.active}
                    readOnly
                    className="w-4 h-4 rounded border-acoustic-steel bg-acoustic-midnight text-acoustic-cyber 
                             focus:ring-acoustic-cyber focus:ring-offset-0"
                  />
                  <span className={`text-sm ${layer.active ? 'text-white' : 'text-gray-500'} group-hover:text-acoustic-cyber transition-colors`}>
                    {layer.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              视角预设
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['默认视角', '俯视', '侧视', '前视', '声源近景', '角落'].map((view) => (
                <button
                  key={view}
                  className="py-2 px-3 rounded bg-acoustic-midnight/40 hover:bg-acoustic-cyber/10 
                           border border-acoustic-steel/30 hover:border-acoustic-cyber/30 text-xs text-gray-300 
                           hover:text-acoustic-cyber transition-all"
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              当前任务信息
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">房间:</dt>
                <dd className="font-medium text-white">音乐厅A厅</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">频率:</dt>
                <dd className="data-value text-white">1000 Hz</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">状态:</dt>
                <dd className="text-acoustic-cyber">计算完成</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
