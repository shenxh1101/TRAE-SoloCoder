import { useRef, useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import { Globe, Activity, Download, MapPin, Layers, Zap } from "lucide-react";
import {
  renderBeachBall, computeAftershockProbability,
  computeOmoriDecay, traceRays, computeCumulativeEnergy
} from '@/engine/visualization';
import { mechanismToMT, mtToMechanism } from '@/engine/inversion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const epicenter = { lat: 31.0, lon: 103.5, depth: 15 };
const velocityLayers = [
  { depth: 0, vp: 5.8 },
  { depth: 20, vp: 6.5 },
  { depth: 35, vp: 8.04 },
  { depth: 120, vp: 8.05 },
];

function drawBeachBall(canvas: HTMLCanvasElement, mechanism: { strike: number; dip: number; rake: number }, projection: 'equal-area' | 'conformal') {
  renderBeachBall(canvas, mechanism.strike, mechanism.dip, mechanism.rake, { projection });
}

function drawHeatmap(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const imageData = ctx.createImageData(w, h);
  const maxDistKm = 200;
  const pxPerKm = Math.min(cx, cy) / maxDistKm;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dx = px - cx, dy = py - cy;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const distKm = distPx / pxPerKm;
      const prob = computeAftershockProbability({
        mainMagnitude: 6.5, elapsedTimeHours: 1, timeWindowHours: 24, minMagnitude: 4.0,
        bValue: 1.0, pValue: 1.1, cValue: 0.1
      }) * Math.exp(-distKm / 60);
      const idx = (py * w + px) * 4;
      if (prob > 0.01) {
        if (prob > 0.6) {
          imageData.data[idx] = 239; imageData.data[idx + 1] = 68;
          imageData.data[idx + 2] = 68;
        } else if (prob > 0.3) {
          imageData.data[idx] = 245; imageData.data[idx + 1] = 158;
          imageData.data[idx + 2] = 11;
        } else {
          imageData.data[idx] = 59; imageData.data[idx + 1] = 130;
          imageData.data[idx + 2] = 246;
        }
        imageData.data[idx + 3] = Math.floor(Math.min(prob * 255, 200));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  [0.3, 0.5, 0.75].forEach((level, i) => {
    const cr = -60 * Math.log(level / computeAftershockProbability({
      mainMagnitude: 6.5, elapsedTimeHours: 1, timeWindowHours: 24, minMagnitude: 4.0
    })) * pxPerKm;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 2 * Math.PI);
    const colors = ["#3b82f6", "#f59e0b", "#ef4444"];
    ctx.strokeStyle = colors[i]; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "10px monospace"; ctx.fillStyle = colors[i];
    ctx.fillText(`${(level * 100).toFixed(0)}%`, cx + cr + 4, cy - 4);
  });

  ctx.beginPath();
  ctx.moveTo(cx - 8, cy); ctx.lineTo(cx, cy - 12); ctx.lineTo(cx + 8, cy); ctx.closePath();
  ctx.fillStyle = "#f59e0b"; ctx.fill();
  ctx.font = "10px monospace"; ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`(${epicenter.lon}°E, ${epicenter.lat}°N)`, cx + 12, cy + 4);
}

