import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

const purpleToCyan = (t: number): THREE.Color => {
  const clamped = Math.max(0, Math.min(1, t));
  const purple = new THREE.Color('#A855F7');
  const cyan = new THREE.Color('#22D3EE');
  return purple.clone().lerp(cyan, clamped);
};

const redToYellow = (t: number): THREE.Color => {
  const clamped = Math.max(0, Math.min(1, t));
  const red = new THREE.Color('#EF4444');
  const yellow = new THREE.Color('#F59E0B');
  return red.clone().lerp(yellow, clamped);
};

const createSliceShader = (texture: THREE.DataTexture, opacity: number, colorScheme: 'purple-cyan' | 'red-yellow') => {
  const colorMix = colorScheme === 'purple-cyan'
    ? 'vec3 c1 = vec3(0.65, 0.33, 0.97); vec3 c2 = vec3(0.13, 0.83, 0.93);'
    : 'vec3 c1 = vec3(0.94, 0.27, 0.27); vec3 c2 = vec3(0.96, 0.62, 0.04);';
  return new THREE.ShaderMaterial({
    uniforms: { sliceTexture: { value: texture }, opacity: { value: opacity } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D sliceTexture; uniform float opacity; varying vec2 vUv;
      void main() {
        float v = texture2D(sliceTexture, vUv).r;
        ${colorMix}
        vec3 color = mix(c1, c2, clamp(v, 0.0, 1.0));
        gl_FragColor = vec4(color, opacity * (0.2 + v * 0.8));
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
};

const createVolumeShader = (texture: THREE.Data3DTexture) => {
  return new THREE.ShaderMaterial({
    uniforms: { volumeTexture: { value: texture }, stepSize: { value: 0.01 } },
    vertexShader: `varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler3D volumeTexture; uniform float stepSize; varying vec3 vPos;
      void main() {
        vec3 rayDir = normalize(vPos);
        vec3 texCoord = (vPos + 1.0) / 2.0;
        vec4 color = vec4(0.0);
        for (int i = 0; i < 80; i++) {
          if (color.a >= 0.95) break;
          vec4 sample = texture3D(volumeTexture, texCoord);
          float alpha = sample.a * stepSize * 2.0;
          color.rgb += (1.0 - color.a) * sample.rgb * alpha;
          color.a += alpha * (1.0 - color.a);
          texCoord += rayDir * stepSize;
          if (any(lessThan(texCoord, vec3(0.0))) || any(greaterThan(texCoord, vec3(1.0)))) break;
        }
        gl_FragColor = color;
      }`,
    transparent: true, side: THREE.BackSide, depthWrite: false,
  });
};

const generateDefaultField = (nx = 20, ny = 20, nz = 20): number[][][] => {
  const field: number[][][] = [];
  for (let i = 0; i < nx; i++) {
    field[i] = [];
    for (let j = 0; j < ny; j++) {
      field[i][j] = [];
      for (let k = 0; k < nz; k++) {
        const r = Math.sqrt(
          Math.pow((i - nx / 2) / (nx / 2), 2) +
          Math.pow((j - ny / 2) / (ny / 2), 2) +
          Math.pow((k - nz / 2) / (nz / 2), 2)
        );
        field[i][j][k] = Math.pow(1 - Math.min(1, r) * Math.min(1, r), 1.5);
      }
    }
  }
  return field;
};

interface SlicePlaneProps {
  position: [number, number, number];
  rotation: [number, number, number];
  texture: THREE.DataTexture;
  visible: boolean;
  colorScheme: 'purple-cyan' | 'red-yellow';
}

const SlicePlane: React.FC<SlicePlaneProps> = ({ position, rotation, texture, visible, colorScheme }) => {
  const material = useMemo(() => createSliceShader(texture, 0.85, colorScheme), [texture, colorScheme]);
  if (!visible) return null;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const AxesHelper: React.FC = () => {
  const xGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(1.2, 0, 0)]), []);
  const yGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, 1.2, 0)]), []);
  const zGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1.2), new THREE.Vector3(0, 0, 1.2)]), []);
  const xMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#EF4444' }), []);
  const yMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#10B981' }), []);
  const zMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#22D3EE' }), []);

  return (
    <group>
      <primitive object={new THREE.Line(xGeom, xMat)} />
      <primitive object={new THREE.Line(yGeom, yMat)} />
      <primitive object={new THREE.Line(zGeom, zMat)} />
      <Text position={[1.3, 0, 0]} fontSize={0.08} color="#EF4444">R</Text>
      <Text position={[0, 1.3, 0]} fontSize={0.08} color="#10B981">Z</Text>
      <Text position={[0, 0, 1.3]} fontSize={0.08} color="#22D3EE">φ</Text>
    </group>
  );
};

