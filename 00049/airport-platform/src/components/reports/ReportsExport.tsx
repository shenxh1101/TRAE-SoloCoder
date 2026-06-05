import { useState, useMemo } from 'react';
import {
  Filter,
  RotateCcw,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plane,
  DoorOpen,
  ShieldCheck,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAirport } from '../../context/AirportContext';
import type { Flight } from '../../types';

const AIRLINES = ['CA', 'MU', 'CZ', 'HU', '3U', 'KE', 'SQ', 'NH', 'EK', 'G5', 'OQ'];
const AIRLINE_NAMES: Record<string, string> = {
  CA: '中国国航',
  MU: '中国东航',
  CZ: '南方航空',
  HU: '海南航空',
  '3U': '四川航空',
  KE: '大韩航空',
  SQ: '新加坡航空',
  NH: '全日空',
  EK: '阿联酋航空',
  G5: '华夏航空',
  OQ: '重庆航空',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'scheduled', label: '计划中' },
  { value: 'boarding', label: '登机中' },
  { value: 'delayed', label: '延误' },
  { value: 'cancelled', label: '已取消' },
  { value: 'arrived', label: '已到达' },
  { value: 'departed', label: '已起飞' },
];

const STATUS_LABELS: Record<string, string> = {
  scheduled: '计划中',
  boarding: '登机中',
  delayed: '延误',
  cancelled: '已取消',
  arrived: '已到达',
  departed: '已起飞',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-primary-light',
  boarding: 'text-cyan-glow',
  delayed: 'text-amber-glow',
  cancelled: 'text-danger',
  arrived: 'text-success',
  departed: 'text-slate-300',
};

const PAGE_SIZE = 10;

