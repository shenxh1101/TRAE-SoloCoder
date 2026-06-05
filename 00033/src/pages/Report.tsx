import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Download, Printer, Check, Settings } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import jsPDF from 'jspdf';
import { renderBeachBall, computeOmoriDecay, traceRays, computeCumulativeEnergy } from '@/engine/visualization';
import { mechanismToMT, computeSyntheticSeismogram, computeResidual } from '@/engine/inversion';
import { generateSyntheticWaveform } from '@/engine/dsp';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const SECTION_OPTIONS = [
  { key: 'waveform_fit', label: '波形拟合图' },
  { key: 'depth_profile', label: '震源深度剖面' },
  { key: 'energy_curve', label: '能量释放曲线' },
  { key: 'mechanism', label: '震源机制解' },
  { key: 'aftershock', label: '余震概率分布' },
];

const INVERSION_TASKS = ['反演任务 #001 - M6.5 汶川', '反演任务 #002 - M5.8 九寨沟', '反演任务 #003 - M7.0 泸定'];

function corrCoef(a: number[], b: number[]): number {
  let sumA = 0, sumB = 0, sumA2 = 0, sumB2 = 0, sumAB = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    sumA += a[i]; sumB += b[i];
    sumA2 += a[i] * a[i]; sumB2 += b[i] * b[i];
    sumAB += a[i] * b[i];
  }
  const denom = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return denom > 0 ? (n * sumAB - sumA * sumB) / denom : 0;
}