interface SceneProps {
  sliceX: number; sliceY: number; sliceZ: number;
  showXY: boolean; showXZ: boolean; showYZ: boolean; showVolume: boolean;
  activeField: number[][][];
  generateSliceTexture: (axis: 'x' | 'y' | 'z', pos: number) => THREE.DataTexture;
  volumeTexture: THREE.Data3DTexture;
  colorScheme: 'purple-cyan' | 'red-yellow';
}

const Scene: React.FC<SceneProps> = ({
  sliceX, sliceY, sliceZ, showXY, showXZ, showYZ, showVolume,
  activeField, generateSliceTexture, volumeTexture, colorScheme,
}) => {
  const xyTex = useMemo(() => generateSliceTexture('z', sliceZ), [sliceZ, generateSliceTexture]);
  const xzTex = useMemo(() => generateSliceTexture('y', sliceY), [sliceY, generateSliceTexture]);
  const yzTex = useMemo(() => generateSliceTexture('x', sliceX), [sliceX, generateSliceTexture]);
  const volumeMat = useMemo(() => createVolumeShader(volumeTexture), [volumeTexture]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[2.5, 2, 2.5]} fov={50} />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={1.5} maxDistance={6} />
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} />
      <AxesHelper />
      {showVolume && (
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <primitive object={volumeMat} attach="material" />
        </mesh>
      )}
      <SlicePlane position={[0, 0, (sliceZ - 0.5) * 2]} rotation={[0, 0, 0]} texture={xyTex} visible={showXY} colorScheme={colorScheme} />
      <SlicePlane position={[0, (sliceY - 0.5) * 2, 0]} rotation={[-Math.PI / 2, 0, 0]} texture={xzTex} visible={showXZ} colorScheme={colorScheme} />
      <SlicePlane position={[(sliceX - 0.5) * 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} texture={yzTex} visible={showYZ} colorScheme={colorScheme} />
    </>
  );
};

interface PlasmaVisualizationProps {
  densityField?: number[][][];
  temperatureField?: number[][][];
  className?: string;
  height?: number | string;
}

