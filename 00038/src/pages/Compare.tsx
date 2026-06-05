import React, { useState, useMemo } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RadarChart } from '../components/charts/RadarChart';
import { RadarDataPoint } from '../../shared/types';
import {
  BarChart3,
  Check,
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  Lightbulb,
  Download,
  X,
  Zap,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../lib/utils';
import { formatScientific, formatTime } from '../utils/plasmaUtils';

export default function Compare() {
  const { simulations, comparisonResult, compareSimulations, clearComparison } = useSimulationStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSimulationSelect, setShowSimulationSelect] = useState(false);

  const completedSimulations = useMemo(
    () => simulations.filter((s) => s.status === 'COMPLETED' && s.result),
    [simulations]
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length >= 2) {
      await compareSimulations(selectedIds);
      setShowSimulationSelect(false);
    }
  };

  const priorityColors = {
    HIGH: 'bg-accent-red/20 text-accent-red border-accent-red/30',
    MEDIUM: 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
    LOW: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
  };

  const typeLabels: Record<string, string> = {
    BOUNDARY: '边界条件',
    SOURCE: '源项',
    PARAMETER: '参数调整',
    MODEL: '模型选择',
    GRID: '网格设置',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">
            多工况对比分析
          </h2>
          <p className="text-text-secondary mt-1">
            选择多个已完成的模拟工况进行多维度性能对比
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulationSelect(true)}
            className="btn-primary flex items-center gap-2"
          >
            <BarChart3 size={18} />
            选择工况对比
          </button>
          {comparisonResult && (
            <button onClick={clearComparison} className="btn-secondary flex items-center gap-2">
              <X size={18} />
              清除对比
            </button>
          )}
        </div>
      </div>

      <Dialog.Root open={showSimulationSelect} onOpenChange={setShowSimulationSelect}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[80vh] overflow-y-auto bg-background-card border border-border rounded-2xl shadow-2xl z-50 animate-slide-up">
            <div className="p-6">
              <Dialog.Title className="text-xl font-display font-semibold text-text-primary mb-4">
                选择模拟工况
              </Dialog.Title>
              <p className="text-text-secondary text-sm mb-4">
                至少选择 2 个已完成的模拟工况进行对比
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {completedSimulations.length === 0 ? (
                  <div className="text-center py-8 text-text-tertiary">
                    暂无已完成的模拟任务
                  </div>
                ) : (
                  completedSimulations.map((sim) => (
                    <div
                      key={sim.id}
                      onClick={() => handleToggleSelect(sim.id)}
                      className={cn(
                        'p-4 rounded-xl border cursor-pointer transition-all',
                        selectedIds.includes(sim.id)
                          ? 'border-primary bg-primary/10 shadow-glow'
                          : 'border-border hover:border-primary/50 hover:bg-background-tertiary'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            selectedIds.includes(sim.id)
                              ? 'bg-primary border-primary'
                              : 'border-border'
                          )}
                        >
                          {selectedIds.includes(sim.id) && <Check size={14} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{sim.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={sim.status} size="sm" />
                            <span className="text-xs text-text-tertiary">
                              {sim.plasmaType}
                            </span>
                          </div>
                        </div>
                        {sim.result && (
                          <div className="text-right">
                            <p className="text-sm text-text-primary font-mono">
                              τ={formatTime(sim.result.confinementTime)}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              P={sim.result.fusionPower.toFixed(1)} MW
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <span className="text-sm text-text-secondary">
                  已选择 {selectedIds.length} 个工况
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSimulationSelect(false)}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCompare}
                    disabled={selectedIds.length < 2}
                    className="btn-primary"
                  >
                    开始对比
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {!comparisonResult ? (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-display font-semibold text-text-primary mb-2">
            开始多工况对比
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            选择多个已完成的模拟工况，系统将自动生成性能雷达图并提供优化建议
          </p>
          <button onClick={() => setShowSimulationSelect(true)} className="btn-primary">
            选择模拟工况
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <div className="card-header mb-4">
                <h3 className="section-title">性能雷达图</h3>
                <span className="text-xs text-text-tertiary">
                  {comparisonResult.simulationIds.length} 个工况对比
                </span>
              </div>
              <RadarChart
                indicators={comparisonResult.radarData[0].indicators.map((ind) => ({
                  name: ind.name,
                  max: ind.max,
                  unit: ind.unit,
                }))}
                series={comparisonResult.radarData.map((d) => ({
                  name: d.simulationName,
                  value: d.indicators.map((i) => i.value),
                  color: d.color,
                }))}
                height={400}
              />
            </div>

            <div className="glass-card p-6">
              <div className="card-header mb-4">
                <h3 className="section-title">性能参数对比</h3>
                <ChevronDown size={18} className="text-text-tertiary" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-text-secondary font-medium">
                        指标
                      </th>
                      {comparisonResult.radarData.map((d) => (
                        <th
                          key={d.simulationId}
                          className="text-center py-3 px-2 text-text-secondary font-medium"
                        >
                          {d.simulationName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['约束时间', '聚变功率', 'β值', '稳定裕度', '能量约束'].map(
                      (indicator, idx) => (
                        <tr key={indicator} className="border-b border-border/50">
                          <td className="py-3 px-2 text-text-primary">{indicator}</td>
                          {comparisonResult.radarData.map((d) => {
                            const point = d.indicators[idx];
                            const maxVal = Math.max(
                              ...comparisonResult.radarData.map((x) => x.indicators[idx].value)
                            );
                            const isMax = point.value === maxVal;
                            return (
                              <td
                                key={d.simulationId}
                                className={cn(
                                  'text-center py-3 px-2 font-mono',
                                  isMax ? 'text-accent-green font-medium' : 'text-text-primary'
                                )}
                              >
                                {formatScientific(point.value)} {point.unit}
                                {isMax && <TrendingUp size={12} className="inline ml-1" />}
                              </td>
                            );
                          })}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {comparisonResult.underperformingIds.length > 0 && (
            <div className="glass-card p-6 border-accent-orange/30">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-orange/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-accent-orange" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary mb-1">
                    性能预警
                  </h3>
                  <p className="text-sm text-text-secondary">
                    检测到{' '}
                    <span className="text-accent-orange font-medium">
                      {comparisonResult.underperformingIds.length}
                    </span>{' '}
                    个工况性能低于目标值
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {comparisonResult.underperformingIds.map((id) => {
                      const sim = simulations.find((s) => s.id === id);
                      return sim ? (
                        <span
                          key={id}
                          className="px-3 py-1 bg-accent-orange/10 text-accent-orange text-sm rounded-lg"
                        >
                          {sim.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {comparisonResult.suggestions.length > 0 && (
            <div className="glass-card p-6">
              <div className="card-header mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb size={20} className="text-accent-cyan" />
                  <h3 className="section-title">优化建议</h3>
                </div>
                <button className="text-xs text-text-tertiary flex items-center gap-1">
                  <Zap size={12} />
                  共 {comparisonResult.suggestions.length} 条建议
                </button>
              </div>
              <div className="space-y-3">
                {comparisonResult.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 bg-background-tertiary/50 rounded-xl border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium border',
                            priorityColors[suggestion.priority]
                          )}
                        >
                          {suggestion.priority === 'HIGH'
                            ? '高优先级'
                            : suggestion.priority === 'MEDIUM'
                            ? '中优先级'
                            : '低优先级'}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {typeLabels[suggestion.type]}
                        </span>
                      </div>
                      <button className="p-1.5 rounded-lg hover:bg-background-secondary text-text-tertiary hover:text-text-primary transition-colors">
                        <Download size={14} />
                      </button>
                    </div>
                    <h4 className="font-medium text-text-primary mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-sm text-text-secondary mb-2">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">
                        影响参数: <span className="text-text-secondary">{suggestion.parameterAffected}</span>
                      </span>
                      <span className="text-accent-green">
                        预期提升: {suggestion.expectedImprovement}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
