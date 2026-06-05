import { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Settings,
  Play,
  RotateCcw,
  TrendingDown,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  mechanismToMT, mtToMechanism, computeSyntheticSeismogram,
  computeResidual, gradientOptimization, gridSearchInversion
} from '@/engine/inversion';
import { generateSyntheticWaveform } from '@/engine/dsp';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface MT {
  mrr: number;
  mtt: number;
  mpp: number;
  mrt: number;
  mrp: number;
  mtp: number;
}

const mtKeys: (keyof MT)[] = ['mrr', 'mtt', 'mpp', 'mrt', 'mrp', 'mtp'];
const mtLabels: Record<string, string> = {
  mrr: 'Mrr',
  mtt: 'Mtt',
  mpp: 'Mpp',
  mrt: 'Mrt',
  mrp: 'Mrp',
  mtp: 'Mtp',
};

const presets: Record<string, MT> = {
  走滑机制: { mrr: 0, mtt: 0, mpp: 0, mrt: 0, mrp: 0, mtp: 1 },
  逆冲机制: { mrr: 1, mtt: -0.5, mpp: -0.5, mrt: 0, mrp: 0, mtp: 0 },
  正断机制: { mrr: -1, mtt: 0.5, mpp: 0.5, mrt: 0, mrp: 0, mtp: 0 },
};