export const PlasmaVisualization: React.FC<PlasmaVisualizationProps> = ({
  densityField: externalDensityField,
  temperatureField: externalTemperatureField,
  className,
  height = 500,
}) => {
  const [sliceX, setSliceX] = useState(0.5);
  const [sliceY, setSliceY] = useState(0.5);
  const [sliceZ, setSliceZ] = useState(0.5);
  const [showXY, setShowXY] = useState(true);
  const [showXZ, setShowXZ] = useState(true);
  const [showYZ, setShowYZ] = useState(true);
  const [renderMode, setRenderMode] = useState<'slices' | 'volume'>('slices');
  const [fieldType, setFieldType] = useState<'density' | 'temperature'>('density');

  const densityField = useMemo(() => externalDensityField || generateDefaultField(), [externalDensityField]);
  const temperatureField = useMemo(() => externalTemperatureField || generateDefaultField(), [externalTemperatureField]);

  const activeField = fieldType === 'density' ? densityField : temperatureField;
  const colorScheme: 'purple-cyan' | 'red-yellow' = fieldType === 'density' ? 'purple-cyan' : 'red-yellow';

  const volumeTexture = useMemo(() => {
    const field = activeField;
    const nx = field.length, ny = field[0]?.length || 0, nz = field[0]?.[0]?.length || 0;
    const data = new Uint8Array(nx * ny * nz * 4);
    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      minVal = Math.min(minVal, field[i][j][k]);
      maxVal = Math.max(maxVal, field[i][j][k]);
    }
    const range = maxVal - minVal || 1;
    const colorFn = colorScheme === 'purple-cyan' ? purpleToCyan : redToYellow;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const idx = (i * ny * nz + j * nz + k) * 4;
      const value = (field[i][j][k] - minVal) / range;
      const color = colorFn(value);
      data[idx] = Math.floor(color.r * 255);
      data[idx + 1] = Math.floor(color.g * 255);
      data[idx + 2] = Math.floor(color.b * 255);
      data[idx + 3] = Math.floor(value * 180);
    }
    const tex = new THREE.Data3DTexture(data, nx, ny, nz);
    tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.unpackAlignment = 1; tex.needsUpdate = true;
    return tex;
  }, [activeField, colorScheme]);

  const generateSliceTexture = useMemo(() => {
    return (axis: 'x' | 'y' | 'z', position: number): THREE.DataTexture => {
      const field = activeField;
      const nx = field.length, ny = field[0]?.length || 0, nz = field[0]?.[0]?.length || 0;
      const width = axis === 'x' ? ny : nx, height = axis === 'x' ? nz : axis === 'y' ? nz : ny;
      const data = new Uint8Array(width * height);
      const idx = Math.floor(position * (axis === 'x' ? nx - 1 : axis === 'y' ? ny - 1 : nz - 1));
      let minVal = Infinity, maxVal = -Infinity;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
        minVal = Math.min(minVal, field[i][j][k]);
        maxVal = Math.max(maxVal, field[i][j][k]);
      }
      const range = maxVal - minVal || 1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const value = (
          axis === 'x' ? field[idx][y][x] :
          axis === 'y' ? field[y][idx][x] :
          field[x][y][idx]
        );
        data[y * width + x] = Math.floor(Math.max(0, Math.min(1, (value - minVal) / range)) * 255);
      }
      const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat);
      texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return texture;
    };
  }, [activeField]);

  const fieldStats = useMemo(() => {
    const field = activeField;
    let min = Infinity, max = -Infinity, sum = 0, count = 0;
    for (let i = 0; i < field.length; i++)
      for (let j = 0; j < (field[i]?.length || 0); j++)
        for (let k = 0; k < (field[i][j]?.length || 0); k++) {
          const v = field[i][j][k];
          min = Math.min(min, v);
          max = Math.max(max, v);
          sum += v;
          count++;
        }
    return { min, max, avg: sum / (count || 1) };
  }, [activeField]);

  const Slider = ({ label, value, onChange, accent }: {
    label: string; value: number; onChange: (v: number) => void; accent: string;
  }) => (
    <div>
      <label className="text-xs font-medium text-text-secondary block mb-2">
        {label}: {(value * 100).toFixed(0)}%
      </label>
      <input
        type="range" min="0" max="1" step="0.01" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-${accent}`}
      />
    </div>
  );

  const title = fieldType === 'density' ? '等离子体密度场三维可视化' : '等离子体温度场三维可视化';
  const lowLabel = fieldType === 'density' ? '低密度' : '低温';
  const highLabel = fieldType === 'density' ? '高密度' : '高温';
  const unit = fieldType === 'density' ? 'm⁻³' : 'K';

  const formatValue = (v: number) => {
    if (v === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(v)));
    const mantissa = v / Math.pow(10, exp);
    if (Math.abs(exp) <= 2) return v.toFixed(2);
    return `${mantissa.toFixed(2)}e${exp}`;
  };

  const gradientClass = colorScheme === 'purple-cyan'
    ? 'from-accent-purple to-accent-cyan'
    : 'from-red-500 to-amber-500';

  return (
    <div className={cn('rounded-xl border border-border bg-background-card overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-background-tertiary rounded-lg p-0.5 mr-2">
            {(['density', 'temperature'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => setFieldType(ft)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-all',
                  fieldType === ft ? (ft === 'density' ? 'bg-primary text-white' : 'bg-accent-orange text-white') : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {ft === 'density' ? '密度' : '温度'}
              </button>
            ))}
          </div>
          <div className="flex bg-background-tertiary rounded-lg p-0.5">
            {(['slices', 'volume'] as const).map((mode) => (
              <button
                key={mode} onClick={() => setRenderMode(mode)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-all',
                  renderMode === mode ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {mode === 'slices' ? '切片模式' : '体渲染'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="flex-1" style={{ height }}>
          <Canvas gl={{ antialias: true, alpha: true }} style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0F1E36 100%)' }}>
            <Scene
              sliceX={sliceX} sliceY={sliceY} sliceZ={sliceZ}
              showXY={showXY && renderMode === 'slices'}
              showXZ={showXZ && renderMode === 'slices'}
              showYZ={showYZ && renderMode === 'slices'}
              showVolume={renderMode === 'volume'}
              activeField={activeField}
              generateSliceTexture={generateSliceTexture}
              volumeTexture={volumeTexture}
              colorScheme={colorScheme}
            />
          </Canvas>
        </div>
        <div className="w-56 p-4 border-l border-border bg-background-secondary/50 space-y-4">
          <Slider label="R轴切片位置" value={sliceX} onChange={setSliceX} accent="accent-red" />
          <Slider label="Z轴切片位置" value={sliceY} onChange={setSliceY} accent="accent-green" />
          <Slider label="φ轴切片位置" value={sliceZ} onChange={setSliceZ} accent="accent-cyan" />
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-text-secondary mb-2">可见切片</p>
            {(['XY', 'XZ', 'YZ'] as const).map((plane) => {
              const [show, setShow] = plane === 'XY' ? [showXY, setShowXY] : plane === 'XZ' ? [showXZ, setShowXZ] : [showYZ, setShowYZ];
              return (
                <label key={plane} className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-background-tertiary text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-text-primary">{plane} 平面</span>
                </label>
              );
            })}
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-text-secondary mb-2">颜色映射</p>
            <div className={cn('h-4 rounded-lg bg-gradient-to-r', gradientClass)} />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-text-tertiary">{lowLabel}</span>
              <span className="text-[10px] text-text-tertiary">{highLabel}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-text-secondary mb-2">场数据统计 ({unit})</p>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between"><span className="text-text-tertiary">最小值</span><span className="text-text-primary">{formatValue(fieldStats.min)}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">平均值</span><span className="text-text-primary">{formatValue(fieldStats.avg)}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">最大值</span><span className="text-text-primary">{formatValue(fieldStats.max)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlasmaVisualization;
