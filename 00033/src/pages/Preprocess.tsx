import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Trash2, Play, RotateCcw, Filter } from 'lucide-react';
import {
  butterworthBandpass, butterworthHighpass, butterworthLowpass,
  applyFilter, demean, detrend, removeInstrumentResponse,
  computeSNR, generateSyntheticWaveform, fftMagnitude
} from '@/engine/dsp';

interface WaveFile {
  id: string; stationCode: string; format: string; dataPoints: number;
  sampleRate: number; status: string; startTime: string; endTime: string; snr?: number;
}

const mockFiles: WaveFile[] = [
  { id: '1', stationCode: 'BJS.BH.Z', format: 'sac', dataPoints: 120000, sampleRate: 100, status: 'uploaded', startTime: '2024-01-15 08:23:45', endTime: '2024-01-15 08:43:45' },
  { id: '2', stationCode: 'SHH.BH.N', format: 'mseed', dataPoints: 60000, sampleRate: 50, status: 'processed', snr: 12.5, startTime: '2024-01-15 08:23:50', endTime: '2024-01-15 08:43:50' },
  { id: '3', stationCode: 'KMI.BH.E', format: 'seed', dataPoints: 90000, sampleRate: 100, status: 'uploaded', startTime: '2024-01-15 08:24:01', endTime: '2024-01-15 08:39:01' },
];

const FILTER_OPTIONS = [
  { value: 'bandpass', label: '带通滤波' },
  { value: 'highpass', label: '高通滤波' },
  { value: 'lowpass', label: '低通滤波' },
  { value: 'demean', label: '去均值' },
  { value: 'detrend', label: '去趋势' },
  { value: 'remove_response', label: '仪器响应校正' },
];

const STATUS_MAP: Record<string, { text: string; cls: string }> = {
  uploaded: { text: '已上传', cls: 'bg-seismo-text-muted/20 text-seismo-text-muted' },
  processing: { text: '处理中', cls: 'bg-seismo-amber/20 text-seismo-amber' },
  processed: { text: '已处理', cls: 'bg-seismo-cyan/20 text-seismo-cyan' },
  failed: { text: '失败', cls: 'bg-seismo-red/20 text-seismo-red' },
};

function drawMiniWave(canvas: HTMLCanvasElement | null, data: number[]) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#00e5c7';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const step = Math.max(1, Math.floor(data.length / w));
  for (let x = 0; x < w; x++) {
    const y = h / 2 - data[x * step] * h * 0.4;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawWaveform(canvas: HTMLCanvasElement | null, original: number[], processed: number[] | null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1a1f35';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 10; i++) {
    const x = (w / 10) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let i = 1; i < 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const step = Math.max(1, Math.floor(original.length / w));
  ctx.strokeStyle = 'rgba(148,163,184,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const y = h / 2 - original[x * step] * h * 0.35;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  if (processed) {
    ctx.shadowColor = '#00e5c7';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#00e5c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h / 2 - processed[x * step] * h * 0.35;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  const pArrival = w * 0.25, sArrival = w * 0.45;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pArrival, 0); ctx.lineTo(pArrival, h); ctx.stroke();
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath(); ctx.moveTo(sArrival, 0); ctx.lineTo(sArrival, h); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '11px JetBrains Mono';
  ctx.fillStyle = '#f59e0b'; ctx.fillText('P', pArrival + 4, 14);
  ctx.fillStyle = '#ef4444'; ctx.fillText('S', sArrival + 4, 14);
  ctx.fillStyle = '#64748b'; ctx.font = '10px JetBrains Mono';
  ctx.fillText('0s', 2, h - 4);
  ctx.fillText('1200s', w - 36, h - 4);
  ctx.fillText('幅度', 4, 14);
}

function drawSpectrum(canvas: HTMLCanvasElement | null, data: number[]) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, w, h);
  const mag = fftMagnitude(data);
  const maxMag = Math.max(...mag, 1);
  const step = Math.max(1, Math.floor(mag.length / w));
  ctx.fillStyle = '#00e5c7';
  for (let x = 0; x < w; x++) {
    const val = mag[x * step] / maxMag;
    const barH = val * (h - 4);
    ctx.fillRect(x, h - barH - 2, 1, barH);
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '9px JetBrains Mono';
  ctx.fillText('频谱', 4, 12);
}