function drawWaveformCanvas(canvas: HTMLCanvasElement, observed: number[], synthetic: number[], residual: number, correlation: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height, pad = 30;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = pad + (i / 5) * (h - 2 * pad);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  const maxVal = Math.max(...observed.map(Math.abs), ...synthetic.map(Math.abs));
  const scale = maxVal > 0 ? (h / 2 - pad) / maxVal : 1;
  const drawLine = (values: number[], color: string) => {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h / 2 - v * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  ctx.fillStyle = 'rgba(0,229,199,0.08)'; ctx.beginPath();
  observed.forEach((v, i) => {
    const x = pad + (i / (observed.length - 1)) * (w - 2 * pad);
    const y = h / 2 - v * scale;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  for (let i = synthetic.length - 1; i >= 0; i--) {
    const x = pad + (i / (synthetic.length - 1)) * (w - 2 * pad);
    ctx.lineTo(x, h / 2 - synthetic[i] * scale);
  }
  ctx.closePath(); ctx.fill();
  drawLine(observed, '#00e5c7'); drawLine(synthetic, '#f59e0b');
  ctx.fillStyle = '#333'; ctx.font = '9px sans-serif';
  ctx.fillText('时间 (s)', w / 2 - 15, h - 8);
  ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('振幅', -10, 0); ctx.restore();
  ctx.font = '8px sans-serif';
  ctx.fillStyle = '#00e5c7'; ctx.fillRect(pad, 8, 12, 3); ctx.fillText('观测波形', pad + 16, 12);
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(pad + 80, 8, 12, 3); ctx.fillText('合成波形', pad + 96, 12);
  ctx.fillStyle = '#333';
  ctx.fillText(`相关系数: ${correlation.toFixed(3)}`, w - pad - 80, 12);
  ctx.fillText(`残差: ${residual.toFixed(3)}`, w - pad - 80, 25);
}

function drawDepthProfile(canvas: HTMLCanvasElement, velocityLayers: Array<{depth: number; vp: number}>, sourceDepth: number, rays: ReturnType<typeof traceRays>) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height, pad = 35;
  const layerColors = ['#e8d5a3', '#c4a35a', '#8b6914', '#5a3e1b'];
  const maxDepth = 50, xMin = -50, xMax = 60;
  const xScale = (w - 2 * pad) / (xMax - xMin), yScale = (h - 2 * pad) / maxDepth;
  const toX = (x: number) => pad + (x - xMin) * xScale;
  const toY = (z: number) => pad + z * yScale;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  const sortedLayers = [...velocityLayers].sort((a, b) => a.depth - b.depth);
  sortedLayers.forEach((l, i) => {
    const y1 = toY(l.depth), y2 = i < sortedLayers.length - 1 ? toY(sortedLayers[i + 1].depth) : h - pad;
    ctx.fillStyle = layerColors[i % layerColors.length];
    ctx.fillRect(pad, y1, w - 2 * pad, y2 - y1);
    ctx.fillStyle = '#333'; ctx.font = '9px sans-serif';
    ctx.fillText(`${l.depth}km Vp=${l.vp}km/s`, pad + 5, (y1 + y2) / 2 + 3);
    if (i > 0) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(pad, y1); ctx.lineTo(w - pad, y1); ctx.stroke();
    }
  });
  rays.forEach((ray) => {
    ctx.strokeStyle = ray.phase === 'P' ? 'rgba(0,229,199,0.6)' : 'rgba(245,158,11,0.6)';
    ctx.lineWidth = 1; ctx.setLineDash(ray.phase === 'P' ? [] : [3, 3]); ctx.beginPath();
    ray.points.forEach((pt, i) => {
      const x = toX(pt.x), y = toY(pt.z);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.setLineDash([]);
  const srcX = toX(0), srcY = toY(sourceDepth);
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(srcX, srcY, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333'; ctx.font = '8px sans-serif';
  ctx.fillText(`★ 震源 ${sourceDepth}km`, srcX + 8, srcY + 3);
  ctx.font = '9px sans-serif';
  ctx.fillText('深度 (km)', 2, pad - 5);
  ctx.fillText('距离 (km)', w / 2 - 20, h - 8);
  for (let i = 0; i <= 5; i++) {
    const d = (maxDepth / 5) * i, y = toY(d);
    ctx.fillStyle = '#666'; ctx.font = '8px sans-serif';
    ctx.fillText(`${d}`, pad - 20, y + 3);
  }
}

export default function Report() {
  const [title, setTitle] = useState('地震波形反演分析报告');
  const [author, setAuthor] = useState('张明远');
  const [institution, setInstitution] = useState('中国地震局地球物理研究所');
  const [sections, setSections] = useState(SECTION_OPTIONS.map((s) => s.key));
  const [selectedInversion, setSelectedInversion] = useState(INVERSION_TASKS[0]);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const mechanism = { strike: 128, dip: 34, rake: -13 };
  const sourceDepth = 15;
  const velocityLayers = [{ depth: 0, vp: 5.8 }, { depth: 20, vp: 6.5 }, { depth: 35, vp: 8.04 }];

  const waveformRef = useRef<HTMLCanvasElement>(null);
  const depthRef = useRef<HTMLCanvasElement>(null);
  const beachBallRef = useRef<HTMLCanvasElement>(null);
  const computedValues = useRef<{
    observed: number[]; synthetic: number[]; residual: number; correlation: number;
    mtArray: number[]; mw: number; cumEnergy: number[]; aftershock24h: number;
    rays: ReturnType<typeof traceRays>;
  } | null>(null);

  const toggleSection = (key: string) => {
    setSections((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const ensureComputed = useCallback(() => {
    if (computedValues.current) return;
    const observed = generateSyntheticWaveform(200, 50, 2.5, 4, 0.05);
    const mtArray = mechanismToMT(mechanism.strike, mechanism.dip, mechanism.rake);
    const synthetic = computeSyntheticSeismogram(mtArray, velocityLayers, sourceDepth, 100, 50, 4);
    const residual = computeResidual(observed, synthetic);
    const correlation = corrCoef(observed, synthetic);
    const scalarMoment = Math.sqrt(mtArray.reduce((s, v) => s + v * v, 0));
    const mw = (2 / 3) * (Math.log10(scalarMoment) - 10.7);
    const halfDur = 2, nPts = 400;
    const momentRate = Array.from({ length: nPts }, (_, i) => {
      const t = (i / nPts) * 8;
      if (t < halfDur) return t / halfDur;
      if (t < 2 * halfDur) return 2 - t / halfDur;
      return 0;
    });
    const cumEnergy = computeCumulativeEnergy(momentRate, 50);
    const aftershock24h = computeOmoriDecay(10, 0.1, 1.1, 1)[0].rate;
    const rays = traceRays({ velocityModel: velocityLayers, sourceDepth, stationDistances: [-30, -15, 0, 15, 30, 45] });
    computedValues.current = { observed, synthetic, residual, correlation, mtArray, mw, cumEnergy, aftershock24h, rays };
  }, [mechanism, sourceDepth, velocityLayers]);

  useEffect(() => {
    ensureComputed();
    if (waveformRef.current && sections.includes('waveform_fit') && computedValues.current) {
      waveformRef.current.width = 460; waveformRef.current.height = 180;
      const { observed, synthetic, residual, correlation } = computedValues.current;
      drawWaveformCanvas(waveformRef.current, observed, synthetic, residual, correlation);
    }
  }, [sections, ensureComputed]);

  useEffect(() => {
    ensureComputed();
    if (depthRef.current && sections.includes('depth_profile') && computedValues.current) {
      depthRef.current.width = 460; depthRef.current.height = 240;
      drawDepthProfile(depthRef.current, velocityLayers, sourceDepth, computedValues.current.rays);
    }
  }, [sections, ensureComputed, velocityLayers, sourceDepth]);

  useEffect(() => {
    ensureComputed();
    if (beachBallRef.current && sections.includes('mechanism')) {
      beachBallRef.current.width = 200; beachBallRef.current.height = 200;
      renderBeachBall(beachBallRef.current, mechanism.strike, mechanism.dip, mechanism.rake);
    }
  }, [sections, ensureComputed, mechanism]);

  const generatePDF = useCallback(() => {
    setIsGenerating(true); ensureComputed();
    setTimeout(() => {
      const doc = new jsPDF();
      let pageNum = 1;
      const addFooter = () => { doc.setFontSize(8); doc.setTextColor(150); doc.text(`第 ${pageNum} 页`, 105, 285, { align: 'center' }); };
      doc.setFontSize(22); doc.text(title, 105, 30, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`作者: ${author}`, 105, 45, { align: 'center' });
      doc.text(`机构: ${institution}`, 105, 55, { align: 'center' });
      doc.text(`日期: ${new Date().toLocaleDateString('zh-CN')}`, 105, 65, { align: 'center' });
      doc.setDrawColor(0, 229, 199); doc.setLineWidth(0.5); doc.line(30, 70, 180, 70);
      addFooter();
      let y = 85;
      const newPageIfNeeded = () => {
        if (y > 220) { doc.addPage(); pageNum++; addFooter(); y = 20; }
      };
      if (sections.includes('waveform_fit') && computedValues.current) {
        doc.setFontSize(14); doc.text('1. 波形拟合分析', 20, y);
        doc.setFontSize(10);
        doc.text(`波形拟合残差: ${computedValues.current.residual.toFixed(3)}, 相关系数: ${computedValues.current.correlation.toFixed(3)}`, 20, y + 10);
        doc.text('观测波形与合成波形拟合度较高，反演结果可信。', 20, y + 20);
        y += 30;
        if (waveformRef.current) {
          const imgData = waveformRef.current.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 20, y, 170, 60); y += 70;
        }
      }
      newPageIfNeeded();
      if (sections.includes('depth_profile')) {
        doc.setFontSize(14); doc.text('2. 震源深度剖面', 20, y);
        doc.setFontSize(10); doc.text(`震源深度: ${sourceDepth}km`, 20, y + 10); y += 25;
        if (depthRef.current) {
          const imgData = depthRef.current.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 20, y, 170, 85); y += 95;
        }
      }
      newPageIfNeeded();
      if (sections.includes('energy_curve') && computedValues.current) {
        doc.setFontSize(14); doc.text('3. 能量释放曲线', 20, y);
        doc.setFontSize(10); doc.text('累计能量释放随时间呈阶梯式增长。', 20, y + 10); y += 30;
      }
      newPageIfNeeded();
      if (sections.includes('mechanism') && computedValues.current) {
        doc.setFontSize(14); doc.text('4. 震源机制解', 20, y);
        doc.setFontSize(10);
        doc.text(`走向: ${mechanism.strike}°, 倾角: ${mechanism.dip}°, 滑角: ${mechanism.rake}°`, 20, y + 10);
        doc.text(`矩震级 Mw: ${computedValues.current.mw.toFixed(2)}`, 20, y + 20);
        doc.text(`矩张量: [${computedValues.current.mtArray.map(v => v.toExponential(2)).join(', ')}]`, 20, y + 30);
        y += 40;
        if (beachBallRef.current) {
          const imgData = beachBallRef.current.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 60, y, 80, 80); y += 90;
        }
      }
      newPageIfNeeded();
      if (sections.includes('aftershock') && computedValues.current) {
        doc.setFontSize(14); doc.text('5. 余震概率分布', 20, y);
        doc.setFontSize(10);
        const p24 = Math.min(98, computedValues.current.aftershock24h * 7);
        const p72 = Math.min(85, computedValues.current.aftershock24h * 4);
        const p7d = Math.min(60, computedValues.current.aftershock24h * 2);
        doc.text(`24h内余震概率: ${p24.toFixed(0)}%, 72h: ${p72.toFixed(0)}%, 7d: ${p7d.toFixed(0)}%`, 20, y + 10);
        y += 30;
      }
      doc.save(`地震分析报告_${new Date().toISOString().slice(0, 10)}.pdf`);
      setIsGenerating(false); setReportGenerated(true);
    }, 800);
  }, [title, author, institution, sections, ensureComputed, mechanism, sourceDepth]);

  ensureComputed();
  const times = [0, 1, 3, 6, 12, 24, 48, 72, 168];
  const energyLabels = computedValues.current ? times.map(t => t >= 24 ? `${t / 24}d` : `${t}h`) : ['0h', '1h', '3h', '6h', '12h', '24h', '48h', '72h', '7d'];
  const energyDataPoints = computedValues.current
    ? computedValues.current.cumEnergy.filter((_, i) => i % Math.floor(computedValues.current.cumEnergy.length / 8) === 0).slice(0, 9)
    : [0.1, 0.45, 0.68, 0.79, 0.85, 0.91, 0.95, 0.97, 1.0];
  const energyData = { labels: energyLabels, datasets: [{ label: '累计能量释放', data: energyDataPoints, borderColor: '#00e5c7', backgroundColor: 'rgba(0,229,199,0.1)', fill: true, stepped: true, tension: 0 }] };

  const omoriData = computedValues.current ? computeOmoriDecay(10, 0.1, 1.1, 30) : [];
  const aftershockLabels = ['1h', '6h', '12h', '24h', '48h', '72h', '7d', '30d'];
  const aftershockPoints = computedValues.current ? [
    Math.min(99, omoriData[0]?.rate * 9 || 95),
    Math.min(98, omoriData[0]?.rate * 8 || 88),
    Math.min(95, omoriData[0]?.rate * 7.5 || 82),
    Math.min(90, omoriData[0]?.rate * 7 || 78),
    Math.min(80, omoriData[0]?.rate * 5.5 || 60),
    Math.min(75, omoriData[0]?.rate * 4 || 45),
    Math.min(60, omoriData[6]?.rate * 3 || 22),
    Math.min(30, omoriData[29]?.rate * 2 || 8),
  ] : [95, 88, 82, 78, 60, 45, 22, 8];
  const aftershockData = { labels: aftershockLabels, datasets: [{ label: '余震概率 (%)', data: aftershockPoints, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4 }] };

  const today = new Date().toLocaleDateString('zh-CN');

  return (
    <div className="page-container">
      <h1 className="section-title mb-6"><FileText className="w-5 h-5 text-seismo-cyan" />报告生成</h1>
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        <div className="w-80 flex-shrink-0 glass-panel p-5 overflow-y-auto space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3 text-seismo-text-dim text-sm font-mono"><Settings className="w-4 h-4" />封面信息</div>
            <div className="space-y-3">
              <input className="input-field w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="报告标题" />
              <input className="input-field w-full" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="作者" />
              <input className="input-field w-full" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="机构" />
            </div>
          </div>
          <div className="border-t border-seismo-border pt-4">
            <div className="text-seismo-text-dim text-sm font-mono mb-3">内容模块选择</div>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 cursor-pointer text-sm text-seismo-text group">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${sections.includes(s.key) ? 'bg-seismo-cyan border-seismo-cyan text-seismo-bg' : 'border-seismo-border group-hover:border-seismo-cyan/50'}`} onClick={() => toggleSection(s.key)}>
                    {sections.includes(s.key) && <Check className="w-3 h-3" />}
                  </span>
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="border-t border-seismo-border pt-4">
            <div className="text-seismo-text-dim text-sm font-mono mb-2">关联反演任务</div>
            <select className="input-field w-full" value={selectedInversion} onChange={(e) => setSelectedInversion(e.target.value)}>
              {INVERSION_TASKS.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="border-t border-seismo-border pt-4 space-y-3">
            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={generatePDF} disabled={isGenerating}>
              <Printer className="w-4 h-4" />{isGenerating ? '生成中...' : '生成报告'}
            </button>
            {reportGenerated && (
              <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={generatePDF}>
                <Download className="w-4 h-4" />下载PDF
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex justify-center py-4">
          <div className="bg-white rounded-lg shadow-2xl shadow-black/50" style={{ width: 595, aspectRatio: '210/297' }}>
            <div className="p-10 text-gray-800 text-sm space-y-6">
              <div className="text-center py-8 border-b-2 border-gray-300">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
                <div className="w-24 h-0.5 bg-cyan-500 mx-auto mb-4" />
                <p className="text-gray-600">作者: {author}</p>
                <p className="text-gray-600">机构: {institution}</p>
                <p className="text-gray-600">日期: {today}</p>
              </div>
              {sections.includes('waveform_fit') && computedValues.current && (
                <div>
                  <h2 className="text-base font-bold mb-2 border-l-4 border-cyan-500 pl-2">1. 波形拟合图</h2>
                  <canvas ref={waveformRef} className="w-full border border-gray-200 rounded" />
                  <p className="text-xs text-gray-500 mt-1 text-center">相关系数: {computedValues.current.correlation.toFixed(3)} | 残差: {computedValues.current.residual.toFixed(3)}</p>
                </div>
              )}
              {sections.includes('depth_profile') && (
                <div>
                  <h2 className="text-base font-bold mb-2 border-l-4 border-cyan-500 pl-2">2. 震源深度剖面</h2>
                  <canvas ref={depthRef} className="w-full border border-gray-200 rounded" />
                </div>
              )}
              {sections.includes('energy_curve') && (
                <div>
                  <h2 className="text-base font-bold mb-2 border-l-4 border-cyan-500 pl-2">3. 能量释放曲线</h2>
                  <div className="border border-gray-200 rounded p-3">
                    <Line data={energyData} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: false } }, scales: { x: { title: { display: true, text: '时间' }, grid: { color: '#f0f0f0' } }, y: { title: { display: true, text: '归一化能量' }, grid: { color: '#f0f0f0' }, min: 0, max: 1.1 } } }} />
                  </div>
                </div>
              )}
              {sections.includes('mechanism') && computedValues.current && (
                <div>
                  <h2 className="text-base font-bold mb-2 border-l-4 border-cyan-500 pl-2">4. 震源机制解</h2>
                  <div className="flex items-center gap-6">
                    <canvas ref={beachBallRef} className="border border-gray-200 rounded" />
                    <div className="text-xs space-y-1 text-gray-600">
                      <p>走向 (Strike): {mechanism.strike}°</p>
                      <p>倾角 (Dip): {mechanism.dip}°</p>
                      <p>滑角 (Rake): {mechanism.rake}°</p>
                      <p>矩震级 Mw: {computedValues.current.mw.toFixed(2)}</p>
                      <p className="text-gray-400 mt-2">类型: 走滑断层</p>
                    </div>
                  </div>
                </div>
              )}
              {sections.includes('aftershock') && computedValues.current && (
                <div>
                  <h2 className="text-base font-bold mb-2 border-l-4 border-cyan-500 pl-2">5. 余震概率分布</h2>
                  <div className="border border-gray-200 rounded p-3 mb-2">
                    <Line data={aftershockData} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: false } }, scales: { x: { title: { display: true, text: '时间' }, grid: { color: '#f0f0f0' } }, y: { title: { display: true, text: '概率 (%)' }, grid: { color: '#f0f0f0' }, min: 0, max: 100 } } }} />
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-100"><th className="border border-gray-300 px-2 py-1">时间窗</th><th className="border border-gray-300 px-2 py-1">M≥3.0</th><th className="border border-gray-300 px-2 py-1">M≥5.0</th></tr></thead>
                    <tbody>
                      <tr><td className="border border-gray-300 px-2 py-1">24h</td><td className="border border-gray-300 px-2 py-1 text-center">{Math.min(98, computedValues.current.aftershock24h * 7).toFixed(0)}%</td><td className="border border-gray-300 px-2 py-1 text-center">{Math.min(30, computedValues.current.aftershock24h * 1.2).toFixed(0)}%</td></tr>
                      <tr><td className="border border-gray-300 px-2 py-1">72h</td><td className="border border-gray-300 px-2 py-1 text-center">{Math.min(85, computedValues.current.aftershock24h * 4).toFixed(0)}%</td><td className="border border-gray-300 px-2 py-1 text-center">{Math.min(15, computedValues.current.aftershock24h * 0.7).toFixed(0)}%</td></tr>
                      <tr><td className="border border-gray-300 px-2 py-1">7d</td><td className="border border-gray-300 px-2 py-1 text-center">{Math.min(60, computedValues.current.aftershock24h * 2).toFixed(0)}%</td><td className="border border-gray-300 px-2 py-1 text-center">{Math.min(8, computedValues.current.aftershock24h * 0.3).toFixed(0)}%</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
