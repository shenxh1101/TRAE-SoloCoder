import { useState, useEffect } from 'react';
import { Plane, Clock, MapPin, Package, AlertTriangle, Cloud, Users, Zap, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts';
import { useAirport } from '../../context/AirportContext';

const BAGGAGE_STATUS_LABELS: Record<string, string> = {
  checked_in: '已值机',
  screening: '安检中',
  sorted: '已分拣',
  loaded: '已装舱',
  transit: '中转中',
  arrived: '已到达',
  claimed: '已提取',
};

const BAGGAGE_STATUS_COLORS: Record<string, string> = {
  checked_in: '#3b82f6',
  screening: '#f97316',
  sorted: '#8b5cf6',
  loaded: '#06b6d4',
  transit: '#ef4444',
  arrived: '#22d3ee',
  claimed: '#10b981',
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'text-danger', bg: 'bg-danger/10', icon: Zap },
  high: { color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
  medium: { color: 'text-amber-glow', bg: 'bg-amber-glow/10', icon: Cloud },
  low: { color: 'text-primary-light', bg: 'bg-primary-light/10', icon: Users },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  peak: '高峰预警',
  delay: '延误预警',
  weather: '天气预警',
  emergency: '紧急预警',
};

const GATE_COLORS = { available: '#10b981', occupied: '#3b82f6', maintenance: '#f97316' };

const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;
const formatTime = (ts: string) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-dark-border bg-dark-card p-3 shadow-xl">
      <p className="mb-1 text-sm text-slate-300">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const {
    gates,
    flights,
    baggages,
    alerts,
    hourlyPassengerFlow,
    monthlyPunctualityRate,
    filterFlightsByRole,
    filterGatesByRole,
    filterBaggageByRole,
    currentRole,
  } = useAirport();

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredFlights = filterFlightsByRole(flights);
  const filteredGates = filterGatesByRole(gates);
  const filteredBaggages = filterBaggageByRole(baggages);

  const totalFlights = filteredFlights.length;
  const onTimeFlights = filteredFlights.filter((f) => f.status !== 'delayed' && f.status !== 'cancelled').length;
  const punctualityRate = totalFlights > 0 ? ((onTimeFlights / totalFlights) * 100).toFixed(1) : '0';

  const occupiedGates = filteredGates.filter((g) => g.status === 'occupied').length;
  const gateUtilization = filteredGates.length > 0 ? ((occupiedGates / filteredGates.length) * 100).toFixed(1) : '0';

  const errorBaggage = filteredBaggages.filter((b) => b.status === 'transit').length;
  const baggageErrorRate = filteredBaggages.length > 0 ? ((errorBaggage / filteredBaggages.length) * 100).toFixed(1) : '0';

  const gateByTerminal = ['T1', 'T2', 'T3'].map((tid) => {
    const tg = filteredGates.filter((g) => g.terminalId === tid);
    return {
      terminal: tid,
      available: tg.filter((g) => g.status === 'available').length,
      occupied: tg.filter((g) => g.status === 'occupied').length,
      maintenance: tg.filter((g) => g.status === 'maintenance').length,
    };
  });

  const baggageStatusMap: Record<string, number> = {};
  filteredBaggages.forEach((b) => {
    baggageStatusMap[b.status] = (baggageStatusMap[b.status] || 0) + 1;
  });
  const baggageStatusData = Object.entries(baggageStatusMap).map(([status, count]) => ({
    status,
    count,
  }));

  const PIE_DATA = [
    { name: '空闲', value: filteredGates.filter((g) => g.status === 'available').length, fill: '#10b981' },
    { name: '占用', value: occupiedGates, fill: '#3b82f6' },
    { name: '维护', value: filteredGates.filter((g) => g.status === 'maintenance').length, fill: '#f97316' },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">实时运营概览</h2>
          <p className="text-xs text-slate-500">
            当前角色: {currentRole === 'admin' ? '机场管理员' : currentRole === 'airline' ? '航司代表' : currentRole === 'ground_crew' ? '地勤人员' : '旅客'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={<Plane className="h-5 w-5" />}
          iconColor="text-cyan-glow"
          label="今日航班"
          value={totalFlights}
          suffix="架次"
          accent="bg-cyan-glow"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          iconColor={Number(punctualityRate) >= 80 ? 'text-success' : 'text-amber-glow'}
          label="准点率"
          value={punctualityRate}
          suffix="%"
          accent={Number(punctualityRate) >= 80 ? 'bg-success' : 'bg-amber-glow'}
        />
        <KpiCard
          icon={<MapPin className="h-5 w-5" />}
          iconColor="text-primary-light"
          label="机位利用率"
          value={gateUtilization}
          suffix="%"
          accent="bg-primary-light"
        />
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          iconColor={Number(baggageErrorRate) > 5 ? 'text-danger' : 'text-success'}
          label="行李差错率"
          value={baggageErrorRate}
          suffix="%"
          accent={Number(baggageErrorRate) > 5 ? 'bg-danger' : 'bg-success'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="旅客流量热力图">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyPassengerFlow} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="hour"
                tickFormatter={formatHour}
                stroke="#94a3b8"
                fontSize={11}
                interval={2}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="T1" stackId="flow" fill="#22d3ee" radius={[0, 0, 0, 0]} name="T1 国内" />
              <Bar dataKey="T2" stackId="flow" fill="#3b82f6" radius={[0, 0, 0, 0]} name="T2 国际" />
              <Bar dataKey="T3" stackId="flow" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="T3 区域" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="航班准点率趋势">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyPunctualityRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                domain={[60, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#22d3ee"
                fill="#22d3ee"
                fillOpacity={0.08}
                strokeWidth={2}
                name="实际准点率"
                dot={{ r: 4, fill: '#22d3ee' }}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="6 3"
                name="目标准点率"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Panel title="机位状态分布">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {gateByTerminal.map((t) => (
                <div key={t.terminal}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                    <span>{t.terminal}</span>
                    <span>
                      {t.occupied}/{t.occupied + t.available + t.maintenance}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {(['available', 'occupied', 'maintenance'] as const).map((s) => {
                      const total = t.available + t.occupied + t.maintenance;
                      const pct = total > 0 ? ((t[s] / total) * 100).toFixed(0) : '0';
                      return (
                        <div
                          key={s}
                          className="h-2 rounded-sm"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: GATE_COLORS[s],
                            minWidth: 4,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-success" />
                  空闲
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary-light" />
                  占用
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-warning" />
                  维护
                </span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="行李状态统计">
          <div className="space-y-2">
            {baggageStatusData.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: BAGGAGE_STATUS_COLORS[item.status] || '#64748b' }}
                />
                <span className="w-16 text-xs text-slate-400">
                  {BAGGAGE_STATUS_LABELS[item.status] || item.status}
                </span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-dark-border">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: filteredBaggages.length > 0 ? `${(item.count / filteredBaggages.length) * 100}%` : '0%',
                        backgroundColor: BAGGAGE_STATUS_COLORS[item.status] || '#64748b',
                      }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-xs font-medium text-slate-300">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="实时预警">
          <div className="space-y-2">
            {alerts.slice(0, 6).map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-2.5 rounded-lg ${cfg.bg} p-2.5 transition-colors hover:brightness-110`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${cfg.color}`}>
                        {ALERT_TYPE_LABELS[alert.type] || alert.type}
                      </span>
                      <span className="text-[10px] text-slate-500">{formatTime(alert.timestamp)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  iconColor,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string | number;
  suffix: string;
  accent: string;
}) {
  return (
    <div className="group rounded-xl border border-dark-border bg-dark-card p-5 transition-all duration-200 hover:border-slate-500/50 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`${iconColor} rounded-lg bg-slate-800 p-2 transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${iconColor}`}>{value}</span>
        <span className="text-xs text-slate-500">{suffix}</span>
      </div>
      <div className={`mt-3 h-0.5 w-12 rounded-full ${accent} opacity-60`} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-5 transition-all duration-200 hover:border-slate-500/50 hover:shadow-lg hover:shadow-black/20">
      <h3 className="mb-4 text-sm font-medium text-slate-300">{title}</h3>
      {children}
    </div>
  );
}