function drawDepthProfile(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, 0, w, h);

  const ml = 60, mr = 20, mt = 20, mb = 40;
  const pw = w - ml - mr, ph = h - mt - mb;
  const maxDepth = 120, maxDist = 100;
  const sx = ml, sy = mt;

  const layerColors = ["#1a2744", "#1f2d52", "#243460", "#1a2a4a"];
  for (let i = 0; i < velocityLayers.length; i++) {
    const y1 = sy + (velocityLayers[i].depth / maxDepth) * ph;
    const y2 = i < velocityLayers.length - 1
      ? sy + (velocityLayers[i + 1].depth / maxDepth) * ph
      : sy + ph;
    ctx.fillStyle = layerColors[i]; ctx.fillRect(sx, y1, pw, y2 - y1);
    ctx.strokeStyle = "rgba(42,48,80,0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, y1); ctx.lineTo(sx + pw, y1); ctx.stroke();
    ctx.font = "10px monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText(`Vp=${velocityLayers[i].vp}`, sx + pw - 70, y1 + 14);
  }

  const srcX = sx + pw * 0.45, srcY = sy + (epicenter.depth / maxDepth) * ph;
  ctx.beginPath(); ctx.moveTo(srcX - 6, srcY); ctx.lineTo(srcX, srcY - 10);
  ctx.lineTo(srcX + 6, srcY); ctx.closePath();
  ctx.fillStyle = "#f59e0b"; ctx.fill();
  ctx.font = "10px monospace"; ctx.fillStyle = "#f59e0b";
  ctx.fillText(`${epicenter.depth}km`, srcX + 8, srcY + 4);

  const stationDistances = [-40, -20, 0, 20, 40, 60, 80];
  const rays = traceRays({ velocityModel: velocityLayers, sourceDepth: epicenter.depth, stationDistances });

  rays.forEach((ray) => {
    ctx.strokeStyle = ray.phase === 'P' ? "rgba(0,229,199,0.6)" : "rgba(239,68,68,0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ray.points.forEach((pt, i) => {
      const x = sx + ((pt.x + 50) / maxDist) * pw;
      const y = sy + (pt.z / maxDepth) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  stationDistances.forEach((dist) => {
    const stx = sx + ((dist + 50) / maxDist) * pw;
    ctx.beginPath(); ctx.moveTo(stx - 5, sy); ctx.lineTo(stx, sy - 8);
    ctx.lineTo(stx + 5, sy); ctx.closePath();
    ctx.fillStyle = "#00e5c7"; ctx.fill();
  });

  ctx.strokeStyle = "#2a3050"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx, sy + ph); ctx.lineTo(sx + pw, sy + ph); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + ph); ctx.stroke();

  ctx.font = "10px monospace"; ctx.fillStyle = "#64748b"; ctx.textAlign = "center";
  for (let d = -40; d <= maxDist; d += 20) {
    const x = sx + ((d + 50) / maxDist) * pw;
    ctx.fillText(`${d}`, x, sy + ph + 16);
  }
  ctx.fillText("距离 (km)", sx + pw / 2, sy + ph + 32);
  ctx.textAlign = "right";
  for (let d = 0; d <= maxDepth; d += 20) {
    const y = sy + (d / maxDepth) * ph;
    ctx.fillText(`${d}`, sx - 6, y + 4);
  }
  ctx.save(); ctx.translate(14, sy + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.fillText("深度 (km)", 0, 0); ctx.restore();
}

function BeachBallSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [projection, setProjection] = useState<"equal-area" | "conformal">("equal-area");
  const [mechanism, setMechanism] = useState({ strike: 30, dip: 45, rake: 90 });
  const mt = mechanismToMT(mechanism.strike, mechanism.dip, mechanism.rake);

  useEffect(() => { if (canvasRef.current) drawBeachBall(canvasRef.current, mechanism, projection); }, [mechanism, projection]);

  return (
    <div className="glass-card p-4">
      <h3 className="section-title text-sm mb-3"><Globe size={16} /> 震源机制解图</h3>
      <div className="flex justify-center mb-3">
        <canvas ref={canvasRef} width={300} height={300} className="rounded-lg" />
      </div>
      <div className="flex gap-2 mb-3">
        <button className={projection === "equal-area" ? "btn-primary text-xs" : "btn-secondary text-xs"}
          onClick={() => setProjection("equal-area")}>等面积投影</button>
        <button className={projection === "conformal" ? "btn-primary text-xs" : "btn-secondary text-xs"}
          onClick={() => setProjection("conformal")}>等角投影</button>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-seismo-text-dim w-12">走向</label>
          <input type="range" min="0" max="360" value={mechanism.strike}
            onChange={(e) => setMechanism({ ...mechanism, strike: parseInt(e.target.value) })}
            className="flex-1" />
          <span className="text-xs font-mono text-seismo-text w-10">{mechanism.strike}°</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-seismo-text-dim w-12">倾角</label>
          <input type="range" min="0" max="90" value={mechanism.dip}
            onChange={(e) => setMechanism({ ...mechanism, dip: parseInt(e.target.value) })}
            className="flex-1" />
          <span className="text-xs font-mono text-seismo-text w-10">{mechanism.dip}°</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-seismo-text-dim w-12">滑动角</label>
          <input type="range" min="-180" max="180" value={mechanism.rake}
            onChange={(e) => setMechanism({ ...mechanism, rake: parseInt(e.target.value) })}
            className="flex-1" />
          <span className="text-xs font-mono text-seismo-text w-10">{mechanism.rake}°</span>
        </div>
      </div>
      <table className="w-full text-xs text-seismo-text-dim">
        <thead><tr className="border-b border-seismo-border">
          <th className="py-1 text-left">分量</th><th>值</th><th className="text-left">分量</th><th>值</th>
        </tr></thead>
        <tbody>
          <tr><td>Mrr</td><td className="font-mono text-seismo-text">{mt[0].toFixed(3)}</td>
            <td>Mrt</td><td className="font-mono text-seismo-text">{mt[3].toFixed(3)}</td></tr>
          <tr><td>Mtt</td><td className="font-mono text-seismo-text">{mt[1].toFixed(3)}</td>
            <td>Mrp</td><td className="font-mono text-seismo-text">{mt[4].toFixed(3)}</td></tr>
          <tr><td>Mpp</td><td className="font-mono text-seismo-text">{mt[2].toFixed(3)}</td>
            <td>Mtp</td><td className="font-mono text-seismo-text">{mt[5].toFixed(3)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function AftershockSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (canvasRef.current) drawHeatmap(canvasRef.current); }, []);

  const omoriData = computeOmoriDecay(10, 0.1, 1.1, 30);
  const chartData = {
    labels: omoriData.map(d => `${d.day}`),
    datasets: [{
      label: "余震率 (次/天)",
      data: omoriData.map(d => d.rate),
      borderColor: "#00e5c7",
      backgroundColor: "rgba(0,229,199,0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }],
  };

  return (
    <div className="glass-card p-4">
      <h3 className="section-title text-sm mb-3"><Activity size={16} /> 余震概率分布</h3>
      <div className="flex justify-center mb-3">
        <canvas ref={canvasRef} width={400} height={300} className="rounded-lg" />
      </div>
      <h4 className="text-xs text-seismo-text-dim mb-2 flex items-center gap-1">
        <Layers size={12} /> 时间衰减曲线 (Omori定律)
      </h4>
      <Line data={chartData} options={{
        responsive: true,
        plugins: {
          legend: { labels: { color: "#94a3b8", font: { size: 10 } } },
          title: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "天数", color: "#64748b" },
            ticks: { color: "#64748b" }, grid: { color: "rgba(42,48,80,0.3)" } },
          y: { title: { display: true, text: "余震率", color: "#64748b" },
            ticks: { color: "#64748b" }, grid: { color: "rgba(42,48,80,0.3)" } },
        },
      }} />
    </div>
  );
}