export default function Preprocess() {
  const [files, setFiles] = useState(mockFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('bandpass');
  const [filterParams, setFilterParams] = useState({ freqMin: 1, freqMax: 10, cutoffFreq: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [preprocessed, setPreprocessed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const originalWave = useRef<number[]>([]);
  const processedWave = useRef<number[] | null>(null);
  const sampleRateRef = useRef(100);

  const selected = files.find((f) => f.id === selectedFile);

  useEffect(() => {
    originalWave.current = generateSyntheticWaveform(1200, 100, 2, 4, 0.2);
    files.forEach((f) => {
      const canvas = miniCanvasRefs.current[f.id];
      if (canvas) drawMiniWave(canvas, generateSyntheticWaveform(200, 100, 2, 4, 0.15));
    });
  }, []);

  useEffect(() => {
    drawWaveform(waveformCanvasRef.current, originalWave.current, processedWave.current);
    if (processedWave.current) {
      drawSpectrum(spectrumCanvasRef.current, processedWave.current);
    }
  }, [preprocessed]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);

  const handlePreprocess = () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setFiles((prev) => prev.map((f) => f.id === selectedFile ? { ...f, status: 'processing' } : f));
    
    const sampleRate = selected?.sampleRate || 100;
    sampleRateRef.current = sampleRate;
    const data = generateSyntheticWaveform(1200, sampleRate, 2, 4, 0.2);
    originalWave.current = data;
    
    let processed: number[];
    const { freqMin, freqMax, cutoffFreq } = filterParams;
    
    switch (filterType) {
      case 'bandpass': {
        const { b, a } = butterworthBandpass(freqMin, freqMax, sampleRate, 4);
        processed = applyFilter(data, b, a);
        break;
      }
      case 'highpass': {
        const { b, a } = butterworthHighpass(cutoffFreq, sampleRate, 4);
        processed = applyFilter(data, b, a);
        break;
      }
      case 'lowpass': {
        const { b, a } = butterworthLowpass(cutoffFreq, sampleRate, 4);
        processed = applyFilter(data, b, a);
        break;
      }
      case 'demean':
        processed = demean(data);
        break;
      case 'detrend':
        processed = detrend(data);
        break;
      case 'remove_response':
        processed = removeInstrumentResponse(data, sampleRate, 1.0, 0.707);
        break;
      default:
        processed = data;
    }
    
    const totalTime = data.length / sampleRate;
    const signalStartSec = totalTime * 0.25;
    const snr = computeSNR(processed, sampleRate, signalStartSec);
    
    processedWave.current = processed;
    
    setFiles((prev) => prev.map((f) => f.id === selectedFile ? { ...f, status: 'processed', snr: Math.round(snr * 10) / 10 } : f));
    setIsProcessing(false);
    setPreprocessed(true);
  };

  const handleReset = () => {
    setFilterType('bandpass');
    setFilterParams({ freqMin: 1, freqMax: 10, cutoffFreq: 1 });
    setPreprocessed(false);
    processedWave.current = null;
  };

  const handleDelete = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="page-container">
      <h1 className="section-title mb-6"><Filter className="w-5 h-5 text-seismo-cyan" />波形预处理</h1>

      <div className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${dragOver ? 'border-seismo-cyan shadow-[0_0_30px_rgba(0,229,199,0.3)]' : 'bg-gradient-to-r from-seismo-cyan/20 via-seismo-border to-seismo-amber/20 border-seismo-border'}`}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" className="hidden" accept=".sac,.mseed,.seed" />
        <Upload className={`w-10 h-10 ${dragOver ? 'text-seismo-cyan' : 'text-seismo-text-muted'} transition-colors`} />
        <p className="text-seismo-text font-medium">拖拽波形文件到此处</p>
        <p className="text-seismo-text-muted text-sm">或点击选择文件</p>
        <p className="text-seismo-text-muted/60 text-xs">支持格式：SAC / MSEED / SEED</p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-mono text-seismo-text-dim mb-2">已上传文件</h2>
          {files.map((f) => (
            <div key={f.id} onClick={() => setSelectedFile(f.id)}
              className={`glass-card p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedFile === f.id ? 'ring-1 ring-seismo-cyan/50 shadow-lg shadow-seismo-cyan/10' : 'hover:border-seismo-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold text-seismo-text">{f.stationCode}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-seismo-panel text-seismo-text-muted font-mono uppercase">{f.format}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${STATUS_MAP[f.status]?.cls}`}>{STATUS_MAP[f.status]?.text}</span>
                </div>
                <div className="text-xs text-seismo-text-muted font-mono">{f.dataPoints.toLocaleString()} 采样点 · {f.sampleRate} Hz · {f.startTime}</div>
              </div>
              <canvas ref={(el) => { miniCanvasRefs.current[f.id] = el; }} width={200} height={40} className="rounded bg-seismo-bg/50 flex-shrink-0" />
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(f.id); }} className="btn-primary text-xs px-3 py-1.5">预处理</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="btn-danger text-xs px-3 py-1.5"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-mono text-seismo-text-dim">预处理参数</h2>
          <div>
            <label className="text-xs text-seismo-text-muted block mb-1">滤波类型</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field w-full text-sm">
              {FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {filterType === 'bandpass' && (
            <div className="space-y-3">
              <div><label className="text-xs text-seismo-text-muted block mb-1">最低频率: {filterParams.freqMin} Hz</label>
                <input type="range" min={0.01} max={20} step={0.01} value={filterParams.freqMin} onChange={(e) => setFilterParams((p) => ({ ...p, freqMin: +e.target.value }))} className="w-full accent-seismo-cyan" /></div>
              <div><label className="text-xs text-seismo-text-muted block mb-1">最高频率: {filterParams.freqMax} Hz</label>
                <input type="range" min={0.01} max={20} step={0.01} value={filterParams.freqMax} onChange={(e) => setFilterParams((p) => ({ ...p, freqMax: +e.target.value }))} className="w-full accent-seismo-cyan" /></div>
            </div>
          )}
          {(filterType === 'highpass' || filterType === 'lowpass') && (
            <div><label className="text-xs text-seismo-text-muted block mb-1">截止频率: {filterParams.cutoffFreq} Hz</label>
              <input type="range" min={0.01} max={20} step={0.01} value={filterParams.cutoffFreq} onChange={(e) => setFilterParams((p) => ({ ...p, cutoffFreq: +e.target.value }))} className="w-full accent-seismo-cyan" /></div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={handlePreprocess} disabled={isProcessing || !selectedFile}
              className={`btn-primary flex-1 flex items-center justify-center gap-1.5 ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}>
              <Play className="w-3.5 h-3.5" />{isProcessing ? '处理中...' : '执行预处理'}
            </button>
            <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" />重置</button>
          </div>
        </div>
      </div>

      {preprocessed && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 glass-panel p-5">
            <h2 className="text-sm font-mono text-seismo-text-dim mb-3">波形对比</h2>
            <canvas ref={waveformCanvasRef} width={900} height={200} className="w-full rounded bg-seismo-bg" />
            <div className="flex gap-4 mt-2 text-xs text-seismo-text-muted font-mono">
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-seismo-text-muted/30" />原始波形</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-seismo-cyan" />处理后波形</span>
            </div>
          </div>
          <div className="glass-panel p-5 space-y-4">
            <h2 className="text-sm font-mono text-seismo-text-dim">质量指标</h2>
            <div className="stat-card">
              <span className="stat-label">信噪比 (SNR)</span>
              <span className="stat-value text-seismo-cyan">{selected?.snr ?? '15.8'}</span>
              <div className="w-full h-1.5 bg-seismo-bg rounded-full mt-1">
                <div className="h-full bg-gradient-to-r from-seismo-cyan to-seismo-amber rounded-full" style={{ width: `${Math.min((selected?.snr ?? 15.8) / 30 * 100, 100)}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">频谱分析</span>
              <canvas ref={spectrumCanvasRef} width={200} height={120} className="w-full rounded bg-seismo-bg mt-2" />
            </div>
            <div className="stat-card">
              <span className="stat-label">数据完整性</span>
              <span className="stat-value">98.5%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">有效频带</span>
              <span className="stat-value text-base">{filterType === 'bandpass' ? `${filterParams.freqMin}-${filterParams.freqMax}` : '0.01-20'} Hz</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
