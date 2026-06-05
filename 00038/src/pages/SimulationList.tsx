import React, { useState, useMemo } from 'react';
import { Search, Plus, Play, Pause, Trash2, Eye, Filter } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import {
  SimulationStatus,
  PlasmaType,
  PLASMA_TYPE_LABELS,
  STATUS_LABELS,
} from '../../shared/types';
import * as Select from '@radix-ui/react-select';
import * as Tabs from '@radix-ui/react-tabs';

const statusOptions: (SimulationStatus | 'ALL')[] = ['ALL', 'PENDING', 'PARAM_VALIDATION', 'GRID_GENERATION', 'COMPUTING', 'DATA_DIAGNOSIS', 'COMPLETED', 'PAUSED', 'FAILED'];
const plasmaTypeOptions: (PlasmaType | 'ALL')[] = ['ALL', 'TOKAMAK', 'STELLARATOR', 'INERTIAL', 'MAGNETIC_MIRROR', 'OTHER'];

const SelectIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-muted">
    <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 3V7L10 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const isRunning = (status: SimulationStatus) => ['COMPUTING', 'PARAM_VALIDATION', 'GRID_GENERATION', 'DATA_DIAGNOSIS'].includes(status);
const formatDate = (d: string) => new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function SimulationList() {
  const { simulations, deleteSimulation, startSimulation, pauseSimulation, resumeSimulation, setCurrentSimulation } = useSimulationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SimulationStatus | 'ALL'>('ALL');
  const [plasmaTypeFilter, setPlasmaTypeFilter] = useState<PlasmaType | 'ALL'>('ALL');

  const filteredSimulations = useMemo(() => simulations.filter((sim) => {
    const matchesSearch = sim.name.toLowerCase().includes(searchQuery.toLowerCase()) || sim.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sim.status === statusFilter;
    const matchesType = plasmaTypeFilter === 'ALL' || sim.plasmaType === plasmaTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }), [simulations, searchQuery, statusFilter, plasmaTypeFilter]);

  const handleToggle = (id: string, status: SimulationStatus) => {
    if (isRunning(status)) pauseSimulation(id);
    else if (status === 'PAUSED') resumeSimulation(id);
    else startSimulation(id);
  };

  const SelectField = ({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
  }) => (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="w-full px-3 py-2.5 bg-background-tertiary border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all flex items-center justify-between">
        <Select.Value placeholder={placeholder} />
        <Select.Icon><SelectIcon /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="bg-background-secondary border border-border rounded-xl shadow-glow overflow-hidden z-50">
          <Select.Viewport className="p-1">
            {options.map((opt) => (
              <Select.Item key={opt.value} value={opt.value} className="px-3 py-2 text-sm text-text-primary rounded-lg cursor-pointer hover:bg-background-tertiary outline-none">
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">模拟任务列表</h1>
            <p className="text-text-secondary">管理和监控所有等离子体模拟任务</p>
          </div>
          <button onClick={() => {}} className="flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium hover:shadow-glow-lg transition-all duration-300 hover:scale-105">
            <Plus size={20} />新建任务
          </button>
        </div>

        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[280px] relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="搜索任务名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:shadow-glow transition-all"
              />
            </div>
            <div className="flex items-center gap-2"><Filter size={18} className="text-text-tertiary" /><span className="text-text-secondary text-sm">筛选:</span></div>
            <div className="w-48">
              <SelectField
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as SimulationStatus | 'ALL')}
                options={statusOptions.map((s) => ({ value: s, label: s === 'ALL' ? '全部状态' : STATUS_LABELS[s] }))}
                placeholder="选择状态"
              />
            </div>
            <div className="w-48">
              <SelectField
                value={plasmaTypeFilter}
                onChange={(v) => setPlasmaTypeFilter(v as PlasmaType | 'ALL')}
                options={plasmaTypeOptions.map((t) => ({ value: t, label: t === 'ALL' ? '全部类型' : PLASMA_TYPE_LABELS[t] }))}
                placeholder="选择等离子体类型"
              />
            </div>
          </div>
          <Tabs.Root defaultValue="grid" className="mt-4">
            <Tabs.List className="flex gap-1 bg-background-tertiary p-1 rounded-lg w-fit">
              <Tabs.Trigger value="grid" className={cn('px-4 py-1.5 text-sm rounded-md transition-all', 'data-[state=active]:bg-background-secondary data-[state=active]:text-text-primary data-[state=active]:shadow-sm', 'text-text-tertiary hover:text-text-secondary')}>网格视图</Tabs.Trigger>
              <Tabs.Trigger value="list" className={cn('px-4 py-1.5 text-sm rounded-md transition-all', 'data-[state=active]:bg-background-secondary data-[state=active]:text-text-primary data-[state=active]:shadow-sm', 'text-text-tertiary hover:text-text-secondary')}>列表视图</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </div>

        {filteredSimulations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-tertiary flex items-center justify-center"><Search size={32} className="text-text-muted" /></div>
            <h3 className="text-lg font-medium text-text-primary mb-2">暂无匹配的模拟任务</h3>
            <p className="text-text-tertiary">尝试调整筛选条件或创建新的模拟任务</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSimulations.map((sim) => (
              <div key={sim.id} className="glass-card p-5 hover:shadow-glow transition-all duration-300 group animate-slide-up">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-text-primary mb-1 group-hover:text-primary transition-colors">{sim.name}</h3>
                    <p className="text-sm text-text-tertiary line-clamp-1">{PLASMA_TYPE_LABELS[sim.plasmaType]}</p>
                  </div>
                  <StatusBadge status={sim.status} size="sm" />
                </div>
                <div className="mb-4"><ProgressBar value={sim.progress} showLabel /></div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary mb-4"><ClockIcon />{formatDate(sim.createdAt)}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentSimulation(sim.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-background-tertiary hover:bg-primary/20 text-text-secondary hover:text-primary rounded-lg text-sm transition-all">
                    <Eye size={16} />详情
                  </button>
                  <button
                    onClick={() => handleToggle(sim.id, sim.status)}
                    disabled={sim.status === 'COMPLETED' || sim.status === 'FAILED'}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
                      isRunning(sim.status) ? 'bg-accent-orange/20 text-accent-orange hover:bg-accent-orange/30' :
                      sim.status === 'PAUSED' ? 'bg-primary/20 text-primary hover:bg-primary/30' :
                      'bg-accent-green/20 text-accent-green hover:bg-accent-green/30',
                      (sim.status === 'COMPLETED' || sim.status === 'FAILED') && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isRunning(sim.status) ? <><Pause size={16} />暂停</> : sim.status === 'PAUSED' ? <><Play size={16} />继续</> : <><Play size={16} />启动</>}
                  </button>
                  <button onClick={() => deleteSimulation(sim.id)} className="p-2 bg-background-tertiary hover:bg-accent-red/20 text-text-secondary hover:text-accent-red rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => {}} className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-primary text-white rounded-full shadow-glow-lg flex items-center justify-center hover:shadow-glow-lg hover:scale-110 transition-all duration-300">
          <Plus size={28} />
        </button>
      </div>
    </div>
  );
}