export default function Inversion() {
  const [mt, setMt] = useState<MT>({ mrr: 0, mtt: 0, mpp: 0, mrt: 0, mrp: 0, mtp: 1 });
  const [maxIterations, setMaxIterations] = useState(100);
  const [convergenceThreshold, setConvergenceThreshold] = useState(0.01);
  const [inversionStatus, setInversionStatus] = useState<'idle' | 'running' | 'converged' | 'failed'>('idle');
  const [currentIteration, setCurrentIteration] = useState(0);
  const [currentResidual, setCurrentResidual] = useState(0);
  const [bestResidual, setBestResidual] = useState(0);
  const [convergenceHistory, setConvergenceHistory] = useState<Array<{ iteration: number; residual: number }>>([]);
  const [inversionMethod, setInversionMethod] = useState<'grid' | 'gradient'>('gradient');
  const [bestMt, setBestMt] = useState<MT | null>(null);
  const [bestMechanism, setBestMechanism] = useState<{ strike1: number; dip1: number; rake1: number; strike2: number; dip2: number; rake2: number } | null>(null);

  const observedWaveform = useRef<number[]>(generateSyntheticWaveform(500, 50, 3, 5, 0.1));
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const syntheticWaveform = useRef<number[]>([]);

  const updateMt = (key: keyof MT, value: number) => setMt((prev) => ({ ...prev, [key]: value }));

  const drawWaveforms = () => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const obs = observedWaveform.current, syn = syntheticWaveform.current;
    const n = obs.length, yCenter = height / 2;
    let maxObs = 0, maxSyn = 0;
    for (let i = 0; i < n; i++) if (Math.abs(obs[i]) > maxObs) maxObs = Math.abs(obs[i]);
    for (let i = 0; i < syn.length; i++) if (Math.abs(syn[i]) > maxSyn) maxSyn = Math.abs(syn[i]);
    const yScale = (height / 2 - 10) / Math.max(maxObs, maxSyn, 0.01);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width, y = yCenter - obs[i] * yScale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (syn.length > 0) {
      ctx.strokeStyle = '#00e5c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < Math.min(syn.length, n); i++) {
        const x = (i / (n - 1)) * width, y = yCenter - syn[i] * yScale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawWaveforms();
  }, [bestMt]);

  const handleStartInversion = () => {
    setInversionStatus('running');
    setConvergenceHistory([]);

    const velocityLayers = [
      { depth: 0, vp: 5.8 },
      { depth: 20, vp: 6.5 },
      { depth: 35, vp: 8.04 }
    ];

    setTimeout(() => {
      let result;

      if (inversionMethod === 'grid') {
        result = gridSearchInversion({
          observedWaveform: observedWaveform.current,
          sampleRate: 50,
          velocityModel: velocityLayers,
          sourceDepth: 15,
          stationDistances: [50, 100, 150],
          searchRange: { strikeMin: 0, strikeMax: 360, dipMin: 10, dipMax: 80, rakeMin: -180, rakeMax: 180 },
          searchStep: 15,
          onIteration: (iter, bestRes, curMT) => {
            setCurrentIteration(iter);
            setCurrentResidual(bestRes);
            setBestResidual(prev => Math.min(prev || Infinity, bestRes));
          }
        });
      } else {
        const initialMTArray = [mt.mrr, mt.mtt, mt.mpp, mt.mrt, mt.mrp, mt.mtp];
        result = gradientOptimization({
          observedWaveform: observedWaveform.current,
          sampleRate: 50,
          initialMT: initialMTArray,
          velocityModel: velocityLayers,
          sourceDepth: 15,
          stationDistances: [50, 100, 150],
          maxIterations,
          convergenceThreshold,
          learningRate: 0.01,
          onIteration: (iter, res, curMT) => {
            setCurrentIteration(iter);
            setCurrentResidual(res);
          }
        });
      }

      const bestMtObj: MT = {
        mrr: result.bestMT[0],
        mtt: result.bestMT[1],
        mpp: result.bestMT[2],
        mrt: result.bestMT[3],
        mrp: result.bestMT[4],
        mtp: result.bestMT[5],
      };

      const mech = mtToMechanism(bestMtObj);

      syntheticWaveform.current = computeSyntheticSeismogram(
        result.bestMT,
        velocityLayers,
        15,
        50,
        50,
        observedWaveform.current.length / 50
      );

      setBestMt(bestMtObj);
      setBestMechanism(mech);
      setBestResidual(result.bestResidual);
      setConvergenceHistory(result.convergenceHistory);
      setInversionStatus('converged');
    }, 100);
  };

  const handleReset = () => {
    setMt({ mrr: 0, mtt: 0, mpp: 0, mrt: 0, mrp: 0, mtp: 1 });
    setInversionStatus('idle');
    setCurrentIteration(0);
    setCurrentResidual(0);
    setBestResidual(0);
    setConvergenceHistory([]);
    setBestMt(null);
    setBestMechanism(null);
    syntheticWaveform.current = [];
  };

  const chartData = {
    labels: convergenceHistory.map((d) => d.iteration),
    datasets: [
      {
        label: '残差',
        data: convergenceHistory.map((d) => d.residual),
        borderColor: '#00e5c7',
        backgroundColor: 'rgba(0,229,199,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        title: { display: true, text: '迭代次数', color: '#94a3b8' },
        ticks: { color: '#94a3b8' },
        grid: { color: '#2a3050' },
      },
      y: {
        title: { display: true, text: '残差', color: '#94a3b8' },
        ticks: { color: '#94a3b8' },
        grid: { color: '#2a3050' },
      },
    },
  };

  const statusIcon = () => {
    if (inversionStatus === 'converged') return <CheckCircle className="w-4 h-4 text-seismo-cyan" />;
    if (inversionStatus === 'failed') return <AlertCircle className="w-4 h-4 text-seismo-red" />;
    if (inversionStatus === 'running') return <TrendingDown className="w-4 h-4 text-seismo-amber animate-pulse" />;
    return null;
  };

  const statusText: Record<string, string> = {
    idle: '待启动',
    running: '运行中',
    converged: '已收敛',
    failed: '未收敛',
  };

  return (
    <div className="page-container">
      <h1 className="section-title mb-6"><Settings className="w-5 h-5 text-seismo-cyan" />震源反演</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-panel p-5 space-y-5">
          <h2 className="section-title text-base"><Settings className="w-4 h-4 text-seismo-cyan" />矩张量配置</h2>
          <div className="grid grid-cols-3 gap-3">
            {mtKeys.map((key) => (
              <div key={key}>
                <label className="text-xs text-seismo-text-muted mb-1 block">{mtLabels[key]}</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={mt[key]}
                  step={0.1}
                  min={-10}
                  max={10}
                  onChange={(e) => updateMt(key, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-seismo-text-muted mb-2 block">预设机制</label>
            <div className="flex gap-2">
              {Object.keys(presets).map((name) => (
                <button key={name} className="btn-secondary text-xs px-3 py-1.5" onClick={() => setMt({ ...presets[name] })}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-seismo-text-muted mb-1 block">最大迭代次数</label>
              <input type="number" className="input-field w-full" value={maxIterations} onChange={(e) => setMaxIterations(parseInt(e.target.value) || 100)} />
            </div>
            <div>
              <label className="text-xs text-seismo-text-muted mb-1 block">收敛阈值</label>
              <input type="number" className="input-field w-full" value={convergenceThreshold} step={0.001} onChange={(e) => setConvergenceThreshold(parseFloat(e.target.value) || 0.01)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-seismo-text-muted mb-2 block">反演方法</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inversionMethod"
                  checked={inversionMethod === 'gradient'}
                  onChange={() => setInversionMethod('gradient')}
                  className="accent-[#00e5c7]"
                />
                <span className="text-sm text-seismo-text">梯度优化</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inversionMethod"
                  checked={inversionMethod === 'grid'}
                  onChange={() => setInversionMethod('grid')}
                  className="accent-[#00e5c7]"
                />
                <span className="text-sm text-seismo-text">网格搜索</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex items-center gap-2" onClick={handleStartInversion} disabled={inversionStatus === 'running'}>
              <Play className="w-4 h-4" />启动反演
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />重置
            </button>
          </div>
        </div>

        <div className="glass-panel p-5 space-y-4">
          <h2 className="section-title text-base"><TrendingDown className="w-4 h-4 text-seismo-cyan" />迭代优化监控</h2>
          <div className="glass-card p-3" style={{ height: 140 }}>
            {convergenceHistory.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-seismo-text-muted text-sm">启动反演后显示收敛曲线</div>
            )}
          </div>
          <div className="glass-card p-3">
            <span className="stat-label mb-2 block">波形拟合 (灰:观测 青:合成)</span>
            <canvas
              ref={waveformCanvasRef}
              width={500}
              height={80}
              className="w-full border border-seismo-border rounded"
            />
          </div>
          <div className="flex items-center gap-2 mb-1">
            {statusIcon()}
            <span className="text-xs text-seismo-text-dim">状态: {statusText[inversionStatus]}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <span className="stat-label">当前迭代</span>
              <span className="stat-value text-lg">{currentIteration}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">当前残差</span>
              <span className="stat-value text-lg">{currentResidual.toFixed(4)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">最优残差</span>
              <span className="stat-value text-lg text-seismo-cyan">{bestResidual.toFixed(4)}</span>
            </div>
          </div>
          <div className="glass-card p-3">
            <span className="stat-label">最优解</span>
            <div className="flex gap-4 mt-1 text-sm text-seismo-text-dim">
              <span>走向角: <b className="text-seismo-text">{bestMechanism ? bestMechanism.strike1.toFixed(1) : '--'}°</b></span>
              <span>倾角: <b className="text-seismo-text">{bestMechanism ? bestMechanism.dip1.toFixed(1) : '--'}°</b></span>
              <span>滑动角: <b className="text-seismo-text">{bestMechanism ? bestMechanism.rake1.toFixed(1) : '--'}°</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h2 className="section-title text-base mb-4"><CheckCircle className="w-4 h-4 text-seismo-cyan" />反演结果摘要</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: '震源深度', value: '15 km', icon: <TrendingDown className="w-5 h-5 text-seismo-cyan" /> },
            { label: '走向角', value: bestMechanism ? `${bestMechanism.strike1.toFixed(1)}°` : '--', icon: <Settings className="w-5 h-5 text-seismo-cyan" /> },
            { label: '倾角', value: bestMechanism ? `${bestMechanism.dip1.toFixed(1)}°` : '--', icon: <Settings className="w-5 h-5 text-seismo-amber" /> },
            { label: '滑动角', value: bestMechanism ? `${bestMechanism.rake1.toFixed(1)}°` : '--', icon: <Settings className="w-5 h-5 text-seismo-amber" /> },
            { label: '矩震级', value: 'Mw 5.8', icon: <AlertCircle className="w-5 h-5 text-seismo-red" /> },
            { label: '拟合残差', value: bestResidual > 0 ? bestResidual.toFixed(4) : '--', icon: <CheckCircle className="w-5 h-5 text-seismo-cyan" /> },
          ].map((item) => (
            <div key={item.label} className="stat-card items-center text-center">
              <div className="mb-1">{item.icon}</div>
              <span className="stat-label">{item.label}</span>
              <span className="stat-value text-xl">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
