import { useState, useMemo } from 'react';
import {
  Plane,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  Timer,
  Plus,
  X,
  ArrowRightLeft,
  Star,
  MapPin,
  Award,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import type { Gate } from '../../types';

type TerminalId = 'T1' | 'T2' | 'T3';

const TERMINAL_LABELS: Record<TerminalId, string> = {
  T1: 'T1 国内',
  T2: 'T2 国际',
  T3: 'T3 区域',
};

const AIRCRAFT_TYPES = ['B737', 'A320', 'B777', 'A350', 'B787', 'A380'] as const;

const STATUS_CONFIG = {
  available: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', label: '空闲', icon: CheckCircle2 },
  occupied: { color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', label: '占用', icon: XCircle },
  maintenance: { color: 'text-amber-glow', bg: 'bg-amber-glow/10', border: 'border-amber-glow/30', label: '维护', icon: Wrench },
} as const;

interface PlanForm {
  flightNo: string;
  aircraftType: string;
  airline: string;
}

type RecommendedGate = Gate & { score: number; reason: string };

export default function GateManagement() {
  const {
    gates,
    flights,
    terminals,
    recommendGates,
    assignGateToFlight,
    calculateTaxiTime,
    filterFlightsByRole,
    filterGatesByRole,
  } = useAirport();

  const [activeTerminal, setActiveTerminal] = useState<TerminalId>('T1');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<PlanForm>({ flightNo: '', aircraftType: '', airline: '' });
  const [planResult, setPlanResult] = useState<RecommendedGate[] | null>(null);
  const [reassignGateId, setReassignGateId] = useState<string | null>(null);

  const filteredGates = useMemo(() => filterGatesByRole(gates), [gates, filterGatesByRole]);
  const filteredFlights = useMemo(() => filterFlightsByRole(flights), [flights, filterFlightsByRole]);

  const terminalGates = useMemo(
    () => filteredGates.filter((g) => g.terminalId === activeTerminal),
    [filteredGates, activeTerminal],
  );

  const terminalFlights = useMemo(
    () => filteredFlights.filter((f) => f.terminalId === activeTerminal && f.gateId),
    [filteredFlights, activeTerminal],
  );

  const statusCounts = useMemo(() => {
    const counts = { available: 0, occupied: 0, maintenance: 0 };
    terminalGates.forEach((g) => { counts[g.status]++; });
    return counts;
  }, [terminalGates]);

  const getFlightForGate = (gateId: string) =>
    terminalFlights.find((f) => f.gateId === gateId);

  const getRemainingTime = (flightId: string) => {
    const flight = filteredFlights.find((f) => f.id === flightId);
    if (!flight) return null;
    const target = flight.status === 'arrived'
      ? flight.scheduledDeparture
      : flight.scheduledDeparture;
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return '即将离港';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟`;
    return `${Math.floor(mins / 60)}时${mins % 60}分`;
  };

  const handlePlanSubmit = () => {
    if (!planForm.aircraftType) return;
    const recommended = recommendGates(planForm.aircraftType, activeTerminal);
    setPlanResult(recommended);
  };

  const handleAssign = (flightId: string, gateId: string) => {
    assignGateToFlight(flightId, gateId);
    setShowPlanModal(false);
    setPlanResult(null);
  };

  const handleReassign = (flightId: string, newGateId: string) => {
    assignGateToFlight(flightId, newGateId);
    setReassignGateId(null);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-cyan-glow">停机位管理</h2>
        <button
          type="button"
          onClick={() => { setShowPlanModal(true); setPlanResult(null); }}
          className="flex items-center gap-2 rounded-lg bg-primary-light px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-light/80"
        >
          <Plus className="h-4 w-4" />
          创建航班计划
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-primary-light/60">空闲</span>
          <span className="font-bold text-success">{statusCounts.available}</span>
        </div>
        <div className="h-4 w-px bg-dark-border" />
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4 text-danger" />
          <span className="text-primary-light/60">占用</span>
          <span className="font-bold text-danger">{statusCounts.occupied}</span>
        </div>
        <div className="h-4 w-px bg-dark-border" />
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4 text-amber-glow" />
          <span className="text-primary-light/60">维护</span>
          <span className="font-bold text-amber-glow">{statusCounts.maintenance}</span>
        </div>
        <div className="h-4 w-px bg-dark-border" />
        <div className="flex items-center gap-2 text-sm">
          <Plane className="h-4 w-4 text-primary-light" />
          <span className="text-primary-light/60">总计</span>
          <span className="font-bold text-primary-light">{terminalGates.length}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {(Object.keys(TERMINAL_LABELS) as TerminalId[]).map((tid) => {
          const t = terminals.find((term) => term.id === tid);
          return (
            <button
              key={tid}
              type="button"
              onClick={() => setActiveTerminal(tid)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTerminal === tid
                  ? 'bg-primary-light text-white'
                  : 'bg-dark-card text-primary-light/60 hover:bg-dark-hover hover:text-primary-light'
              }`}
            >
              {TERMINAL_LABELS[tid]}
              {t && <span className="ml-1 text-xs opacity-70">({t.gateCount}机位)</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {terminalGates.map((gate) => {
          const cfg = STATUS_CONFIG[gate.status];
          const flight = getFlightForGate(gate.id);
          const StatusIcon = cfg.icon;
          return (
            <div
              key={gate.id}
              className={`animate-fade-in rounded-xl border bg-dark-card p-3 transition-colors ${cfg.border} hover:bg-dark-hover`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary-light">{gate.code}</span>
                <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  gate.status === 'available' ? 'bg-success' : gate.status === 'occupied' ? 'bg-danger' : 'bg-amber-glow'
                }`} />
                <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-primary-light/50">
                <MapPin className="h-3 w-3" />
                {gate.currentPosition}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-primary-light/50">
                <Timer className="h-3 w-3" />
                滑行 {calculateTaxiTime(gate.id)}分钟
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {gate.aircraftType.map((at) => (
                  <span
                    key={at}
                    className="rounded bg-dark-border/50 px-1.5 py-0.5 text-[10px] text-primary-light/60"
                  >
                    {at}
                  </span>
                ))}
              </div>
              {gate.status === 'occupied' && flight && (
                <div className="mt-2 border-t border-dark-border pt-2">
                  <div className="text-xs font-medium text-cyan-glow">{flight.flightNo}</div>
                  <div className="flex items-center gap-1 text-[10px] text-primary-light/50">
                    <Clock className="h-3 w-3" />
                    {getRemainingTime(flight.id) ?? '--'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
        <h3 className="mb-3 text-sm font-bold text-cyan-glow">航班-机位分配</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border text-left text-xs text-primary-light/50">
                <th className="pb-2 pr-4">航班号</th>
                <th className="pb-2 pr-4">航司</th>
                <th className="pb-2 pr-4">机型</th>
                <th className="pb-2 pr-4">机位</th>
                <th className="pb-2 pr-4">状态</th>
                <th className="pb-2 pr-4">航线</th>
                <th className="pb-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {terminalFlights.map((flight) => {
                const gate = filteredGates.find((g) => g.id === flight.gateId);
                const isReassigning = reassignGateId === flight.id;
                const recommendedGates = recommendGates(flight.aircraftType, activeTerminal);
                return (
                  <tr key={flight.id} className="border-b border-dark-border/50">
                    <td className="py-2.5 pr-4 font-medium text-cyan-glow">{flight.flightNo}</td>
                    <td className="py-2.5 pr-4 text-primary-light/70">{flight.airline}</td>
                    <td className="py-2.5 pr-4 text-primary-light/70">{flight.aircraftType}</td>
                    <td className="py-2.5 pr-4 font-medium text-primary-light">{gate?.code ?? '--'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        flight.status === 'delayed'
                          ? 'bg-danger/10 text-danger'
                          : flight.status === 'boarding'
                            ? 'bg-success/10 text-success'
                            : 'bg-primary-light/10 text-primary-light'
                      }`}>
                        {flight.status === 'delayed' ? '延误' : flight.status === 'boarding' ? '登机中' : flight.status === 'arrived' ? '已到达' : flight.status === 'scheduled' ? '计划' : flight.status === 'departed' ? '已起飞' : '取消'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-primary-light/50">
                      {flight.origin} → {flight.destination}
                    </td>
                    <td className="py-2.5">
                      {isReassigning ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded border border-dark-border bg-dark px-2 py-1 text-xs text-primary-light"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleReassign(flight.id, e.target.value);
                            }}
                          >
                            <option value="" disabled>选择新机位</option>
                            {recommendedGates.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.code} (滑行{calculateTaxiTime(g.id)}分, 分数:{g.score})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setReassignGateId(null)}
                            className="text-xs text-danger hover:text-danger/80"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReassignGateId(flight.id)}
                          className="flex items-center gap-1 text-xs text-primary-light/60 transition-colors hover:text-primary-light"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          重新分配
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {terminalFlights.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-primary-light/40">
                    当前航站楼暂无航班分配
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-fade-in w-full max-w-lg rounded-xl border border-dark-border bg-dark-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-cyan-glow">智能机位推荐</h3>
              <button
                type="button"
                onClick={() => { setShowPlanModal(false); setPlanResult(null); }}
                className="text-primary-light/40 transition-colors hover:text-primary-light"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-primary-light/60">航班号</label>
                <input
                  type="text"
                  value={planForm.flightNo}
                  onChange={(e) => setPlanForm((p) => ({ ...p, flightNo: e.target.value }))}
                  placeholder="如 CA1234"
                  className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-primary-light placeholder-primary-light/30 focus:border-primary-light focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-primary-light/60">机型</label>
                <select
                  value={planForm.aircraftType}
                  onChange={(e) => setPlanForm((p) => ({ ...p, aircraftType: e.target.value }))}
                  className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-primary-light focus:border-primary-light focus:outline-none"
                >
                  <option value="">请选择机型</option>
                  {AIRCRAFT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-primary-light/60">航空公司</label>
                <input
                  type="text"
                  value={planForm.airline}
                  onChange={(e) => setPlanForm((p) => ({ ...p, airline: e.target.value }))}
                  placeholder="如 中国国航"
                  className="w-full rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-primary-light placeholder-primary-light/30 focus:border-primary-light focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handlePlanSubmit}
                disabled={!planForm.aircraftType}
                className="w-full rounded-lg bg-primary-light py-2 text-sm font-medium text-white transition-colors hover:bg-primary-light/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                智能推荐机位
              </button>
            </div>

            {planResult !== null && (
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-xs text-primary-light/50">
                  <Star className="h-3.5 w-3.5 text-amber-glow" />
                  找到 {planResult.length} 个可用机位（已按推荐分数排序）
                </div>
                {planResult.length === 0 ? (
                  <div className="rounded-lg border border-dark-border bg-dark p-4 text-center text-sm text-warning">
                    当前航站楼没有支持 {planForm.aircraftType} 机型的空闲机位
                  </div>
                ) : (
                  <div className="space-y-2">
                    {planResult.map((gate, idx) => (
                      <div
                        key={gate.id}
                        className={`animate-fade-in rounded-lg border p-3 ${
                          idx === 0
                            ? 'border-success/50 bg-success/5'
                            : 'border-dark-border bg-dark'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {idx === 0 && (
                              <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-success">
                                最佳推荐
                              </span>
                            )}
                            <span className="text-sm font-bold text-primary-light">{gate.code}</span>
                            <span className="text-xs text-primary-light/50">{gate.currentPosition}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold text-amber-glow">
                            <Award className="h-4 w-4" />
                            {gate.score}分
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary-light/60">
                          <Star className="h-3 w-3 text-amber-glow" />
                          推荐原因：{gate.reason}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-cyan-glow">
                          <Timer className="h-3 w-3" />
                          预计滑行时间：{calculateTaxiTime(gate.id)}分钟
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {gate.aircraftType.map((at) => (
                            <span
                              key={at}
                              className={`rounded px-1.5 py-0.5 text-[10px] ${
                                at === planForm.aircraftType
                                  ? 'bg-cyan-glow/20 text-cyan-glow'
                                  : 'bg-dark-border/50 text-primary-light/50'
                              }`}
                            >
                              {at}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssign(`temp-${Date.now()}`, gate.id)}
                          className="mt-3 w-full rounded-lg bg-primary-light/80 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-light"
                        >
                          确认分配
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
