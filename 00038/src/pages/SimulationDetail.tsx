import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Download, Settings, Gauge, Activity, Terminal, Cpu } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as Tabs from '@radix-ui/react-tabs';
import { useSimulationEngine } from '@/hooks/useSimulationEngine';
import { useSimulationStore } from '@/store/useSimulationStore';
import { StatusFlowTracker } from '@/components/ui/StatusFlowTracker';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PlasmaVisualization } from '@/components/visualization/PlasmaVisualization';
import { RadarChart } from '@/components/charts/RadarChart';
import { cn } from '@/lib/utils';
import { formatScientific, formatTime } from '@/utils/plasmaUtils';
import {
  MODE_LABELS,
  BOUNDARY_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  PLASMA_TYPE_LABELS,
} from '../../shared/types';

export default function SimulationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { simulation } = useSimulationEngine(id || null);
  const { startSimulation, pauseSimulation, resumeSimulation } = useSimulationStore();
  const [activeTab, setActiveTab] = useState('parameters');
  const [growthRateHistory, setGrowthRateHistory] = useState<{ time: number; value: number }[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (simulation?.instabilityGrowthRate !== undefined) {
      setGrowthRateHistory((prev) => {
        const newPoint = { time: prev.length * 0.15, value: simulation.instabilityGrowthRate };
        const updated = [...prev, newPoint];
        return updated.slice(-100);
      });
    }
  }, [simulation?.instabilityGrowthRate]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [simulation?.computeLog]);

  const growthRateChart: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 30, 54, 0.95)', borderColor: 'rgba(99, 102, 241, 0.3)', textStyle: { color: '#F1F5F9', fontSize: 12 } },
    xAxis: { type: 'category', name: '时间 (s)', nameTextStyle: { color: '#64748B', fontSize: 10 }, axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(99, 102, 241, 0.2)' } }, data: growthRateHistory.map((d) => d.time.toFixed(1)) },
    yAxis: { type: 'value', name: '增长率', nameTextStyle: { color: '#64748B', fontSize: 10 }, axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(99, 102, 241, 0.2)' } }, splitLine: { lineStyle: { color: 'rgba(99, 102, 241, 0.1)' } } },
    series: [{ type: 'line', smooth: true, symbol: 'none', data: growthRateHistory.map((d) => [d.time.toFixed(1), d.value]), lineStyle: { width: 2, color: '#22D3EE' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(34, 211, 238, 0.3)' }, { offset: 1, color: 'rgba(34, 211, 238, 0)' }] } } }],
  }), [growthRateHistory]);

  const radarIndicators = useMemo(() => simulation?.result ? [
    { name: '约束时间', max: simulation.result.performanceTargets.targetConfinementTime * 1.5, unit: 's' },
    { name: '聚变功率', max: simulation.result.performanceTargets.targetFusionPower * 1.5, unit: 'MW' },
    { name: 'β值', max: simulation.result.performanceTargets.targetBetaValue * 1.5, unit: '%' },
    { name: '稳定裕度', max: simulation.result.performanceTargets.targetStabilityMargin * 1.5, unit: '' },
    { name: '能量约束', max: (simulation.result.energyConfinement || 1) * 1.5, unit: 'MJ' },
  ] : [], [simulation?.result]);

  const radarSeries = useMemo(() => simulation?.result ? [{
    name: simulation.name,
    value: [simulation.result.confinementTime, simulation.result.fusionPower, simulation.result.betaValue, simulation.result.stabilityMargin, simulation.result.energyConfinement],
  }] : [], [simulation]);

  const stepChanges = useMemo(() => {
    return simulation?.computeLog
      .filter((log) => log.includes('时间步长调整'))
      .map((log) => {
        const match = log.match(/\[(.*?)\]\s*时间步长调整:\s*([\d.e-]+)\s*->\s*([\d.e-]+)/);
        return match ? { time: match[1], from: parseFloat(match[2]), to: parseFloat(match[3]) } : null;
      })
      .filter(Boolean)
      .slice(-10);
  }, [simulation?.computeLog]);

  const modeChanges = useMemo(() => {
    return simulation?.computeLog
      .filter((log) => log.includes('模拟模式切换'))
      .map((log) => {
        const match = log.match(/\[(.*?)\]\s*模拟模式切换:\s*(\w+)\s*->\s*(\w+)/);
        return match ? { time: match[1], from: match[2], to: match[3] } : null;
      })
      .filter(Boolean)
      .slice(-10);
  }, [simulation?.computeLog]);

  if (!simulation) return <div className="flex items-center justify-center h-screen text-text-secondary">加载中...</div>;

  const isRunning = ['COMPUTING', 'PARAM_VALIDATION', 'GRID_GENERATION', 'DATA_DIAGNOSIS'].includes(simulation.status);
  const formatDate = (d: string) => new Date(d).toLocaleString('zh-CN');

  const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="bg-background-secondary rounded-lg p-3">
      <p className="text-xs text-text-tertiary mb-1">{label}</p>
      <p className={cn('text-lg font-mono', color)}>{value}</p>
    </div>
  );

  const ControlButton = ({ onClick, icon: Icon, label, variant = 'default' }: {
    onClick: () => void; icon: typeof Play; label: string; variant?: 'default' | 'primary' | 'warning'
  }) => {
    const variants = {
      default: 'border border-border hover:bg-background-tertiary text-text-secondary',
      primary: 'bg-primary hover:bg-primary-dark text-white',
      warning: 'bg-accent-orange hover:bg-accent-orange/80 text-white',
    };
    return (
      <button onClick={onClick} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg transition-colors', variants[variant])}>
        <Icon size={16} /> {label}
      </button>
    );
  };

  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <Tabs.Trigger
      value={id}
      className={cn(
        'px-4 py-3 text-sm font-medium transition-colors relative',
        activeTab === id ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
      )}
    >
      {label}
      {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary" />}
    </Tabs.Trigger>
  );

  const ParamRow = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
    <div className="flex justify-between items-center py-2 px-3 bg-background-secondary rounded-lg">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-mono text-text-primary">{formatScientific(value)} {unit}</span>
    </div>
  );

  const MetricCard = ({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) => (
    <div className="p-3 bg-background-secondary rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className={cn('text-sm font-mono', value >= target ? 'text-accent-green' : 'text-accent-orange')}>
          {formatScientific(value)} {unit}
        </span>
      </div>
      <ProgressBar value={value} max={target} size="sm" color={value >= target ? 'success' : 'warning'} />
      <p className="text-xs text-text-tertiary mt-1">目标: {formatScientific(target)} {unit}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{simulation.name}</h1>
            <StatusBadge status={simulation.status} />
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {PLASMA_TYPE_LABELS[simulation.plasmaType]} · {MODE_LABELS[simulation.mode]} · 创建于 {formatDate(simulation.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {simulation.status === 'PENDING' && <ControlButton onClick={() => startSimulation(simulation.id)} icon={Play} label="开始模拟" variant="primary" />}
          {isRunning && <ControlButton onClick={() => pauseSimulation(simulation.id)} icon={Pause} label="暂停" variant="warning" />}
          {simulation.status === 'PAUSED' && <ControlButton onClick={() => resumeSimulation(simulation.id)} icon={Play} label="继续" variant="primary" />}
          <button className="p-2 rounded-lg border border-border hover:bg-background-tertiary text-text-secondary transition-colors"><RotateCcw size={16} /></button>
          <button className="p-2 rounded-lg border border-border hover:bg-background-tertiary text-text-secondary transition-colors"><Download size={16} /></button>
          <button className="p-2 rounded-lg border border-border hover:bg-background-tertiary text-text-secondary transition-colors"><Settings size={16} /></button>
        </div>
      </div>

      <div className="bg-background-card rounded-xl border border-border p-4 mb-6">
        <StatusFlowTracker currentStatus={simulation.status} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <div className="bg-background-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><Gauge size={16} className="text-primary" /> 实时监控</h3>
            <div className="space-y-4">
              <ProgressBar value={simulation.progress} showLabel label="总体进度" />
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="当前时间步长" value={formatTime(simulation.timeStep)} color="text-accent-cyan" />
                <StatCard label="不稳定性增长率" value={simulation.instabilityGrowthRate.toFixed(4)} color={simulation.instabilityGrowthRate > simulation.instabilityThreshold ? 'text-accent-red' : 'text-accent-green'} />
                <StatCard label="收敛计数" value={`${simulation.convergenceCount}/3`} color="text-accent-yellow" />
              </div>
              <div className="h-48"><ReactECharts option={growthRateChart} style={{ width: '100%', height: '100%' }} /></div>
            </div>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="bg-background-card rounded-xl border border-border overflow-hidden">
            <Tabs.List className="flex border-b border-border bg-background-secondary/50">
              <TabButton id="parameters" label="参数配置" />
              <TabButton id="boundary" label="边界条件" />
              <TabButton id="source" label="源项" />
              <TabButton id="diagnosis" label="结果诊断" />
            </Tabs.List>
            <Tabs.Content value="parameters" className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase">几何参数</h4>
                  <div className="space-y-2">
                    <ParamRow label="大半径" value={simulation.parameters.majorRadius} unit="m" />
                    <ParamRow label="小半径" value={simulation.parameters.minorRadius} unit="m" />
                    <ParamRow label="磁场强度" value={simulation.parameters.magneticField} unit="T" />
                    <ParamRow label="等离子体电流" value={simulation.parameters.plasmaCurrent} unit="MA" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-secondary uppercase mb-3">密度分布</h4>
                  <div className="h-32 bg-background-secondary rounded-lg p-2 flex items-end justify-around">
                    {simulation.parameters.densityProfile.map(([r, n], i) => (
                      <div key={i} className="w-2 bg-gradient-to-t from-primary to-accent-cyan rounded-t" style={{ height: `${(n / simulation.parameters.densityProfile[0][1]) * 100}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </Tabs.Content>
            <Tabs.Content value="boundary" className="p-4">
              <div className="space-y-3">
                {simulation.boundaryConditions.map((bc) => (
                  <div key={bc.id} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{bc.name}</p>
                      <p className="text-xs text-text-tertiary">{BOUNDARY_TYPE_LABELS[bc.type]} · {bc.location}</p>
                    </div>
                    <span className="text-sm font-mono text-text-primary">{formatScientific(bc.value)}</span>
                  </div>
                ))}
              </div>
            </Tabs.Content>
            <Tabs.Content value="source" className="p-4">
              <div className="space-y-3">
                {simulation.sourceTerms.map((st) => (
                  <div key={st.id} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{st.name}</p>
                      <p className="text-xs text-text-tertiary">{SOURCE_TYPE_LABELS[st.type]} · {st.spatialProfile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-text-primary">{formatScientific(st.amplitude)}</p>
                      <p className="text-xs text-text-tertiary">{st.startTime} - {st.startTime + st.duration} s</p>
                    </div>
                  </div>
                ))}
              </div>
            </Tabs.Content>
            <Tabs.Content value="diagnosis" className="p-4">
              {simulation.result ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Activity size={16} className="text-primary" /> 性能指标</h4>
                      <div className="space-y-2">
                        <MetricCard label="约束时间" value={simulation.result.confinementTime} target={simulation.result.performanceTargets.targetConfinementTime} unit="s" />
                        <MetricCard label="聚变功率" value={simulation.result.fusionPower} target={simulation.result.performanceTargets.targetFusionPower} unit="MW" />
                        <MetricCard label="β值" value={simulation.result.betaValue} target={simulation.result.performanceTargets.targetBetaValue} unit="%" />
                        <MetricCard label="稳定裕度" value={simulation.result.stabilityMargin} target={simulation.result.performanceTargets.targetStabilityMargin} unit="" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Cpu size={16} className="text-primary" /> 性能雷达图</h4>
                      <RadarChart indicators={radarIndicators} series={radarSeries} height={280} />
                    </div>
                  </div>
                  <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3">三维场可视化</h4>
                      <PlasmaVisualization
                        densityField={simulation.result.finalDensity}
                        temperatureField={simulation.result.finalTemperature}
                        height={400}
                      />
                    </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-text-tertiary">模拟完成后显示结果诊断</div>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-background-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><Activity size={16} className="text-accent-orange" /> 步长调整记录</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stepChanges.length > 0 ? stepChanges.map((sc, i) => sc && (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-background-secondary rounded-lg">
                  <div>
                    <p className="text-xs text-text-tertiary">{sc.time}</p>
                    <p className="text-sm text-text-primary">
                      <span className="font-mono text-accent-red">{formatTime(sc.from)}</span>
                      <span className="mx-2 text-text-tertiary">→</span>
                      <span className="font-mono text-accent-green">{formatTime(sc.to)}</span>
                    </p>
                  </div>
                </div>
              )) : <p className="text-sm text-text-tertiary text-center py-4">暂无步长调整记录</p>}
            </div>
          </div>

          <div className="bg-background-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><Gauge size={16} className="text-accent-purple" /> 模式切换日志</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {modeChanges.length > 0 ? modeChanges.map((mc, i) => mc && (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-background-secondary rounded-lg">
                  <div>
                    <p className="text-xs text-text-tertiary">{mc.time}</p>
                    <p className="text-sm text-text-primary">
                      <span className="font-mono text-accent-purple">{MODE_LABELS[mc.from as keyof typeof MODE_LABELS] || mc.from}</span>
                      <span className="mx-2 text-text-tertiary">→</span>
                      <span className="font-mono text-accent-cyan">{MODE_LABELS[mc.to as keyof typeof MODE_LABELS] || mc.to}</span>
                    </p>
                  </div>
                </div>
              )) : <p className="text-sm text-text-tertiary text-center py-4">暂无模式切换记录</p>}
            </div>
          </div>

          <div className="bg-background-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary/50">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Terminal size={16} className="text-accent-green" /> 计算日志</h3>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-accent-red" />
                <div className="w-3 h-3 rounded-full bg-accent-yellow" />
                <div className="w-3 h-3 rounded-full bg-accent-green" />
              </div>
            </div>
            <div ref={terminalRef} className="h-72 overflow-y-auto p-4 bg-black/60 font-mono text-xs space-y-1">
              {simulation.computeLog.map((log, i) => <div key={i} className="text-accent-green/90 leading-relaxed">{log}</div>)}
              {isRunning && <div className="text-accent-green/90 flex items-center gap-1"><span className="animate-blink">▊</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
