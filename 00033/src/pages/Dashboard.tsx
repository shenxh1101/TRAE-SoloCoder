import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity, Radio, Loader, AlertTriangle, ArrowUpRight, Upload, Play, Bell, Clock, MapPin, TrendingUp, Waves } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface SeismicEvent {
  id: number; lat: number; lon: number; mag: number; depth: number; location: string; time: string;
}

const events: SeismicEvent[] = [
  { id: 1, lat: 39.9, lon: 116.4, mag: 2.3, depth: 12, location: '北京昌平', time: '14:23' },
  { id: 2, lat: 31.2, lon: 121.5, mag: 3.5, depth: 25, location: '上海浦东', time: '13:45' },
  { id: 3, lat: 30.6, lon: 104.1, mag: 4.8, depth: 15, location: '四川成都', time: '12:30' },
  { id: 4, lat: 25.0, lon: 102.7, mag: 5.2, depth: 10, location: '云南昆明', time: '11:15' },
  { id: 5, lat: 36.1, lon: 103.8, mag: 3.1, depth: 20, location: '甘肃兰州', time: '10:50' },
  { id: 6, lat: 34.3, lon: 108.9, mag: 2.8, depth: 8, location: '陕西西安', time: '09:30' },
  { id: 7, lat: 43.8, lon: 87.6, mag: 4.2, depth: 30, location: '新疆乌鲁木齐', time: '08:20' },
  { id: 8, lat: 29.7, lon: 91.1, mag: 3.8, depth: 18, location: '西藏拉萨', time: '07:45' },
  { id: 9, lat: 22.5, lon: 114.1, mag: 2.1, depth: 5, location: '广东深圳', time: '06:30' },
  { id: 10, lat: 28.2, lon: 112.9, mag: 2.9, depth: 14, location: '湖南长沙', time: '05:15' },
  { id: 11, lat: 45.8, lon: 126.5, mag: 3.3, depth: 22, location: '黑龙江哈尔滨', time: '04:40' },
  { id: 12, lat: 38.0, lon: 114.5, mag: 5.8, depth: 35, location: '河北石家庄', time: '03:20' },
  { id: 13, lat: 26.6, lon: 106.7, mag: 2.5, depth: 9, location: '贵州贵阳', time: '02:10' },
  { id: 14, lat: 20.0, lon: 110.3, mag: 1.8, depth: 7, location: '海南海口', time: '01:50' },
  { id: 15, lat: 41.8, lon: 123.4, mag: 3.6, depth: 16, location: '辽宁沈阳', time: '00:30' },
  { id: 16, lat: 32.1, lon: 118.8, mag: 4.5, depth: 28, location: '江苏南京', time: '23:45' },
  { id: 17, lat: 36.7, lon: 117.0, mag: 2.0, depth: 6, location: '山东济南', time: '22:20' },
  { id: 18, lat: 29.6, lon: 106.5, mag: 3.9, depth: 19, location: '重庆', time: '21:10' },
  { id: 19, lat: 23.1, lon: 113.3, mag: 2.7, depth: 11, location: '广东广州', time: '20:00' },
  { id: 20, lat: 37.9, lon: 112.5, mag: 4.0, depth: 24, location: '山西太原', time: '18:30' },
];

const chinaOutline = [
  [73.5,39.5],[75,40.5],[78,41],[80,43],[82,45],[85,47],[88,48],[90,46],[93,45],
  [96,43],[98,40],[100,42],[103,42],[105,41],[108,42],[110,44],[112,45],[115,45.5],
  [117,47],[119,47],[120,46],[122,46],[124,48],[127,50],[130,48],[133,48],[135,47],
  [134,46],[132,44],[131,43],[128,42],[126,41],[124,40],[122,38],[121,36],[121,34],
  [120,32],[121,30],[122,29],[121,28],[120,27],[119,26],[118,24],[117,23],[116,22],
  [114,22],[113,22],[111,21],[110,20],[108,21],[107,22],[106,22],[104,22],[102,22],
  [100,22],[98,24],[97,25],[98,28],[97,28],[95,29],[93,28],[91,28],[89,27],[87,28],
  [85,28],[83,28],[81,30],[79,32],[77,35],[76,37],[74,38.5],[73.5,39.5],
];

function magColor(m: number) {
  if (m >= 4) return '#ef4444';
  if (m >= 3) return '#f59e0b';
  return '#22c55e';
}

function magBadgeClass(m: number) {
  if (m >= 4) return 'bg-seismo-red/20 text-seismo-red border-seismo-red/30';
  if (m >= 3) return 'bg-seismo-amber/20 text-seismo-amber border-seismo-amber/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
}

