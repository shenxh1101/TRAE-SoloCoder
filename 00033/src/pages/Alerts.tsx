import { useState, useRef, useEffect } from 'react';
import { Bell, MapPin, AlertTriangle, CheckCircle, Radio, Clock, Send, Eye, Activity } from 'lucide-react';
import { geigerLocalization, generateArrivalTimes, gridSearchLocalization } from '@/engine/localization';

type AlertLevel = '警告' | '注意' | '信息';
type AlertStatus = 'pending' | 'located' | 'acknowledged';

interface SeismoAlert {
  id: string;
  triggerTime: string;
  level: AlertLevel;
  signalType: string;
  stations: string[];
  location: { lat: number; lon: number; depth: number } | null;
  errorEllipse: { semiMajor: number; semiMinor: number; azimuth: number } | null;
  status: AlertStatus;
  pArrivalTimes?: Record<string, number>;
  localizationMetrics?: { rmsResidual: number; iterations: number; converged: boolean; method: string };
}

interface StationData { id: string; code: string; lat: number; lon: number; elevation: number; }
interface Notification { id: string; recipient: string; sentTime: string; read: boolean; }

const stations: StationData[] = [
  { id: 'BJS', code: 'BJS', lat: 39.9, lon: 116.4, elevation: 43 },
  { id: 'SHH', code: 'SHH', lat: 31.2, lon: 121.5, elevation: 4 },
  { id: 'KMI', code: 'KMI', lat: 25.0, lon: 102.7, elevation: 1890 },
  { id: 'GYA', code: 'GYA', lat: 29.6, lon: 91.1, elevation: 3650 },
  { id: 'WHN', code: 'WHN', lat: 30.6, lon: 114.3, elevation: 23 },
  { id: 'XAN', code: 'XAN', lat: 34.3, lon: 108.9, elevation: 405 },
  { id: 'LZH', code: 'LZH', lat: 36.1, lon: 103.8, elevation: 1520 },
  { id: 'URC', code: 'URC', lat: 43.8, lon: 87.6, elevation: 735 },
];

const velocityLayers = [{ depth: 0, vp: 5.8 }, { depth: 20, vp: 6.5 }, { depth: 35, vp: 8.04 }];

const initialAlerts: SeismoAlert[] = [
  { id: 'alt-1', triggerTime: '2024-01-15 10:23:45', level: '警告', signalType: 'P波异常振幅', stations: ['BJS', 'SHH', 'KMI'], location: { lat: 31.0, lon: 103.5, depth: 15 }, errorEllipse: { semiMajor: 12, semiMinor: 8, azimuth: 35 }, status: 'located', localizationMetrics: { rmsResidual: 0.23, iterations: 8, converged: true, method: 'Geiger' } },
  { id: 'alt-2', triggerTime: '2024-01-15 11:05:12', level: '注意', signalType: 'S波延迟异常', stations: ['GYA', 'WHN'], location: null, errorEllipse: null, status: 'pending' },
  { id: 'alt-3', triggerTime: '2024-01-15 09:45:30', level: '信息', signalType: '微震群活动', stations: ['KMI', 'BJS'], location: { lat: 25.0, lon: 102.5, depth: 8 }, errorEllipse: { semiMajor: 20, semiMinor: 15, azimuth: 60 }, status: 'acknowledged', localizationMetrics: { rmsResidual: 0.45, iterations: 12, converged: true, method: 'GridSearch' } },
  { id: 'alt-4', triggerTime: '2024-01-15 12:30:00', level: '注意', signalType: '面波频散异常', stations: ['XAN', 'LZH', 'BJS'], location: { lat: 34.5, lon: 108.0, depth: 22 }, errorEllipse: { semiMajor: 18, semiMinor: 10, azimuth: 45 }, status: 'located', localizationMetrics: { rmsResidual: 0.18, iterations: 6, converged: true, method: 'Geiger' } },
];