const formatTime = (ts: string) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
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

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-5 transition-all duration-200 hover:border-slate-500/50 hover:shadow-lg hover:shadow-black/20">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function ReportsExport() {
  const {
    flights,
    gates,
    checkinCounters,
    securityChannels,
    terminals,
    monthlyPunctualityRate,
    hourlyPassengerFlow,
    dispatchLogs,
    filterFlightsByRole,
    filterGatesByRole,
    generateEfficiencyReport,
    generateDispatchLogCSV,
  } = useAirport();

  const [airlineFilter, setAirlineFilter] = useState<string>('all');
  const [terminalFilter, setTerminalFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  const filtered = useMemo(() => {
    const roleFiltered = filterFlightsByRole(flights);
    return roleFiltered.filter((f) => {
      if (airlineFilter !== 'all' && f.airlineCode !== airlineFilter) return false;
      if (terminalFilter !== 'all' && f.terminalId !== terminalFilter) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (dateFilter) {
        const d = f.scheduledDeparture.slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [flights, airlineFilter, terminalFilter, statusFilter, dateFilter, filterFlightsByRole]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setAirlineFilter('all');
    setTerminalFilter('all');
    setDateFilter('');
    setStatusFilter('all');
    setPage(1);
    setSelectedFlight(null);
  };

  const applyFilters = () => {
    setPage(1);
    setSelectedFlight(null);
  };

  const gateStats = useMemo(() => {
    const tFilter = terminalFilter !== 'all' ? terminalFilter : null;
    const roleFilteredGates = filterGatesByRole(gates);
    const relevantGates = tFilter ? roleFilteredGates.filter((g) => g.terminalId === tFilter) : roleFilteredGates;
    const occupied = relevantGates.filter((g) => g.status === 'occupied').length;
    const total = relevantGates.length;
    return {
      total,
      occupied,
      available: relevantGates.filter((g) => g.status === 'available').length,
      maintenance: relevantGates.filter((g) => g.status === 'maintenance').length,
      occupiedHours: occupied * 2.5,
      turnoverCount: occupied * 3,
      utilizationRate: total > 0 ? ((occupied / total) * 100).toFixed(1) : '0.0',
    };
  }, [terminalFilter, gates, filterGatesByRole]);

  const counterStats = useMemo(() => {
    const tFilter = terminalFilter !== 'all' ? terminalFilter : null;
    const relevant = tFilter ? checkinCounters.filter((c) => c.terminalId === tFilter) : checkinCounters;
    const open = relevant.filter((c) => c.status === 'open').length;
    const total = relevant.length;
    const avgLoad =
      open > 0
        ? (
            relevant
              .filter((c) => c.status === 'open')
              .reduce((s, c) => s + c.passengerLoad, 0) / open
          ).toFixed(1)
        : '0.0';
    return {
      total,
      open,
      closed: relevant.filter((c) => c.status === 'closed').length,
      maintenance: relevant.filter((c) => c.status === 'maintenance').length,
      utilizationRate: total > 0 ? ((open / total) * 100).toFixed(1) : '0.0',
      avgLoad,
    };
  }, [terminalFilter, checkinCounters]);

  const securityStats = useMemo(() => {
    const tFilter = terminalFilter !== 'all' ? terminalFilter : null;
    const relevant = tFilter ? securityChannels.filter((s) => s.terminalId === tFilter) : securityChannels;
    const open = relevant.filter((s) => s.status === 'open').length;
    const total = relevant.length;
    const totalFlow = relevant.reduce((s, c) => s + c.currentFlow, 0);
    const totalThroughput = relevant.reduce((s, c) => s + c.throughput, 0);
    return {
      total,
      open,
      closed: relevant.filter((s) => s.status === 'closed').length,
      totalFlow,
      totalThroughput,
      avgThroughput: open > 0 ? (totalThroughput / open).toFixed(0) : '0',
    };
  }, [terminalFilter, securityChannels]);

  const resourceUtilByTerminal = useMemo(() => {
    return terminals.map((t) => {
      const tGates = gates.filter((g) => g.terminalId === t.id);
      const tCounters = checkinCounters.filter((c) => c.terminalId === t.id);
      const tSecurity = securityChannels.filter((s) => s.terminalId === t.id);
      return {
        terminal: t.id,
        机位利用率: tGates.length > 0 ? +((tGates.filter((g) => g.status === 'occupied').length / tGates.length) * 100).toFixed(1) : 0,
        值机柜利用率: tCounters.length > 0 ? +((tCounters.filter((c) => c.status === 'open').length / tCounters.length) * 100).toFixed(1) : 0,
        安检通道利用率: tSecurity.length > 0 ? +((tSecurity.filter((s) => s.status === 'open').length / tSecurity.length) * 100).toFixed(1) : 0,
      };
    });
  }, [terminals, gates, checkinCounters, securityChannels]);

  const exportMonthlyReport = () => {
    const reportContent = generateEfficiencyReport();
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `运营效率分析报告_${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSchedulingLog = () => {
    const csvContent = generateDispatchLogCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `资源调度日志_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <Panel title="筛选条件" icon={<Filter className="h-4 w-4 text-cyan-glow" />}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[140px]">
            <label className="mb-1.5 block text-xs text-slate-400">航空公司</label>
            <select
              value={airlineFilter}
              onChange={(e) => setAirlineFilter(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-glow"
            >
              <option value="all">全部航司</option>
              {AIRLINES.map((code) => (
                <option key={code} value={code}>
                  {code} - {AIRLINE_NAMES[code]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1.5 block text-xs text-slate-400">航站楼</label>
            <select
              value={terminalFilter}
              onChange={(e) => setTerminalFilter(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-glow"
            >
              <option value="all">全部</option>
              {terminals.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1.5 block text-xs text-slate-400">日期</label>
            <input
              type="text"
              placeholder="YYYY-MM-DD"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-glow"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1.5 block text-xs text-slate-400">航班状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-glow"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-glow px-4 py-2 text-sm font-medium text-dark transition-colors hover:bg-cyan-400"
            >
              <Filter className="h-3.5 w-3.5" />
              筛选
            </button>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-dark-border px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </button>
          </div>
        </div>
      </Panel>

      <Panel title={`筛选结果 (${filtered.length} 条)`} icon={<Plane className="h-4 w-4 text-primary-light" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border text-left text-xs text-slate-400">
                <th className="px-3 py-2.5 font-medium">航班号</th>
                <th className="px-3 py-2.5 font-medium">航空公司</th>
                <th className="px-3 py-2.5 font-medium">航线</th>
                <th className="px-3 py-2.5 font-medium">航站楼</th>
                <th className="px-3 py-2.5 font-medium">登机口</th>
                <th className="px-3 py-2.5 font-medium">计划时间</th>
                <th className="px-3 py-2.5 font-medium">状态</th>
                <th className="px-3 py-2.5 font-medium">旅客数</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((f) => {
                const gate = f.gateId ? gates.find((g) => g.id === f.gateId)?.code || '-' : '-';
                const isSelected = selectedFlight?.id === f.id;
                return (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFlight(isSelected ? null : f)}
                    className={`cursor-pointer border-b border-dark-border/50 transition-colors ${
                      isSelected ? 'bg-cyan-glow/10' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium text-cyan-glow">{f.flightNo}</td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {f.airlineCode} {f.airline}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">
                      {f.origin} → {f.destination}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{f.terminalId}</td>
                    <td className="px-3 py-2.5 text-slate-300">{gate}</td>
                    <td className="px-3 py-2.5 text-slate-300">{formatTime(f.scheduledDeparture)}</td>
                    <td className={`px-3 py-2.5 font-medium ${STATUS_COLORS[f.status]}`}>
                      {STATUS_LABELS[f.status]}
                      {f.delayMinutes > 0 && (
                        <span className="ml-1 text-xs text-amber-glow">+{f.delayMinutes}min</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{f.passengerCount}</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    无匹配航班
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>
              第 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-dark-border p-1.5 transition-colors hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-dark-border p-1.5 transition-colors hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {selectedFlight && (
          <div className="mt-4 rounded-lg border border-dark-border bg-dark p-4">
            <h4 className="mb-2 text-xs font-medium text-slate-400">航班详情</h4>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">航班号</span>
                <p className="text-cyan-glow">{selectedFlight.flightNo}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">机型</span>
                <p className="text-slate-300">{selectedFlight.aircraftType}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">计划起飞</span>
                <p className="text-slate-300">{new Date(selectedFlight.scheduledDeparture).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">实际起飞</span>
                <p className="text-slate-300">
                  {selectedFlight.actualDeparture
                    ? new Date(selectedFlight.actualDeparture).toLocaleString('zh-CN')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">计划到达</span>
                <p className="text-slate-300">{new Date(selectedFlight.scheduledArrival).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">实际到达</span>
                <p className="text-slate-300">
                  {selectedFlight.actualArrival
                    ? new Date(selectedFlight.actualArrival).toLocaleString('zh-CN')
                    : '-'}
                </p>
              </div>
              {selectedFlight.delayMinutes > 0 && (
                <>
                  <div>
                    <span className="text-xs text-slate-500">延误时长</span>
                    <p className="text-amber-glow">{selectedFlight.delayMinutes} 分钟</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">延误原因</span>
                    <p className="text-amber-glow">{selectedFlight.delayReason}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <Panel title="机位使用" icon={<DoorOpen className="h-4 w-4 text-primary-light" />}>
          <div className="space-y-3">
            <StatRow label="总机位" value={`${gateStats.total}`} />
            <StatRow label="占用" value={`${gateStats.occupied}`} color="text-primary-light" />
            <StatRow label="空闲" value={`${gateStats.available}`} color="text-success" />
            <StatRow label="维护" value={`${gateStats.maintenance}`} color="text-warning" />
            <StatRow label="占用时长(估)" value={`${gateStats.occupiedHours}h`} color="text-cyan-glow" />
            <StatRow label="周转次数(估)" value={`${gateStats.turnoverCount}`} color="text-cyan-glow" />
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-border">
              <div
                className="h-full rounded-full bg-primary-light transition-all duration-500"
                style={{ width: `${gateStats.utilizationRate}%` }}
              />
            </div>
            <p className="text-right text-xs text-slate-400">利用率 {gateStats.utilizationRate}%</p>
          </div>
        </Panel>

        <Panel title="值机柜台" icon={<BarChart3 className="h-4 w-4 text-amber-glow" />}>
          <div className="space-y-3">
            <StatRow label="总柜台" value={`${counterStats.total}`} />
            <StatRow label="开放" value={`${counterStats.open}`} color="text-success" />
            <StatRow label="关闭" value={`${counterStats.closed}`} color="text-slate-400" />
            <StatRow label="维护" value={`${counterStats.maintenance}`} color="text-warning" />
            <StatRow label="平均负载" value={`${counterStats.avgLoad}%`} color="text-amber-glow" />
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-border">
              <div
                className="h-full rounded-full bg-amber-glow transition-all duration-500"
                style={{ width: `${counterStats.utilizationRate}%` }}
              />
            </div>
            <p className="text-right text-xs text-slate-400">利用率 {counterStats.utilizationRate}%</p>
          </div>
        </Panel>

        <Panel title="安检通道" icon={<ShieldCheck className="h-4 w-4 text-success" />}>
          <div className="space-y-3">
            <StatRow label="总通道" value={`${securityStats.total}`} />
            <StatRow label="开放" value={`${securityStats.open}`} color="text-success" />
            <StatRow label="关闭" value={`${securityStats.closed}`} color="text-slate-400" />
            <StatRow label="当前流量" value={`${securityStats.totalFlow.toLocaleString()}`} color="text-cyan-glow" />
            <StatRow label="总吞吐量" value={`${securityStats.totalThroughput.toLocaleString()}`} color="text-primary-light" />
            <StatRow label="平均吞吐" value={`${securityStats.avgThroughput}`} color="text-amber-glow" />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={exportMonthlyReport}
          className="flex items-center justify-center gap-2 rounded-xl border border-dark-border bg-dark-card p-4 text-sm font-medium text-slate-200 transition-all hover:border-cyan-glow/50 hover:shadow-lg hover:shadow-cyan-glow/5"
        >
          <FileText className="h-4 w-4 text-cyan-glow" />
          导出月度运营效率分析报告
        </button>
        <button
          onClick={exportSchedulingLog}
          className="flex items-center justify-center gap-2 rounded-xl border border-dark-border bg-dark-card p-4 text-sm font-medium text-slate-200 transition-all hover:border-amber-glow/50 hover:shadow-lg hover:shadow-amber-glow/5"
        >
          <Download className="h-4 w-4 text-amber-glow" />
          导出资源调度日志
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="月度准点率趋势">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyPunctualityRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[60, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="rate" stroke="#22d3ee" strokeWidth={2} name="实际准点率" dot={{ r: 4, fill: '#22d3ee' }} />
              <Line type="monotone" dataKey="target" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" name="目标准点率" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="各航站楼资源利用率对比">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={resourceUtilByTerminal} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="terminal" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} iconType="circle" iconSize={8} />
              <Bar dataKey="机位利用率" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="值机柜利用率" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="安检通道利用率" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="旅客流量趋势">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={hourlyPassengerFlow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="hour"
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(v: number) => `${String(v).padStart(2, '0')}:00`}
              interval={2}
            />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="T1" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={2} name="T1" />
            <Area type="monotone" dataKey="T2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="T2" />
            <Area type="monotone" dataKey="T3" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} name="T3" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="调度日志记录" icon={<Clock className="h-4 w-4 text-primary-light" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border text-left text-xs text-slate-400">
                <th className="px-3 py-2.5 font-medium">时间</th>
                <th className="px-3 py-2.5 font-medium">类型</th>
                <th className="px-3 py-2.5 font-medium">内容</th>
                <th className="px-3 py-2.5 font-medium">操作员</th>
              </tr>
            </thead>
            <tbody>
              {dispatchLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-dark-border/50">
                  <td className="px-3 py-2.5 text-slate-300">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-cyan-glow/10 px-2 py-0.5 text-xs text-cyan-glow">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{log.message}</td>
                  <td className="px-3 py-2.5 text-slate-400">{log.operator}</td>
                </tr>
              ))}
              {dispatchLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    暂无调度日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${color || 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
