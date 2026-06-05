import { useState, useMemo } from 'react';
import { useAirport } from '../../context/AirportContext';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  Clock,
  Activity,
  Send,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

function getFlowLevel(flow: number, capacity: number): 'normal' | 'busy' | 'overloaded' {
  if (capacity === 0) return 'normal';
  const ratio = flow / capacity;
  if (ratio >= 0.9) return 'overloaded';
  if (ratio >= 0.7) return 'busy';
  return 'normal';
}

function getFlowBarColor(level: 'normal' | 'busy' | 'overloaded') {
  switch (level) {
    case 'overloaded':
      return 'bg-danger';
    case 'busy':
      return 'bg-amber-glow';
    case 'normal':
      return 'bg-success';
  }
}

function getFlowTextColor(level: 'normal' | 'busy' | 'overloaded') {
  switch (level) {
    case 'overloaded':
      return 'text-danger';
    case 'busy':
      return 'text-amber-glow';
    case 'normal':
      return 'text-success';
  }
}

export default function SecurityChannels() {
  const [activeTerminal, setActiveTerminal] = useState<string>('T1');
  const {
    terminals,
    securityChannels,
    dispatchLogs,
    getSecuritySuggestion,
    dispatchSecurityChannel,
    getTotalFlowByTerminal,
    getTotalCapacityByTerminal,
  } = useAirport();

  const filteredChannels = useMemo(
    () => securityChannels.filter((ch) => ch.terminalId === activeTerminal),
    [securityChannels, activeTerminal],
  );

  const openChannels = useMemo(
    () => filteredChannels.filter((ch) => ch.status === 'open'),
    [filteredChannels],
  );

  const totalFlow = useMemo(
    () => getTotalFlowByTerminal(activeTerminal),
    [getTotalFlowByTerminal, activeTerminal],
  );

  const totalCapacity = useMemo(
    () => getTotalCapacityByTerminal(activeTerminal),
    [getTotalCapacityByTerminal, activeTerminal],
  );

  const utilization = useMemo(
    () => (totalCapacity > 0 ? (totalFlow / totalCapacity) * 100 : 0),
    [totalFlow, totalCapacity],
  );

  const avgWaitTime = useMemo(() => {
    if (openChannels.length === 0) return 0;
    const avgLoad = openChannels.reduce(
      (sum, ch) => sum + (ch.throughput > 0 ? ch.currentFlow / ch.throughput : 0),
      0,
    ) / openChannels.length;
    return Math.round(avgLoad * 15);
  }, [openChannels]);

  const suggestion = useMemo(
    () => getSecuritySuggestion(activeTerminal),
    [getSecuritySuggestion, activeTerminal],
  );

  const suggestions = useMemo(() => {
    const result: { action: 'open' | 'close'; channelIds: string[]; channelNos: string[]; reason: string } = {
      action: 'open',
      channelIds: [],
      channelNos: [],
      reason: suggestion.reason,
    };

    if (suggestion.channelsToOpen.length > 0) {
      result.action = 'open';
      result.channelIds = suggestion.channelsToOpen;
      result.channelNos = suggestion.channelsToOpen.map(id => {
        const ch = securityChannels.find(c => c.id === id);
        return ch ? ch.channelNo : id;
      });
    } else if (suggestion.channelsToClose.length > 0) {
      result.action = 'close';
      result.channelIds = suggestion.channelsToClose;
      result.channelNos = suggestion.channelsToClose.map(id => {
        const ch = securityChannels.find(c => c.id === id);
        return ch ? ch.channelNo : id;
      });
    }

    return result;
  }, [suggestion, securityChannels]);

  const chartData = useMemo(
    () =>
      filteredChannels.map((ch) => ({
        name: ch.channelNo,
        flow: ch.currentFlow,
        capacity: ch.throughput,
        level: ch.status === 'open' ? getFlowLevel(ch.currentFlow, ch.throughput) : 'normal',
        status: ch.status,
      })),
    [filteredChannels],
  );

  const securityDispatchLogs = useMemo(
    () => dispatchLogs.filter(log => log.type === '安检调度').map(log => ({
      id: log.id,
      time: new Date(log.timestamp).toLocaleTimeString('zh-CN'),
      message: log.message,
      type: log.message.includes('开启') ? 'open' : 'close' as const,
    })),
    [dispatchLogs],
  );

  function toggleChannel(id: string) {
    const channel = securityChannels.find(c => c.id === id);
    if (channel) {
      dispatchSecurityChannel(id, channel.status === 'open' ? 'close' : 'open');
    }
  }

  function pushDispatch() {
    suggestion.channelsToOpen.forEach(id => {
      dispatchSecurityChannel(id, 'open');
    });
    suggestion.channelsToClose.forEach(id => {
      dispatchSecurityChannel(id, 'close');
    });
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-cyan-glow" />
          <h1 className="text-2xl font-bold text-white">安检通道管理</h1>
        </div>
      </div>

      <div className="flex gap-2">
        {terminals.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTerminal(t.id)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              activeTerminal === t.id
                ? 'bg-primary-light text-white shadow-lg shadow-primary-light/25'
                : 'bg-dark-card text-slate-400 hover:bg-dark-hover hover:text-white'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs">开放通道</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-glow">{openChannels.length}</div>
          <div className="mt-1 text-xs text-slate-500">共 {filteredChannels.length} 条通道</div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4" />
            <span className="text-xs">总流量</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-glow">{totalFlow.toLocaleString()}</div>
          <div className="mt-1 text-xs text-slate-500">人/分钟</div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs">预计等候</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-primary-light">{avgWaitTime} 分钟</div>
          <div className="mt-1 text-xs text-slate-500">平均排队时间</div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="h-4 w-4" />
            <span className="text-xs">容量利用率</span>
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ color: utilization > 80 ? '#ef4444' : utilization > 50 ? '#fbbf24' : '#10b981' }}>
            {utilization.toFixed(1)}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-dark-border">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(utilization, 100)}%`,
                backgroundColor: utilization > 80 ? '#ef4444' : utilization > 50 ? '#fbbf24' : '#10b981',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="rounded-xl border border-dark-border bg-dark-card p-5">
            <h2 className="mb-4 text-base font-semibold text-white">通道状态</h2>
            <div className="grid grid-cols-4 gap-3">
              {filteredChannels.map((ch) => {
                const level = ch.status === 'open' ? getFlowLevel(ch.currentFlow, ch.throughput) : 'normal';
                const flowPercent = ch.throughput > 0 ? (ch.currentFlow / ch.throughput) * 100 : 0;
                return (
                  <div
                    key={ch.id}
                    className={`rounded-lg border p-3 transition-all ${
                      ch.status === 'open'
                        ? 'border-dark-border bg-dark hover:border-dark-hover'
                        : 'border-dark-border/50 bg-dark/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{ch.channelNo}</span>
                      {ch.status === 'open' ? (
                        <ShieldCheck className="h-4 w-4 text-success" />
                      ) : (
                        <ShieldOff className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {ch.status === 'open' ? (
                        <>
                          <span className={getFlowTextColor(level)}>{ch.currentFlow}</span>
                          <span className="text-slate-500"> / {ch.throughput} 人/分</span>
                        </>
                      ) : (
                        <span className="text-slate-600">已关闭</span>
                      )}
                    </div>
                    {ch.status === 'open' && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-dark-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getFlowBarColor(level)}`}
                          style={{ width: `${Math.min(flowPercent, 100)}%` }}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => toggleChannel(ch.id)}
                      className={`mt-2 w-full rounded px-2 py-1 text-xs font-medium transition-colors ${
                        ch.status === 'open'
                          ? 'bg-danger/10 text-danger hover:bg-danger/20'
                          : 'bg-success/10 text-success hover:bg-success/20'
                      }`}
                    >
                      {ch.status === 'open' ? '关闭通道' : '开启通道'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-dark-border bg-dark-card p-5">
            <h2 className="mb-4 text-base font-semibold text-white">实时流量</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                  formatter={(value, name: string) => [
                    name === 'capacity' ? `${value} 人/分 (容量)` : `${value} 人/分 (流量)`,
                    name === 'capacity' ? '容量' : '流量',
                  ]}
                />
                <Bar dataKey="flow" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.status === 'closed'
                          ? '#475569'
                          : entry.level === 'overloaded'
                            ? '#ef4444'
                            : entry.level === 'busy'
                              ? '#fbbf24'
                              : '#22d3ee'
                      }
                    />
                  ))}
                </Bar>
                <ReferenceLine
                  y={450}
                  stroke="#f97316"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: '容量线', fill: '#f97316', fontSize: 11, position: 'right' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-dark-border bg-dark-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-glow" />
              <h2 className="text-base font-semibold text-white">智能调度建议</h2>
            </div>

            {suggestions.channelNos.length > 0 ? (
              <div className="space-y-3">
                <div
                  className={`rounded-lg border p-3 ${
                    suggestions.action === 'open'
                      ? 'border-success/30 bg-success/5'
                      : 'border-warning/30 bg-warning/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {suggestions.action === 'open' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-warning" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        suggestions.action === 'open' ? 'text-success' : 'text-warning'
                      }`}
                    >
                      {suggestions.action === 'open' ? '建议开启' : '建议关闭'}
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-bold text-white">
                    {suggestions.channelNos.join('、')} 号通道
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {suggestions.reason}
                  </div>
                </div>

                <button
                  onClick={pushDispatch}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-light py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-light/80 hover:shadow-lg hover:shadow-primary-light/25"
                >
                  <Send className="h-4 w-4" />
                  推送调度指令
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-slate-500">
                <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
                <span className="text-sm">通道运行正常</span>
                <span className="text-xs">当前无需调度调整</span>
              </div>
            )}

            <div className="mt-4 border-t border-dark-border pt-3">
              <div className="mb-2 text-xs font-medium text-slate-400">利用率指标</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-danger" />
                  &gt;80% 过载
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-glow" />
                  50-80% 繁忙
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-success" />
                  &lt;50% 正常
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-dark-border bg-dark-card p-5">
            <h2 className="mb-3 text-base font-semibold text-white">调度日志</h2>
            {securityDispatchLogs.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {securityDispatchLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 rounded-lg bg-dark p-2.5">
                    <ChevronRight
                      className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                        log.type === 'open' ? 'text-success' : 'text-warning'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-white">{log.message}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">暂无调度记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
