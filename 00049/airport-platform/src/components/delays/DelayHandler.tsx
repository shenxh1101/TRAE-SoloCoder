import { useState, useMemo } from 'react';
import {
  Plane,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CloudLightning,
  Wrench,
  Users,
  HelpCircle,
  Gauge,
  Ticket,
  ArrowRightLeft,
  BarChart3,
  Send,
  CheckCircle2,
  XCircle,
  Timer,
  Coffee,
  Hotel,
  Bus,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import type { Flight, CompensationVoucher } from '../../types';

type CauseCategory = '天气' | '机械' | '流量控制' | '机组' | '其他';

interface CauseAnalysis {
  category: CauseCategory;
  confidence: number;
  cause: string;
  affectedFlights: Flight[];
}

const CAUSE_ICONS: Record<CauseCategory, typeof CloudLightning> = {
  天气: CloudLightning,
  机械: Wrench,
  流量控制: Gauge,
  机组: Users,
  其他: HelpCircle,
};

const CAUSE_COLORS: Record<CauseCategory, string> = {
  天气: 'text-primary-light',
  机械: 'text-warning',
  流量控制: 'text-amber-glow',
  机组: 'text-cyan-glow',
  其他: 'text-primary-light/60',
};

const VOUCHER_ICONS: Record<CompensationVoucher['type'], typeof Coffee> = {
  meal: Coffee,
  hotel: Hotel,
  transport: Bus,
};

const VOUCHER_LABELS: Record<CompensationVoucher['type'], string> = {
  meal: '餐券',
  hotel: '住宿券',
  transport: '交通券',
};

const VOUCHER_STATUS_CONFIG: Record<CompensationVoucher['status'], { color: string; label: string }> = {
  issued: { color: 'text-cyan-glow', label: '已发放' },
  used: { color: 'text-success', label: '已使用' },
  expired: { color: 'text-primary-light/40', label: '已过期' },
};

function getDelaySeverityColor(minutes: number) {
  if (minutes > 120) return 'text-danger';
  if (minutes > 60) return 'text-warning';
  return 'text-amber-glow';
}

function getDelaySeverityBg(minutes: number) {
  if (minutes > 120) return 'bg-danger/10 border-danger/30';
  if (minutes > 60) return 'bg-warning/10 border-warning/30';
  return 'bg-amber-glow/10 border-amber-glow/30';
}

function getDelaySeverityLabel(minutes: number) {
  if (minutes > 120) return '严重';
  if (minutes > 60) return '中度';
  return '轻度';
}

export default function DelayHandler() {
  const {
    flights,
    gates,
    checkinCounters,
    securityChannels,
    compensationVouchers,
    analyzeDelayCause,
    generateCompensation,
    reallocateResourcesForDelay,
    filterFlightsByRole,
  } = useAirport();

  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [reallocated, setReallocated] = useState(false);
  const [reallocationResult, setReallocationResult] = useState<{ gates: string[]; counters: string[] } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const delayedFlights = useMemo(
    () => filterFlightsByRole(
      flights.filter((f) => f.status === 'delayed' || f.status === 'cancelled' || (f.delayMinutes > 0 && f.status === 'arrived'))
    ),
    [flights, filterFlightsByRole],
  );

  const selectedFlight = useMemo(
    () => delayedFlights.find((f) => f.id === selectedFlightId) ?? null,
    [delayedFlights, selectedFlightId],
  );

  const causeAnalysis = useMemo(() => {
    if (!selectedFlight) return null;
    const result = analyzeDelayCause(selectedFlight);
    const categoryMap: Record<string, CauseCategory> = {
      weather: '天气',
      mechanical: '机械',
      atc: '流量控制',
      crew: '机组',
      other: '其他',
    };

    const affectedFlights = flights.filter(
      (f) => f.id !== selectedFlight.id &&
        f.terminalId === selectedFlight.terminalId &&
        f.scheduledDeparture > selectedFlight.scheduledDeparture &&
        (f.status === 'delayed' || f.status === 'cancelled' || f.status === 'scheduled'),
    );

    return {
      category: categoryMap[result.category] || '其他',
      confidence: Math.round(result.confidence * 100),
      cause: result.cause,
      affectedFlights,
    };
  }, [selectedFlight, analyzeDelayCause, flights]);

  const flightVouchers = useMemo(
    () => (selectedFlightId ? compensationVouchers.filter((v) => v.flightId === selectedFlightId) : []),
    [compensationVouchers, selectedFlightId],
  );

  const compensationPlan = useMemo(() => {
    if (!selectedFlight) return [];
    if (selectedFlight.delayMinutes > 120) {
      return [
        { type: 'hotel' as const, value: 300, label: '住宿券 ¥300' },
        { type: 'meal' as const, value: 100, label: '餐券 ¥100' },
        { type: 'transport' as const, value: 50, label: '交通券 ¥50' },
      ];
    }
    if (selectedFlight.delayMinutes > 60) {
      return [{ type: 'meal' as const, value: 100, label: '餐券 ¥100' }];
    }
    if (selectedFlight.delayMinutes > 30) {
      return [{ type: 'meal' as const, value: 50, label: '餐券 ¥50' }];
    }
    return [];
  }, [selectedFlight]);

  const resourceReallocation = useMemo(() => {
    if (!selectedFlight) return { gates: [], counters: [], channels: [] };
    const tid = selectedFlight.terminalId;
    const availableGates = gates.filter((g) => g.terminalId === tid && g.status === 'available');
    const flightCounters = checkinCounters.filter((c) => c.terminalId === tid && c.flightId === selectedFlight.id);
    const openChannels = securityChannels.filter((c) => c.terminalId === tid && c.status === 'open');
    const highLoadChannels = openChannels.filter((c) => c.currentFlow / c.throughput > 0.85);
    const suggestedGates = availableGates.filter((g) => g.aircraftType.includes(selectedFlight.aircraftType)).slice(0, 3);

    const resultGates = reallocationResult?.gates
      ? gates.filter((g) => reallocationResult.gates.includes(g.id))
      : suggestedGates;
    const resultCounters = reallocationResult?.counters
      ? checkinCounters.filter((c) => reallocationResult.counters.includes(c.id))
      : flightCounters;

    return { gates: resultGates, counters: resultCounters, channels: highLoadChannels };
  }, [selectedFlight, gates, checkinCounters, securityChannels, reallocationResult]);

  const stats = useMemo(() => {
    const total = delayedFlights.length;
    const avgDelay = total > 0 ? Math.round(delayedFlights.reduce((s, f) => s + f.delayMinutes, 0) / total) : 0;
    const causeMap: Record<string, number> = {};
    const categoryMap: Record<string, CauseCategory> = {
      weather: '天气',
      mechanical: '机械',
      atc: '流量控制',
      crew: '机组',
      other: '其他',
    };
    delayedFlights.forEach((f) => {
      const result = analyzeDelayCause(f);
      const cat = categoryMap[result.category] || '其他';
      causeMap[cat] = (causeMap[cat] || 0) + 1;
    });
    const mostCommonCause = Object.entries(causeMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
    const affectedPassengers = delayedFlights.reduce((s, f) => s + f.passengerCount, 0);
    return { total, avgDelay, mostCommonCause, affectedPassengers };
  }, [delayedFlights, analyzeDelayCause]);

  const handleIssueVoucher = () => {
    if (!selectedFlight) return;
    const newVouchers = generateCompensation(selectedFlight.id);
    setSuccessMessage(`成功发放 ${newVouchers.length} 张补偿券`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleReallocate = () => {
    if (!selectedFlight) return;
    const result = reallocateResourcesForDelay(selectedFlight.id);
    setReallocationResult(result);
    setReallocated(true);
    setTimeout(() => setReallocated(false), 2000);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cyan-glow">航班延误处置</h2>
        <div className="flex items-center gap-2 text-xs text-primary-light/50">
          <AlertTriangle className="h-4 w-4 text-danger" />
          当前延误航班 <span className="font-bold text-danger">{stats.total}</span> 架次
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '延误航班', value: stats.total, unit: '架次', icon: Plane, color: 'text-danger' },
          { label: '平均延误', value: stats.avgDelay, unit: '分钟', icon: Clock, color: 'text-warning' },
          { label: '主要原因', value: stats.mostCommonCause, unit: '', icon: BarChart3, color: 'text-amber-glow' },
          { label: '影响旅客', value: stats.affectedPassengers, unit: '人', icon: Users, color: 'text-cyan-glow' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-dark-border bg-dark-card p-4">
            <div className="flex items-center gap-2 text-xs text-primary-light/50">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              {stat.label}
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              {stat.unit && <span className="text-xs text-primary-light/40">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
        <h3 className="mb-3 text-sm font-bold text-cyan-glow">延误航班列表</h3>
        <div className="space-y-2">
          {delayedFlights.map((flight) => {
            const isExpanded = selectedFlightId === flight.id;
            const severityColor = getDelaySeverityColor(flight.delayMinutes);
            return (
              <div key={flight.id} className="animate-fade-in">
                <button
                  type="button"
                  onClick={() => setSelectedFlightId(isExpanded ? null : flight.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isExpanded
                      ? 'border-primary-light/50 bg-primary-light/5'
                      : 'border-dark-border bg-dark hover:bg-dark-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Plane className={`h-4 w-4 ${severityColor}`} />
                      <span className="font-bold text-primary-light">{flight.flightNo}</span>
                      <span className="text-xs text-primary-light/50">{flight.airline}</span>
                      <span className="text-xs text-primary-light/40">
                        {flight.origin} → {flight.destination}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${getDelaySeverityBg(flight.delayMinutes)}`}>
                        {getDelaySeverityLabel(flight.delayMinutes)}
                      </span>
                      <span className={`text-sm font-bold ${severityColor}`}>{flight.delayMinutes}分钟</span>
                      <span className="text-xs text-primary-light/40">{flight.delayReason ?? '-'}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-primary-light/40" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary-light/40" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="animate-fade-in mt-3 space-y-4 pl-2">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-glow">
                          <ShieldCheck className="h-4 w-4" />
                          自动原因分析
                        </h4>
                        {causeAnalysis && (() => {
                          const CauseIcon = CAUSE_ICONS[causeAnalysis.category];
                          const causeColor = CAUSE_COLORS[causeAnalysis.category];
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <CauseIcon className={`h-5 w-5 ${causeColor}`} />
                                <span className={`text-sm font-bold ${causeColor}`}>
                                  {causeAnalysis.category}
                                </span>
                              </div>
                              <div>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="text-primary-light/50">置信度</span>
                                  <span className={`font-bold ${causeColor}`}>{causeAnalysis.confidence}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-dark-border">
                                  <div
                                    className="h-full rounded-full bg-cyan-glow transition-all"
                                    style={{ width: `${causeAnalysis.confidence}%` }}
                                  />
                                </div>
                              </div>
                              {causeAnalysis.affectedFlights.length > 0 && (
                                <div>
                                  <div className="mb-1 text-xs text-primary-light/50">受影响下游航班</div>
                                  <div className="space-y-1">
                                    {causeAnalysis.affectedFlights.map((af) => (
                                      <div key={af.id} className="flex items-center gap-2 text-xs">
                                        <Plane className="h-3 w-3 text-warning" />
                                        <span className="text-primary-light">{af.flightNo}</span>
                                        <span className="text-primary-light/40">{af.airline}</span>
                                        <span className="text-warning">{af.delayMinutes}分钟</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-glow">
                          <Ticket className="h-4 w-4" />
                          电商餐券补偿方案
                        </h4>
                        <div className="space-y-3">
                          {compensationPlan.length > 0 ? (
                            <>
                              <div className="space-y-1.5">
                                {compensationPlan.map((plan) => {
                                  const PlanIcon = VOUCHER_ICONS[plan.type];
                                  return (
                                    <div key={plan.type} className="flex items-center gap-2 rounded-lg bg-dark p-2 text-sm">
                                      <PlanIcon className="h-4 w-4 text-amber-glow" />
                                      <span className="text-primary-light">{plan.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={handleIssueVoucher}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-light py-2 text-sm font-medium text-white transition-colors hover:bg-primary-light/80"
                              >
                                <Send className="h-4 w-4" />
                                发放补偿
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-primary-light/40">延误时间不足30分钟，无需发放补偿</div>
                          )}

                          {flightVouchers.length > 0 && (
                            <div>
                              <div className="mb-2 text-xs text-primary-light/50">已发放补偿券</div>
                              <div className="space-y-1">
                                {flightVouchers.map((v) => {
                                  const VIcon = VOUCHER_ICONS[v.type];
                                  const statusCfg = VOUCHER_STATUS_CONFIG[v.status];
                                  return (
                                    <div key={v.id} className="flex items-center justify-between rounded-lg bg-dark p-2 text-xs">
                                      <div className="flex items-center gap-2">
                                        <VIcon className="h-3.5 w-3.5 text-amber-glow" />
                                        <span className="text-primary-light">{VOUCHER_LABELS[v.type]} ¥{v.value}</span>
                                      </div>
                                      <span className={statusCfg.color}>{statusCfg.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-glow">
                          <ArrowRightLeft className="h-4 w-4" />
                          后续资源重新分配
                        </h4>
                        <div className="space-y-3">
                          {resourceReallocation.gates.length > 0 && (
                            <div>
                              <div className="mb-1 flex items-center gap-1 text-xs text-primary-light/50">
                                <Plane className="h-3 w-3" />
                                建议机位
                              </div>
                              {resourceReallocation.gates.map((g, idx) => (
                                <div key={g.id} className="flex items-center justify-between rounded-lg bg-dark p-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    {idx === 0 && (
                                      <span className="rounded bg-success/20 px-1 py-0.5 text-[10px] font-bold text-success">
                                        推荐
                                      </span>
                                    )}
                                    <span className="text-primary-light">{g.code}</span>
                                    <span className="text-primary-light/40">{g.currentPosition}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-cyan-glow">
                                    <Timer className="h-3 w-3" />
                                    {g.taxiTime}分钟
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {resourceReallocation.counters.length > 0 && (
                            <div>
                              <div className="mb-1 flex items-center gap-1 text-xs text-primary-light/50">
                                <CheckCircle2 className="h-3 w-3" />
                                值机柜台
                              </div>
                              {resourceReallocation.counters.map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-lg bg-dark p-2 text-xs">
                                  <span className="text-primary-light">{c.counterNo}</span>
                                  <span className="text-primary-light/40">负载 {c.passengerLoad}%</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {resourceReallocation.channels.length > 0 && (
                            <div>
                              <div className="mb-1 flex items-center gap-1 text-xs text-primary-light/50">
                                <ShieldCheck className="h-3 w-3" />
                                高负载安检通道
                              </div>
                              {resourceReallocation.channels.map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-lg bg-dark p-2 text-xs">
                                  <span className="text-primary-light">通道 {c.channelNo}</span>
                                  <span className="text-warning">{Math.round((c.currentFlow / c.throughput) * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleReallocate}
                            disabled={reallocated}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-warning py-2 text-sm font-medium text-white transition-colors hover:bg-warning/80 disabled:opacity-40"
                          >
                            {reallocated ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                已执行
                              </>
                            ) : (
                              <>
                                <ArrowRightLeft className="h-4 w-4" />
                                执行重新分配
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {delayedFlights.length === 0 && (
            <div className="py-8 text-center text-sm text-primary-light/40">
              当前没有延误航班
            </div>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {successMessage}
        </div>
      )}

      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
        <h3 className="mb-3 text-sm font-bold text-cyan-glow">全部补偿券记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border text-left text-xs text-primary-light/50">
                <th className="pb-2 pr-4">券编号</th>
                <th className="pb-2 pr-4">航班</th>
                <th className="pb-2 pr-4">类型</th>
                <th className="pb-2 pr-4">面值</th>
                <th className="pb-2">状态</th>
              </tr>
            </thead>
            <tbody>
              {compensationVouchers.map((v) => {
                const flight = flights.find((f) => f.id === v.flightId);
                const statusCfg = VOUCHER_STATUS_CONFIG[v.status];
                return (
                  <tr key={v.id} className="border-b border-dark-border/50">
                    <td className="py-2.5 pr-4 font-medium text-primary-light">{v.id}</td>
                    <td className="py-2.5 pr-4 text-cyan-glow">{flight?.flightNo ?? v.flightId}</td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1 text-primary-light/70">
                        {(() => { const Icon = VOUCHER_ICONS[v.type]; return <Icon className="h-3.5 w-3.5 text-amber-glow" />; })()}
                        {VOUCHER_LABELS[v.type]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-amber-glow">¥{v.value}</td>
                    <td className="py-2.5">
                      <span className={`flex items-center gap-1 ${statusCfg.color}`}>
                        {v.status === 'used' ? <CheckCircle2 className="h-3.5 w-3.5" /> : v.status === 'expired' ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
