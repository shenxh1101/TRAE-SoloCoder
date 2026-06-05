import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Download, Zap, AlertTriangle } from 'lucide-react';
import { WaveSimulation, interpolateVelocity, fieldToColor } from '@/engine/fdtd';

const velocityModels: Record<string, { depth: number; vp: number; vs: number; density: number }[]> = {
  IASP91: [
    { depth: 0, vp: 5.8, vs: 3.2, density: 2.72 },
    { depth: 20, vp: 6.5, vs: 3.6, density: 2.92 },
    { depth: 35, vp: 8.04, vs: 4.48, density: 3.32 },
    { depth: 120, vp: 8.05, vs: 4.49, density: 3.34 },
    { depth: 210, vp: 8.3, vs: 4.62, density: 3.43 },
    { depth: 410, vp: 9.1, vs: 5.08, density: 3.72 },
  ],
  PREM: [
    { depth: 0, vp: 5.8, vs: 3.2, density: 2.72 },
    { depth: 15, vp: 6.8, vs: 3.9, density: 2.92 },
    { depth: 35, vp: 8.1, vs: 4.5, density: 3.35 },
    { depth: 210, vp: 8.56, vs: 4.64, density: 3.43 },
    { depth: 410, vp: 9.13, vs: 5.08, density: 3.72 },
    { depth: 670, vp: 10.75, vs: 5.95, density: 4.38 },
  ],
  AK135: [
    { depth: 0, vp: 5.8, vs: 3.2, density: 2.72 },
    { depth: 18, vp: 6.5, vs: 3.65, density: 2.92 },
    { depth: 35, vp: 8.04, vs: 4.48, density: 3.32 },
    { depth: 115, vp: 8.04, vs: 4.49, density: 3.34 },
    { depth: 210, vp: 8.3, vs: 4.62, density: 3.43 },
    { depth: 410, vp: 9.13, vs: 5.08, density: 3.72 },
  ],
};

function vpToColor(vp: number): string {
  if (vp < 6.0) return `rgb(59,130,246,${0.5 + (vp - 5.0) * 0.25})`;
  if (vp < 7.0) return `rgb(34,197,94,${0.5 + (vp - 6.0) * 0.3})`;
  if (vp < 8.0) return `rgb(249,158,11,${0.5 + (vp - 7.0) * 0.25})`;
  return `rgb(239,68,68,${Math.min(1, 0.6 + (vp - 8.0) * 0.15)})`;
}

type SimStatus = '排队中' | '计算中' | '已完成' | '失败';