function EnergySection() {
  const mt = mechanismToMT(30, 45, 90);
  const sampleRate = 20;
  const duration = 10;
  const nSamples = sampleRate * duration;
  const momentRate: number[] = [];
  for (let i = 0; i < nSamples; i++) {
    const t = i / sampleRate;
    const stf = t < 2 ? t / 2 : Math.max(0, 1 - (t - 2) / 3);
    const mtAmp = Math.sqrt(mt[0] ** 2 + mt[1] ** 2 + mt[2] ** 2 + 2 * (mt[3] ** 2 + mt[4] ** 2 + mt[5] ** 2));
    momentRate.push(stf * mtAmp);
  }
  const cumEnergy = computeCumulativeEnergy(momentRate, sampleRate);

  const chartData = {
    labels: Array.from({ length: nSamples }, (_, i) => (i / sampleRate).toFixed(1)),
    datasets: [{
      label: "累计能量释放",
      data: cumEnergy,
      borderColor: "#f59e0b",
      backgroundColor: "rgba(245,158,11,0.15)",
      fill: true,
      tension: 0.3,
      pointRadius: 0,
    }],
  };

  return (
    <div className="glass-card p-4">
      <h3 className="section-title text-sm mb-3"><Zap size={16} /> 能量释放曲线</h3>
      <Line data={chartData} options={{
        responsive: true,
        plugins: {
          legend: { labels: { color: "#94a3b8", font: { size: 10 } } },
          title: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "时间 (s)", color: "#64748b" },
            ticks: { color: "#64748b", maxTicksLimit: 10 }, grid: { color: "rgba(42,48,80,0.3)" } },
          y: { title: { display: true, text: "归一化累计能量", color: "#64748b" },
            ticks: { color: "#64748b" }, grid: { color: "rgba(42,48,80,0.3)" } },
        },
      }} />
    </div>
  );
}

function DepthSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (canvasRef.current) drawDepthProfile(canvasRef.current); }, []);

  return (
    <div className="glass-card p-4">
      <h3 className="section-title text-sm mb-3"><MapPin size={16} /> 深度剖面图</h3>
      <div className="flex justify-center">
        <canvas ref={canvasRef} width={900} height={300} className="rounded-lg w-full" />
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title"><Layers size={20} /> 结果可视化</h1>
        <button className="btn-secondary text-xs flex items-center gap-1">
          <Download size={14} /> 导出报告
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <BeachBallSection />
        <AftershockSection />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <EnergySection />
        <DepthSection />
      </div>
    </div>
  );
}