export default function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; event: SeismicEvent } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;
    const lonMin = 73, lonMax = 136, latMin = 17, latMax = 54;

    const toX = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * w;
    const toY = (lat: number) => ((latMax - lat) / (latMax - latMin)) * h;

    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    chinaOutline.forEach(([lon, lat], i) => {
      const x = toX(lon), y = toY(lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#1a1f35';
    ctx.fill();
    ctx.strokeStyle = '#2a3050';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    events.forEach(ev => {
      const x = toX(ev.lon), y = toY(ev.lat);
      const r = Math.max(3, (ev.mag - 1) * 2.5);
      const color = magColor(ev.mag);

      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      grad.addColorStop(0, color + '40');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, []);

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const lonMin = 73, lonMax = 136, latMin = 17, latMax = 54;
    const w = rect.width, h = rect.height;

    let found: SeismicEvent | null = null;
    let bestDist = Infinity;
    for (const ev of events) {
      const x = ((ev.lon - lonMin) / (lonMax - lonMin)) * w;
      const y = ((latMax - ev.lat) / (latMax - latMin)) * h;
      const d = Math.hypot(mx - x, my - y);
      if (d < 15 && d < bestDist) { bestDist = d; found = ev; }
    }
    if (found) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, event: found });
      canvas.style.cursor = 'pointer';
    } else {
      setTooltip(null);
      canvas.style.cursor = 'default';
    }
  };

  const recentEvents = events.slice(0, 8);

  const chartData = {
    labels: ['6/1', '6/2', '6/3', '6/4', '6/5', '6/6', '6/7'],
    datasets: [{
      label: '事件数',
      data: [5, 8, 3, 12, 7, 9, 6],
      borderColor: '#00e5c7',
      backgroundColor: 'rgba(0, 229, 199, 0.08)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#00e5c7',
      pointBorderColor: '#0a0e1a',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1f35',
        borderColor: '#2a3050',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: '#2a305040', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
      },
      y: {
        grid: { color: '#2a305040', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="page-container space-y-6">
      <h1 className="section-title">
        <Activity size={20} className="text-seismo-cyan" />
        控制台
      </h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="flex items-center justify-between">
            <span className="stat-label">24h事件数</span>
            <Waves size={18} className="text-seismo-cyan opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="stat-value text-seismo-cyan">12</span>
        </div>
        <div className="stat-card group">
          <div className="flex items-center justify-between">
            <span className="stat-label">活跃台站</span>
            <Radio size={18} className="text-green-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="stat-value text-green-400">5/5</span>
        </div>
        <div className="stat-card group">
          <div className="flex items-center justify-between">
            <span className="stat-label">运行中任务</span>
            <Loader size={18} className="text-seismo-amber opacity-60 group-hover:opacity-100 transition-opacity animate-spin" />
          </div>
          <span className="stat-value text-seismo-amber">3</span>
        </div>
        <div className="stat-card group animate-pulse-slow border-seismo-red/40">
          <div className="flex items-center justify-between">
            <span className="stat-label">异常告警</span>
            <AlertTriangle size={18} className="text-seismo-red opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="stat-value text-seismo-red">2</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 glass-panel p-4">
          <h2 className="section-title text-sm mb-3">
            <MapPin size={16} className="text-seismo-cyan" />
            事件地图
          </h2>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg"
              style={{ height: 400 }}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setTooltip(null)}
            />
            {tooltip && (
              <div
                className="absolute z-10 glass-panel px-3 py-2 pointer-events-none text-xs animate-fade-in"
                style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
              >
                <div className="font-mono font-bold text-seismo-text">{tooltip.event.location}</div>
                <div className="text-seismo-text-dim mt-1">
                  震级 <span style={{ color: magColor(tooltip.event.mag) }}>{tooltip.event.mag}</span> · 深度 {tooltip.event.depth}km
                </div>
                <div className="text-seismo-text-muted mt-0.5">{tooltip.event.time}</div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-seismo-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {'<3.0'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-seismo-amber inline-block" /> 3.0-4.0</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-seismo-red inline-block" /> {'>4.0'}</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="glass-panel p-4">
            <h2 className="section-title text-sm mb-3">
              <Clock size={16} className="text-seismo-cyan" />
              最近事件
            </h2>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {recentEvents.map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-seismo-panel/60 transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] text-seismo-text-muted font-mono w-10 shrink-0">{ev.time}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${magBadgeClass(ev.mag)}`}>
                    M{ev.mag}
                  </span>
                  <span className="text-xs text-seismo-text truncate flex-1">{ev.location}</span>
                  <span className="text-[10px] text-seismo-text-muted font-mono shrink-0">{ev.depth}km</span>
                  <ArrowUpRight size={12} className="text-seismo-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-4">
            <h2 className="section-title text-sm mb-3">
              <TrendingUp size={16} className="text-seismo-cyan" />
              快捷操作
            </h2>
            <div className="space-y-2">
              <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <Upload size={14} /> 上传波形
              </button>
              <button className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <Play size={14} /> 新建正演
              </button>
              <button className="btn-danger w-full flex items-center justify-center gap-2 text-sm">
                <Bell size={14} /> 查看告警
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <h2 className="section-title text-sm mb-3">
          <TrendingUp size={16} className="text-seismo-cyan" />
          震级时间分布
        </h2>
        <div style={{ height: 200 }}>
          <Line data={chartData} options={chartOptions as any} />
        </div>
      </div>
    </div>
  );
}