export default function Forward() {
  const [selectedModel, setSelectedModel] = useState('IASP91');
  const [sourceParams, setSourceParams] = useState({ lat: 35.0, lon: 105.0, depth: 10 });
  const [gridConfig, setGridConfig] = useState({ nx: 200, nz: 100, dx: 0.5, dz: 0.5 });
  const [timeConfig, setTimeConfig] = useState({ totalTime: 60, dt: 0.01, snapshotInterval: 1 });
  const [simulationStatus, setSimulationStatus] = useState<SimStatus>('排队中');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [cflNumber, setCflNumber] = useState<number | null>(null);
  const [showCflWarning, setShowCflWarning] = useState(false);
  const [snapshots, setSnapshots] = useState<Array<{ time: number; dataUrl: string }>>([]);

  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveSimRef = useRef<WaveSimulation | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef(0);

  const totalSteps = Math.floor(timeConfig.totalTime / timeConfig.dt);

  const drawVelocityModel = useCallback(() => {
    const canvas = velocityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const layers = velocityModels[selectedModel] || velocityModels.IASP91;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, w, h);
    const maxDepth = layers[layers.length - 1].depth;
    const labelW = 80, drawW = w - labelW;
    for (let i = 0; i < layers.length; i++) {
      const top = i === 0 ? 0 : layers[i].depth;
      const bottom = i === layers.length - 1 ? maxDepth * 1.1 : layers[i + 1]?.depth ?? maxDepth;
      const y1 = (top / (maxDepth * 1.1)) * h, y2 = (bottom / (maxDepth * 1.1)) * h;
      ctx.fillStyle = vpToColor(layers[i].vp);
      ctx.fillRect(0, y1, drawW, y2 - y1);
      ctx.strokeStyle = '#2a3050';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y1, drawW, y2 - y1);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px JetBrains Mono, monospace';
      const midY = (y1 + y2) / 2;
      ctx.fillText(`${layers[i].depth}km`, drawW + 4, midY - 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Vp${layers[i].vp}`, drawW + 4, midY + 4);
      ctx.fillText(`Vs${layers[i].vs}`, drawW + 4, midY + 14);
    }
  }, [selectedModel]);

  const drawVelocityLayers = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const layers = velocityModels[selectedModel] || velocityModels.IASP91;
    const maxDepth = layers[layers.length - 1].depth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < layers.length; i++) {
      const y = (layers[i].depth / (maxDepth * 1.1)) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, [selectedModel]);

  const drawWaveField = useCallback((time: number) => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;

    if (waveSimRef.current) {
      const field = waveSimRef.current.getField();
      const { nx, nz } = waveSimRef.current;
      const imageData = fieldToColor(field, nx, nz, w, h);
      ctx.putImageData(imageData, 0, 0);
      drawVelocityLayers(ctx, w, h);
      const srcX = (waveSimRef.current.sourceX / nx) * w;
      const srcY = (waveSimRef.current.sourceZ / nz) * h;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](srcX + 8 * Math.cos(angle), srcY + 8 * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fill();
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0a0e1a');
      gradient.addColorStop(1, '#0f1628');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w - 130, 8, 122, 28);
    ctx.fillStyle = '#00e5c7';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`t = ${time.toFixed(2)}s`, w - 124, 27);
  }, [drawVelocityLayers]);

  useEffect(() => {
    drawVelocityModel();
  }, [drawVelocityModel]);

  useEffect(() => {
    drawWaveField(currentTime);
  }, [currentTime, drawWaveField]);

  useEffect(() => {
    if (!isPlaying || waveSimRef.current) return;
    let lastTs = 0;
    const animate = (ts: number) => {
      if (!lastTs) lastTs = ts;
      const delta = (ts - lastTs) / 1000;
      lastTs = ts;
      setCurrentTime(prev => {
        const next = prev + delta * playbackSpeed;
        if (next >= timeConfig.totalTime) {
          setIsPlaying(false);
          setSimulationStatus('已完成');
          return timeConfig.totalTime;
        }
        return next;
      });
      setCurrentStep(prev => Math.min(totalSteps, prev + 1));
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, playbackSpeed, timeConfig.totalTime, totalSteps]);

  const startSimulation = () => {
    setSimulationStatus('计算中');
    setCurrentTime(0);
    setCurrentStep(0);
    setSnapshots([]);

    const layers = velocityModels[selectedModel] || velocityModels.IASP91;
    const velProfile = interpolateVelocity(layers, gridConfig.nz, gridConfig.dz);

    waveSimRef.current = new WaveSimulation({
      nx: gridConfig.nx, nz: gridConfig.nz,
      dx: gridConfig.dx * 1000, dz: gridConfig.dz * 1000,
      velocity: velProfile, dt: timeConfig.dt,
      sourceX: Math.floor(gridConfig.nx * 0.5),
      sourceZ: Math.min(Math.floor(sourceParams.depth / gridConfig.dz), gridConfig.nz - 3),
      sourceFreq: 2.0
    });

    const cfl = waveSimRef.current.getCFL();
    setCflNumber(cfl);
    setShowCflWarning(cfl > 0.5);

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    let stepCount = 0;
    const snapshotSteps = Math.floor(timeConfig.snapshotInterval / timeConfig.dt);
    const newSnapshots: Array<{ time: number; dataUrl: string }> = [];

    simIntervalRef.current = window.setInterval(() => {
      if (!waveSimRef.current) return;
      waveSimRef.current.step();
      stepCount++;
      const simTime = waveSimRef.current.getTime();
      setCurrentTime(simTime);
      setCurrentStep(stepCount);

      if (stepCount % snapshotSteps === 0 && waveCanvasRef.current) {
        newSnapshots.push({ time: simTime, dataUrl: waveCanvasRef.current.toDataURL('image/png') });
      }

      if (simTime >= timeConfig.totalTime) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setSnapshots(newSnapshots);
        setSimulationStatus('已完成');
        setIsPlaying(false);
      }
    }, 16);

    setIsPlaying(true);
  };

  const stepForward = () => {
    const next = Math.min(currentTime + timeConfig.snapshotInterval, timeConfig.totalTime);
    setCurrentTime(next);
    setCurrentStep(Math.floor((next / timeConfig.totalTime) * totalSteps));
    if (next >= timeConfig.totalTime) setSimulationStatus('已完成');
  };

  const stepBackward = () => {
    const prev = Math.max(currentTime - timeConfig.snapshotInterval, 0);
    setCurrentTime(prev);
    setCurrentStep(Math.floor((prev / timeConfig.totalTime) * totalSteps));
  };

  const exportSnapshots = () => {
    console.log('Exporting snapshots:', snapshots);
    alert(`已导出 ${snapshots.length} 个快照`);
  };

  const progress = (currentTime / timeConfig.totalTime) * 100;
  const statusColor: Record<SimStatus, string> = {
    '排队中': 'text-seismo-amber', '计算中': 'text-seismo-cyan',
    '已完成': 'text-green-400', '失败': 'text-seismo-red',
  };

  return (
    <div className="page-container">
      <h1 className="section-title mb-4">波场正演</h1>
      {showCflWarning && (
        <div className="mb-4 p-3 bg-seismo-amber/10 border border-seismo-amber/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-seismo-amber" />
          <span className="text-seismo-amber text-sm">CFL数 ({cflNumber?.toFixed(3)}) 超过0.5，数值模拟可能不稳定</span>
        </div>
      )}
      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="w-80 flex flex-col gap-3 flex-shrink-0 overflow-y-auto">
          <div className="glass-panel p-4">
            <div className="text-xs text-seismo-text-muted uppercase tracking-wider mb-2">速度模型选择</div>
            <select className="input-field w-full" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
              {Object.keys(velocityModels).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="glass-panel p-4">
            <div className="text-xs text-seismo-text-muted uppercase tracking-wider mb-2">速度模型可视化</div>
            <canvas ref={velocityCanvasRef} width={280} height={220} className="w-full rounded-lg" />
          </div>
          <div className="glass-panel p-4">
            <div className="text-xs text-seismo-text-muted uppercase tracking-wider mb-2">源参数</div>
            <div className="grid grid-cols-3 gap-2">
              {(['lat', 'lon', 'depth'] as const).map(k => (
                <div key={k}>
                  <label className="text-[10px] text-seismo-text-muted">{k === 'lat' ? '纬度' : k === 'lon' ? '经度' : '深度(km)'}</label>
                  <input type="number" className="input-field w-full" value={sourceParams[k]}
                    onChange={e => setSourceParams(p => ({ ...p, [k]: +e.target.value }))} step={k === 'depth' ? 1 : 0.1} />
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-4">
            <div className="text-xs text-seismo-text-muted uppercase tracking-wider mb-2">网格配置</div>
            <div className="grid grid-cols-2 gap-2">
              {(['nx', 'nz', 'dx', 'dz'] as const).map(k => (
                <div key={k}>
                  <label className="text-[10px] text-seismo-text-muted">{k}</label>
                  <input type="number" className="input-field w-full" value={gridConfig[k]}
                    onChange={e => setGridConfig(g => ({ ...g, [k]: +e.target.value }))} step={k.startsWith('n') ? 10 : 0.1} />
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-4">
            <div className="text-xs text-seismo-text-muted uppercase tracking-wider mb-2">时间配置</div>
            <div className="grid grid-cols-3 gap-2">
              {(['totalTime', 'dt', 'snapshotInterval'] as const).map(k => (
                <div key={k}>
                  <label className="text-[10px] text-seismo-text-muted">{k === 'totalTime' ? '总时间(s)' : k === 'dt' ? 'dt(s)' : '快照间隔(s)'}</label>
                  <input type="number" className="input-field w-full" value={timeConfig[k]}
                    onChange={e => setTimeConfig(t => ({ ...t, [k]: +e.target.value }))} step={k === 'dt' ? 0.001 : 1} />
                </div>
              ))}
            </div>
          </div>
          <button className="btn-primary flex items-center justify-center gap-2" onClick={startSimulation}>
            <Zap size={16} /> 启动模拟
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2" onClick={exportSnapshots}>
            <Download size={16} /> 导出快照 ({snapshots.length})
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div className="glass-panel p-4 flex-1 flex flex-col">
            <div className="text-xs text-seismo-text-muted uppercase tracking-wider mb-2">波场动画播放器</div>
            <canvas ref={waveCanvasRef} width={800} height={600} className="w-full rounded-lg flex-1" style={{ minHeight: 600 }} />
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <button className="btn-secondary p-2" onClick={() => { if (isPlaying) setIsPlaying(false); else stepBackward(); }}>
              <SkipBack size={16} />
            </button>
            <button className="btn-primary p-2" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="btn-secondary p-2" onClick={stepForward}>
              <SkipForward size={16} />
            </button>
            <input type="range" min={0} max={timeConfig.totalTime} step={0.01} value={currentTime}
              onChange={e => { setCurrentTime(+e.target.value); setCurrentStep(Math.floor((+e.target.value / timeConfig.totalTime) * totalSteps)); }}
              className="flex-1 accent-seismo-cyan h-1" />
            <span className="font-mono text-sm text-seismo-cyan w-20 text-right">{currentTime.toFixed(2)}s</span>
            <select className="input-field w-20" value={playbackSpeed} onChange={e => setPlaybackSpeed(+e.target.value)}>
              {[0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
          <div className="glass-card p-3 flex items-center gap-4">
            <span className={`text-sm font-medium ${statusColor[simulationStatus]}`}>{simulationStatus}</span>
            <div className="flex-1 h-2 bg-seismo-bg rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-seismo-cyan to-seismo-amber rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-xs text-seismo-text-dim">{currentStep} / {totalSteps}</span>
            {cflNumber !== null && (
              <span className={`font-mono text-xs px-2 py-1 rounded ${cflNumber > 0.5 ? 'bg-seismo-amber/20 text-seismo-amber' : 'bg-seismo-cyan/20 text-seismo-cyan'}`}>
                CFL: {cflNumber.toFixed(3)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