const initialNotifications: Notification[] = [
  { id: 'n1', recipient: '张伟 (值班员)', sentTime: '2024-01-15 10:24:10', read: false },
  { id: 'n2', recipient: '李明 (分析员)', sentTime: '2024-01-15 10:24:10', read: false },
  { id: 'n3', recipient: '王芳 (主管)', sentTime: '2024-01-15 10:25:00', read: true },
];

const analysts = ['张伟 (值班员)', '李明 (分析员)', '王芳 (主管)', '刘洋 (外场)', '陈静 (监测)'];

const levelConfig: Record<AlertLevel, { bg: string; text: string; border: string; icon: typeof AlertTriangle }> = {
  '警告': { bg: 'bg-seismo-red/10', text: 'text-seismo-red', border: 'border-seismo-red', icon: AlertTriangle },
  '注意': { bg: 'bg-seismo-amber/10', text: 'text-seismo-amber', border: 'border-seismo-amber', icon: Radio },
  '信息': { bg: 'bg-seismo-cyan/10', text: 'text-seismo-cyan', border: 'border-seismo-cyan', icon: Bell },
};

function LocationMap({ alert }: { alert: SeismoAlert }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1a1f35'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const minLat = 20, maxLat = 50, minLon = 75, maxLon = 135;
    const latToY = (lat: number) => h - ((lat - minLat) / (maxLat - minLat)) * h;
    const lonToX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * w;
    alert.stations.forEach(sid => {
      const st = stations.find(s => s.id === sid);
      if (!st) return;
      const x = lonToX(st.lon), y = latToY(st.lat);
      ctx.fillStyle = '#00e5c7';
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4); ctx.closePath(); ctx.fill();
      ctx.font = '9px monospace'; ctx.fillStyle = '#64748b'; ctx.fillText(st.code, x + 6, y + 2);
    });
    if (alert.location && alert.errorEllipse) {
      const cx = lonToX(alert.location.lon), cy = latToY(alert.location.lat);
      ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const kmToPx = Math.min(w, h) / 60;
      ctx.ellipse(cx, cy, alert.errorEllipse.semiMajor * kmToPx, alert.errorEllipse.semiMinor * kmToPx, alert.errorEllipse.azimuth * Math.PI / 180, 0, Math.PI * 2);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](cx + 7 * Math.cos(angle), cy + 7 * Math.sin(angle));
      }
      ctx.closePath(); ctx.fill();
    }
  }, [alert]);
  return <canvas ref={canvasRef} width={320} height={220} className="w-full rounded-lg" />;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<SeismoAlert[]>(initialAlerts);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedId, setSelectedId] = useState<string>(alerts[0].id);
  const selected = alerts.find(a => a.id === selectedId) || alerts[0];

  const pendingCount = alerts.filter(a => a.status === 'pending').length;
  const locatedCount = alerts.filter(a => a.status === 'located').length;
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length;

  const handleSimulateDetection = () => {
    const trueLoc = { lat: 25 + Math.random() * 15, lon: 95 + Math.random() * 25, depth: 5 + Math.random() * 25, originTime: Date.now() / 1000 - 30 };
    const alertStations = stations.slice(0, 4 + Math.floor(Math.random() * 3));
    const stationIds = alertStations.map(s => s.id);
    const arrivals = generateArrivalTimes(trueLoc, alertStations, velocityLayers, 0.1);
    const pArrivalTimes: Record<string, number> = {};
    arrivals.forEach(at => { pArrivalTimes[at.stationId] = at.pArrivalTime; });
    const now = new Date();
    const newAlert: SeismoAlert = {
      id: `alt-${Date.now()}`, triggerTime: now.toISOString().replace('T', ' ').substring(0, 19),
      level: '警告', signalType: 'P波自动检测', stations: stationIds,
      location: null, errorEllipse: null, status: 'pending', pArrivalTimes
    };
    setAlerts(prev => [newAlert, ...prev]);
    setSelectedId(newAlert.id);
  };

  const handleLocate = (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    const stData = alert.stations.map(sid => {
      const st = stations.find(s => s.id === sid)!;
      return { id: st.id, lat: st.lat, lon: st.lon, elevation: st.elevation, pArrivalTime: alert.pArrivalTimes?.[sid] ?? Date.now() / 1000 - Math.random() * 10 };
    });
    const cLat = stData.reduce((s, d) => s + d.lat, 0) / stData.length;
    const cLon = stData.reduce((s, d) => s + d.lon, 0) / stData.length;
    try {
      const res = geigerLocalization({ stations: stData, velocityModel: velocityLayers, initialGuess: { lat: cLat, lon: cLon, depth: 10, originTime: Date.now() / 1000 - 20 } });
      const rms = Math.sqrt(res.residuals.reduce((s, r) => s + r * r, 0) / res.residuals.length);
      setAlerts(prev => prev.map(a => a.id !== alertId ? a : { ...a, location: { lat: res.location.lat, lon: res.location.lon, depth: res.location.depth }, errorEllipse: res.errorEllipse, status: 'located', localizationMetrics: { rmsResidual: rms, iterations: res.iterations, converged: res.converged, method: 'Geiger' } }));
    } catch (e) {
      const res = gridSearchLocalization({ stations: stData, velocityModel: velocityLayers, searchBounds: { minLat: 20, maxLat: 50, minLon: 75, maxLon: 135, minDepth: 0, maxDepth: 50 }, gridStep: 1.0 });
      setAlerts(prev => prev.map(a => a.id !== alertId ? a : { ...a, location: { lat: res.location.lat, lon: res.location.lon, depth: res.location.depth }, errorEllipse: { semiMajor: 25, semiMinor: 20, azimuth: 0 }, status: 'located', localizationMetrics: { rmsResidual: res.rms, iterations: 1, converged: true, method: 'GridSearch' } }));
    }
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id !== alertId ? a : { ...a, status: 'acknowledged' }));
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newNotifs: Notification[] = analysts.map((name, i) => ({ id: `n-${Date.now()}-${i}`, recipient: name, sentTime: timeStr, read: false }));
    setNotifications(prev => [...newNotifs, ...prev]);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title"><Bell className="w-5 h-5 text-seismo-cyan" />告警通知</h1>
        <button onClick={handleSimulateDetection} className="btn-primary text-xs flex items-center gap-1"><Activity size={14} /> 模拟多台站检测</button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card border-l-2 border-l-seismo-red"><span className="stat-label">待处理告警</span><span className="stat-value text-seismo-red">{pendingCount}</span></div>
        <div className="stat-card border-l-2 border-l-seismo-amber"><span className="stat-label">已定位</span><span className="stat-value text-seismo-amber">{locatedCount}</span></div>
        <div className="stat-card border-l-2 border-l-seismo-cyan"><span className="stat-label">已确认</span><span className="stat-value text-seismo-cyan">{acknowledgedCount}</span></div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <h2 className="section-title mb-4 text-base">异常信号列表</h2>
          <div className="space-y-3">
            {alerts.map(alt => {
              const cfg = levelConfig[alt.level];
              const LevelIcon = cfg.icon;
              const isPulse = alt.status === 'pending';
              return (
                <div key={alt.id} onClick={() => setSelectedId(alt.id)} className={`glass-card p-4 cursor-pointer transition-all hover:bg-seismo-panel/60 ${selectedId === alt.id ? 'ring-1 ring-seismo-cyan/30' : ''} border-l-2 ${cfg.border} ${isPulse ? 'animate-pulse-slow' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <LevelIcon className={`w-4 h-4 ${cfg.text}`} />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{alt.level}</span>
                      <span className="text-sm text-seismo-text">{alt.signalType}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-seismo-text-muted"><Clock className="w-3 h-3" />{alt.triggerTime}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="w-3 h-3 text-seismo-text-muted" />
                    <div className="flex gap-1">{alt.stations.map(s => (<span key={s} className="text-xs bg-seismo-bg px-1.5 py-0.5 rounded font-mono text-seismo-text-dim">{s}</span>))}</div>
                  </div>
                  {alt.location && (<div className="flex items-center gap-1 text-xs text-seismo-text-dim mb-2"><MapPin className="w-3 h-3 text-seismo-cyan" />{alt.location.lat.toFixed(2)}°N, {alt.location.lon.toFixed(2)}°E, 深度 {alt.location.depth.toFixed(1)}km</div>)}
                  <div className="flex gap-2 mt-2">
                    {alt.status !== 'located' && (<button onClick={(e) => { e.stopPropagation(); handleLocate(alt.id); }} className="btn-secondary text-xs px-3 py-1 flex items-center gap-1"><MapPin className="w-3 h-3" />定位</button>)}
                    {alt.status !== 'acknowledged' && (<button onClick={(e) => { e.stopPropagation(); handleAcknowledge(alt.id); }} className="btn-primary text-xs px-3 py-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />确认</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-span-5 space-y-4">
          <div className="glass-panel p-4">
            <h2 className="section-title mb-3 text-base"><MapPin className="w-4 h-4 text-seismo-cyan" />快速定位结果</h2>
            {selected.location ? (
              <>
                <LocationMap alert={selected} />
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="glass-card p-2"><span className="text-seismo-text-muted">纬度</span><span className="font-mono text-seismo-text ml-2">{selected.location.lat.toFixed(2)}°</span></div>
                  <div className="glass-card p-2"><span className="text-seismo-text-muted">经度</span><span className="font-mono text-seismo-text ml-2">{selected.location.lon.toFixed(2)}°</span></div>
                  <div className="glass-card p-2"><span className="text-seismo-text-muted">深度</span><span className="font-mono text-seismo-text ml-2">{selected.location.depth.toFixed(1)}km</span></div>
                  {selected.errorEllipse && (<div className="glass-card p-2"><span className="text-seismo-text-muted">误差椭圆</span><span className="font-mono text-seismo-text-dim ml-1">{selected.errorEllipse.semiMajor.toFixed(1)}×{selected.errorEllipse.semiMinor.toFixed(1)}km ∠{selected.errorEllipse.azimuth.toFixed(0)}°</span></div>)}
                </div>
                {selected.localizationMetrics && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="glass-card p-2"><span className="text-seismo-text-muted">RMS残差</span><span className="font-mono text-seismo-text ml-2">{selected.localizationMetrics.rmsResidual.toFixed(3)}s</span></div>
                    <div className="glass-card p-2"><span className="text-seismo-text-muted">迭代次数</span><span className="font-mono text-seismo-text ml-2">{selected.localizationMetrics.iterations}</span></div>
                    <div className="glass-card p-2"><span className="text-seismo-text-muted">收敛状态</span><span className={`font-mono ml-2 ${selected.localizationMetrics.converged ? 'text-green-400' : 'text-seismo-red'}`}>{selected.localizationMetrics.converged ? '已收敛' : '未收敛'}</span></div>
                    <div className="glass-card p-2"><span className="text-seismo-text-muted">定位方法</span><span className="font-mono text-seismo-cyan ml-2">{selected.localizationMetrics.method}</span></div>
                  </div>
                )}
              </>
            ) : (<div className="flex items-center justify-center h-48 text-seismo-text-muted text-sm">尚未定位，请先执行定位操作</div>)}
          </div>
          <div className="glass-panel p-4">
            <h2 className="section-title mb-3 text-base"><Send className="w-4 h-4 text-seismo-cyan" />通知记录</h2>
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className="flex items-center justify-between py-2 border-b border-seismo-border/30 last:border-0">
                  <div className="flex items-center gap-2">{n.read ? (<CheckCircle className="w-3.5 h-3.5 text-green-400" />) : (<span className="w-2 h-2 rounded-full bg-seismo-red" />)}<span className="text-sm text-seismo-text-dim">{n.recipient}</span></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-seismo-text-muted">{n.sentTime}</span><Eye className={`w-3 h-3 ${n.read ? 'text-green-400' : 'text-seismo-red'}`} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
