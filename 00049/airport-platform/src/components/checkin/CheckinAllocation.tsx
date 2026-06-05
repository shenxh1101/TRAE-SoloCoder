import { useState, useMemo, useCallback } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Wrench,
  Users,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  Plus,
  Minus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAirport } from '../../context/AirportContext';

type TerminalId = 'T1' | 'T2' | 'T3';

interface AllocationResult {
  flightId: string;
  flightNo: string;
  airline: string;
  passengerCount: number;
  suggestedCounters: number;
  adjustedCounters: number;
  assignedCounters: string[];
}

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, '0')}:00`;
});

function getLoadColor(load: number): string {
  if (load < 50) return 'bg-success';
  if (load <= 80) return 'bg-amber-glow';
  return 'bg-danger';
}

function getLoadTextColor(load: number): string {
  if (load < 50) return 'text-success';
  if (load <= 80) return 'text-amber-glow';
  return 'text-danger';
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'open':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case 'closed':
      return <XCircle className="h-3.5 w-3.5 text-slate-500" />;
    case 'maintenance':
      return <Wrench className="h-3.5 w-3.5 text-warning" />;
    default:
      return null;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return '开放';
    case 'closed':
      return '关闭';
    case 'maintenance':
      return '维护';
    default:
      return status;
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border border-dark-border bg-dark-card px-3 py-2 text-xs shadow-lg">
      <p className="text-primary-light">{data.name}</p>
      <p className="text-slate-300">
        开放柜台: <span className="text-cyan-glow">{data.count}</span>
      </p>
    </div>
  );
}

export default function CheckinAllocation() {
  const {
    terminals,
    checkinCounters,
    flights,
    allocateCheckinCounters,
    calculateNeededCounters,
    getPeakHours,
    openCounter,
    closeCounter,
    filterFlightsByRole,
  } = useAirport();

  const [activeTerminal, setActiveTerminal] = useState<TerminalId>('T1');
  const [allocationResults, setAllocationResults] = useState<AllocationResult[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [adjustedCounts, setAdjustedCounts] = useState<Record<string, number>>({});

  const isCurrentPeakHour = useCallback(() => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 9) || (hour >= 11 && hour < 14) || (hour >= 17 && hour < 20);
  }, []);

  const peakHours = getPeakHours();
  const isPeakNow = isCurrentPeakHour();

  const filteredCounters = useMemo(
    () => checkinCounters.filter((c) => c.terminalId === activeTerminal),
    [checkinCounters, activeTerminal],
  );

  const filteredFlights = useMemo(() => {
    return filterFlightsByRole(flights);
  }, [flights, filterFlightsByRole]);

  const upcomingFlights = useMemo(() => {
    return filteredFlights
      .filter((f) => f.terminalId === activeTerminal && f.status === 'scheduled')
      .sort(
        (a, b) =>
          new Date(a.scheduledDeparture).getTime() -
          new Date(b.scheduledDeparture).getTime(),
      );
  }, [filteredFlights, activeTerminal]);

  const stats = useMemo(() => {
    const openCounters = filteredCounters.filter((c) => c.status === 'open');
    const totalOpen = openCounters.length;
    const avgLoad =
      openCounters.length > 0
        ? Math.round(
            openCounters.reduce((sum, c) => sum + c.passengerLoad, 0) /
              openCounters.length,
          )
        : 0;

    const slotCounts: Record<string, number> = {};
    TIME_SLOTS.forEach((slot) => {
      slotCounts[slot] = 0;
    });
    openCounters.forEach((counter) => {
      if (!counter.timeSlot) return;
      const startHour = parseInt(counter.timeSlot.split(':')[0], 10);
      const endPart = counter.timeSlot.split('-')[1];
      const endHour = parseInt(endPart.split(':')[0], 10);
      for (let h = startHour; h < endHour; h++) {
        const key = `${String(h).padStart(2, '0')}:00`;
        if (key in slotCounts) {
          slotCounts[key] += 1;
        }
      }
    });

    let peakHour = '06:00';
    let peakCount = 0;
    Object.entries(slotCounts).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hour;
      }
    });

    const chartData = TIME_SLOTS.map((slot) => ({
      name: slot,
      count: slotCounts[slot],
    }));

    return { totalOpen, avgLoad, peakHour, peakCount, chartData };
  }, [filteredCounters]);

  const handleAutoAllocate = () => {
    setIsAllocating(true);
    setTimeout(() => {
      const results: AllocationResult[] = [];

      upcomingFlights.forEach((flight) => {
        const suggestedCounters = calculateNeededCounters(flight.passengerCount, isPeakNow);
        const adjustedCounters = adjustedCounts[flight.id] ?? suggestedCounters;
        const assignedIds = allocateCheckinCounters(flight.id, adjustedCounters);
        const assignedCounterNos = assignedIds
          .map((id) => checkinCounters.find((c) => c.id === id)?.counterNo)
          .filter(Boolean) as string[];

        results.push({
          flightId: flight.id,
          flightNo: flight.flightNo,
          airline: flight.airline,
          passengerCount: flight.passengerCount,
          suggestedCounters,
          adjustedCounters,
          assignedCounters: assignedCounterNos,
        });
      });

      setAllocationResults(results);
      setIsAllocating(false);
    }, 800);
  };

  const handleAdjustCounter = (flightId: string, delta: number, suggested: number) => {
    setAdjustedCounts((prev) => {
      const current = prev[flightId] ?? suggested;
      const newVal = Math.max(1, current + delta);
      return { ...prev, [flightId]: newVal };
    });
  };

  const handleToggleCounter = (counterId: string, currentStatus: string) => {
    if (currentStatus === 'open') {
      closeCounter(counterId);
    } else if (currentStatus === 'closed') {
      openCounter(counterId);
    }
  };

  const getSlotAssignments = (slot: string) => {
    const slotHour = parseInt(slot.split(':')[0], 10);
    return filteredCounters.filter((counter) => {
      if (!counter.timeSlot || !counter.airline) return false;
      const startHour = parseInt(counter.timeSlot.split(':')[0], 10);
      const endPart = counter.timeSlot.split('-')[1];
      const endHour = parseInt(endPart.split(':')[0], 10);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  const terminalInfo = terminals.find((t) => t.id === activeTerminal);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-cyan-glow" />
          <h2 className="text-xl font-bold text-primary-light">值机柜台分配</h2>
        </div>
        <div className="flex items-center gap-3">
          {isPeakNow && (
            <div className="flex items-center gap-1.5 rounded-full bg-danger/20 px-3 py-1 text-xs font-medium text-danger">
              <Zap className="h-3.5 w-3.5" />
              高峰时段
            </div>
          )}
          <div className="text-sm text-slate-400">
            {terminalInfo?.name} · 共 {terminalInfo?.checkinCount} 个柜台
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span>高峰时段: {peakHours.join(', ')}</span>
      </div>

      <div className="flex gap-2">
        {(['T1', 'T2', 'T3'] as TerminalId[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setActiveTerminal(t);
              setAllocationResults([]);
              setAdjustedCounts({});
            }}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              activeTerminal === t
                ? 'bg-cyan-glow/20 text-cyan-glow ring-1 ring-cyan-glow/40'
                : 'bg-dark-card text-slate-400 hover:bg-dark-hover hover:text-primary-light'
            }`}
          >
            {terminals.find((term) => term.id === t)?.name ?? t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-success" />
            开放柜台
          </div>
          <p className="mt-2 text-2xl font-bold text-success">{stats.totalOpen}</p>
          <p className="mt-1 text-xs text-slate-500">
            共 {filteredCounters.length} 个柜台
          </p>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4 text-amber-glow" />
            平均旅客负载
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-glow">{stats.avgLoad}%</p>
          <p className="mt-1 text-xs text-slate-500">基于开放柜台计算</p>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <TrendingUp className="h-4 w-4 text-danger" />
            高峰时段
          </div>
          <p className="mt-2 text-2xl font-bold text-danger">{stats.peakHour}</p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.peakCount} 个柜台同时开放
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dark-border bg-dark-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-cyan-glow" />
          <h3 className="text-base font-semibold text-primary-light">柜台状态总览</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredCounters.map((counter) => (
            <div
              key={counter.id}
              className={`rounded-lg border p-3 transition-colors ${
                counter.status === 'open'
                  ? 'border-dark-border bg-dark/60'
                  : counter.status === 'maintenance'
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-dark-border bg-dark/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary-light">
                  {counter.counterNo}
                </span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(counter.status)}
                  <span className="text-[10px] text-slate-500">
                    {getStatusLabel(counter.status)}
                  </span>
                </div>
              </div>
              {counter.airline && (
                <p className="mt-1 truncate text-xs text-cyan-glow">{counter.airline}</p>
              )}
              {counter.status === 'open' && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">负载</span>
                    <span className={`text-[10px] font-medium ${getLoadTextColor(counter.passengerLoad)}`}>
                      {counter.passengerLoad}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-dark-border">
                    <div
                      className={`h-full rounded-full transition-all ${getLoadColor(counter.passengerLoad)}`}
                      style={{ width: `${counter.passengerLoad}%` }}
                    />
                  </div>
                </div>
              )}
              {counter.timeSlot && counter.status === 'open' && (
                <p className="mt-1.5 text-[10px] text-slate-500">
                  <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                  {counter.timeSlot}
                </p>
              )}
              {counter.status !== 'maintenance' && (
                <button
                  type="button"
                  onClick={() => handleToggleCounter(counter.id, counter.status)}
                  className="mt-2 w-full rounded-md bg-dark-border/50 px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-dark-border hover:text-primary-light"
                >
                  {counter.status === 'open' ? '关闭' : '开启'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-dark-border bg-dark-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-glow" />
              <h3 className="text-base font-semibold text-primary-light">动态分配</h3>
            </div>
            <button
              type="button"
              onClick={handleAutoAllocate}
              disabled={isAllocating || upcomingFlights.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-glow/20 px-4 py-2 text-sm font-medium text-cyan-glow transition-colors hover:bg-cyan-glow/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAllocating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-glow border-t-transparent" />
                  分配中...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  自动分配
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {upcomingFlights.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                当前航站楼暂无待分配航班
              </p>
            )}
            {upcomingFlights.map((flight) => {
              const suggested = calculateNeededCounters(flight.passengerCount, isPeakNow);
              const adjusted = adjustedCounts[flight.id] ?? suggested;
              const result = allocationResults.find((r) => r.flightId === flight.id);
              const depTime = new Date(flight.scheduledDeparture).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={flight.id}
                  className="rounded-lg border border-dark-border bg-dark/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-cyan-glow">
                        {flight.flightNo}
                      </span>
                      <span className="text-xs text-slate-400">{flight.airline}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      计划 {depTime} 起飞
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-slate-400">
                      旅客:{' '}
                      <span className="font-medium text-primary-light">
                        {flight.passengerCount}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      建议柜台:{' '}
                      <span className="font-medium text-amber-glow">{suggested}</span>
                      {isPeakNow && (
                        <span className="ml-1 text-[10px] text-danger">(高峰x1.5)</span>
                      )}
                    </span>
                  </div>
                  {!result && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">调整:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustCounter(flight.id, -1, suggested)}
                        className="flex h-5 w-5 items-center justify-center rounded-md bg-dark-border text-slate-400 transition-colors hover:bg-dark-hover hover:text-primary-light"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-cyan-glow">
                        {adjusted}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdjustCounter(flight.id, 1, suggested)}
                        className="flex h-5 w-5 items-center justify-center rounded-md bg-dark-border text-slate-400 transition-colors hover:bg-dark-hover hover:text-primary-light"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="text-[10px] text-slate-500">个柜台</span>
                    </div>
                  )}
                  {result && (
                    <div className="mt-2 flex items-center gap-2 rounded-md bg-success/10 px-2 py-1.5 text-xs">
                      <ArrowRight className="h-3 w-3 text-success" />
                      <span className="text-slate-300">已分配:</span>
                      <span className="font-medium text-success">
                        {result.assignedCounters.join(', ') || '无可用柜台'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-glow" />
            <h3 className="text-base font-semibold text-primary-light">时间段分布</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {stats.chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.count >= 6
                          ? '#ef4444'
                          : entry.count >= 4
                            ? '#fbbf24'
                            : '#22d3ee'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-border text-left text-slate-500">
                  <th className="pb-2 pr-2 font-medium">时间</th>
                  <th className="pb-2 pr-2 font-medium">柜台</th>
                  <th className="pb-2 font-medium">航司</th>
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.filter((slot) => getSlotAssignments(slot).length > 0).map(
                  (slot) => {
                    const assignments = getSlotAssignments(slot);
                    return assignments.map((a, i) => (
                      <tr
                        key={`${slot}-${a.id}`}
                        className="border-b border-dark-border/50"
                      >
                        {i === 0 ? (
                          <td
                            rowSpan={assignments.length}
                            className="py-1.5 pr-2 align-top font-medium text-cyan-glow"
                          >
                            {slot}
                          </td>
                        ) : null}
                        <td className="py-1.5 pr-2 font-mono text-primary-light">
                          {a.counterNo}
                        </td>
                        <td className="py-1.5 text-slate-400">{a.airline}</td>
                      </tr>
                    ));
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
