import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Play, ChevronDown, ChevronUp, Settings, Zap, Thermometer, AlertCircle } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { cn } from '@/lib/utils';
import {
  PlasmaType,
  SimulationMode,
  BoundaryCondition,
  SourceTerm,
  BoundaryType,
  SourceType,
  FileUploadResponse,
  PLASMA_TYPE_LABELS,
  MODE_LABELS,
  BOUNDARY_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
} from '../../shared/types';
import { getDefaultBoundaryConditions, getDefaultSourceTerms, matchPlasmaModel, detectPlasmaTypeFromProfile } from '@/utils/plasmaUtils';
import * as Select from '@radix-ui/react-select';
import * as Collapsible from '@radix-ui/react-collapsible';
import { v4 as uuidv4 } from 'uuid';

const SelectIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SelectField = ({ value, onChange, options, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) => (
  <Select.Root value={value} onValueChange={onChange}>
    <Select.Trigger className={cn('w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all flex items-center justify-between', className)}>
      <Select.Value />
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

const InputField = ({ value, onChange, type = 'text', step, placeholder, className = '' }: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: number;
  placeholder?: string;
  className?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    step={step}
    placeholder={placeholder}
    className={cn('w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all', className)}
  />
);

const CHART_W = 280;
const CHART_H = 120;
const CHART_PAD = 4;

function buildAreaPath(profile: number[][], width: number, height: number, pad: number): string {
  if (!profile || profile.length < 2) return '';
  const vals = profile.map((p) => p[1]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;
  const drawW = width - pad * 2;
  const drawH = height - pad * 2;

  const points = profile.map((p, i) => {
    const x = pad + (i / (profile.length - 1)) * drawW;
    const y = pad + drawH - ((p[1] - minV) / rangeV) * drawH;
    return `${x},${y}`;
  });

  const firstX = pad;
  const lastX = pad + drawW;
  const baseline = pad + drawH;

  return `M${firstX},${baseline} L${points.join(' L')} L${lastX},${baseline} Z`;
}

function buildLinePath(profile: number[][], width: number, height: number, pad: number): string {
  if (!profile || profile.length < 2) return '';
  const vals = profile.map((p) => p[1]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;
  const drawW = width - pad * 2;
  const drawH = height - pad * 2;

  const points = profile.map((p, i) => {
    const x = pad + (i / (profile.length - 1)) * drawW;
    const y = pad + drawH - ((p[1] - minV) / rangeV) * drawH;
    return `${x},${y}`;
  });

  return `M${points.join(' L')}`;
}

function formatSciShort(value: number): string {
  if (value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  if (exp >= -1 && exp <= 3) return value.toFixed(1);
  const mantissa = value / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

const ProfileChart = ({ profile, label, color, unit }: {
  profile: number[][];
  label: string;
  color: string;
  unit: string;
}) => {
  if (!profile || profile.length < 2) return null;
  const areaPath = buildAreaPath(profile, CHART_W, CHART_H, CHART_PAD);
  const linePath = buildLinePath(profile, CHART_W, CHART_H, CHART_PAD);
  const centerVal = profile[0]?.[1] ?? 0;
  const edgeVal = profile[profile.length - 1]?.[1] ?? 0;

  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {label === '密度分布' ? <Zap size={14} style={{ color }} /> : <Thermometer size={14} style={{ color }} />}
          <span className="text-sm font-medium text-text-primary">{label}</span>
        </div>
        <span className="text-xs text-text-tertiary">{unit}</span>
      </div>
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto rounded-lg bg-background-tertiary/50">
        {areaPath && <path d={areaPath} fill={`${color}20`} />}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
      </svg>
      <div className="flex justify-between mt-1 text-xs text-text-tertiary">
        <span>芯部: {formatSciShort(centerVal)}</span>
        <span>边缘: {formatSciShort(edgeVal)}</span>
      </div>
    </div>
  );
};

export default function NewSimulation() {
  const navigate = useNavigate();
  const { createSimulation, startSimulation } = useSimulationStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [plasmaType, setPlasmaType] = useState<PlasmaType | null>(null);
  const [matchedModel, setMatchedModel] = useState<string>('');
  const [boundaryConditions, setBoundaryConditions] = useState<BoundaryCondition[]>([]);
  const [sourceTerms, setSourceTerms] = useState<SourceTerm[]>([]);
  const [mode, setMode] = useState<SimulationMode>('FLUID_MHD');
  const [timeStep, setTimeStep] = useState(1e-6);
  const [instabilityThreshold, setInstabilityThreshold] = useState(0.1);
  const [parameters, setParameters] = useState<FileUploadResponse['parameters'] | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setBoundaryConditions(getDefaultBoundaryConditions());
    setSourceTerms(getDefaultSourceTerms());
  }, []);

  const handleFileUpload = (r: FileUploadResponse) => {
    setPlasmaType(r.detectedPlasmaType);
    setMatchedModel(r.matchedModel);
    setParameters(r.parameters);
  };

  const addBC = () => setBoundaryConditions([...boundaryConditions, {
    id: uuidv4(), name: `边界条件 ${boundaryConditions.length + 1}`, type: 'DIRICHLET' as BoundaryType, location: 'INNER', value: 0.0,
  }]);

  const removeBC = (id: string) => setBoundaryConditions(boundaryConditions.filter((bc) => bc.id !== id));
  const updateBC = (id: string, u: Partial<BoundaryCondition>) => setBoundaryConditions(boundaryConditions.map((bc) => bc.id === id ? { ...bc, ...u } : bc));

  const addST = () => setSourceTerms([...sourceTerms, {
    id: uuidv4(), name: `源项 ${sourceTerms.length + 1}`, type: 'HEATING' as SourceType, amplitude: 10.0, spatialProfile: 'Gaussian: r=0.5', startTime: 0.0, duration: 10.0,
  }]);

  const removeST = (id: string) => setSourceTerms(sourceTerms.filter((st) => st.id !== id));
  const updateST = (id: string, u: Partial<SourceTerm>) => setSourceTerms(sourceTerms.map((st) => st.id === id ? { ...st, ...u } : st));

  const canSubmit = name.trim() && parameters !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const sim = await createSimulation({
      name, description, plasmaType: plasmaType!, mode, parameters,
      boundaryConditions, sourceTerms, modelType: matchedModel || matchPlasmaModel(plasmaType!),
    });
    navigate(`/simulations/${sim.id}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => {}} className="p-2 rounded-lg bg-background-tertiary hover:bg-background-secondary text-text-secondary hover:text-text-primary transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary">新建模拟任务</h1>
            <p className="text-text-secondary">配置等离子体模拟参数</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-text-primary mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">任务名称</label>
                <InputField value={name} onChange={setName} placeholder="输入模拟任务名称" className="py-3 px-4" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">任务描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入模拟任务描述（可选）"
                  rows={3}
                  className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:shadow-glow transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-text-primary mb-4">参数文件上传</h2>
            <FileUploadZone onUploadComplete={handleFileUpload} />
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-text-primary mb-4">等离子体类型</h2>
            {plasmaType && matchedModel ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/15 border border-primary/30 rounded-xl">
                  <Zap size={18} className="text-primary" />
                  <span className="text-sm font-medium text-primary">识别类型: {PLASMA_TYPE_LABELS[plasmaType]}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-accent-cyan/15 border border-accent-cyan/30 rounded-xl">
                  <Settings size={16} className="text-accent-cyan" />
                  <span className="text-sm font-medium text-accent-cyan">匹配模型: {matchedModel}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-background-tertiary rounded-xl border border-dashed border-border">
                <AlertCircle size={16} className="text-text-muted" />
                <span className="text-sm text-text-muted">请上传参数文件以自动识别等离子体类型</span>
              </div>
            )}
          </div>

          {parameters && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-medium text-text-primary mb-4">参数分布预览</h2>
              <div className="flex flex-wrap gap-6">
                <ProfileChart
                  profile={parameters.densityProfile}
                  label="密度分布"
                  color="#6366f1"
                  unit="m⁻³"
                />
                <ProfileChart
                  profile={parameters.temperatureProfile}
                  label="温度分布"
                  color="#f59e0b"
                  unit="K"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-text-tertiary">磁场强度</p>
                  <p className="text-sm font-medium text-text-primary">{parameters.magneticField} T</p>
                </div>
                <div className="text-center p-2 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-text-tertiary">大半径</p>
                  <p className="text-sm font-medium text-text-primary">{parameters.majorRadius} m</p>
                </div>
                <div className="text-center p-2 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-text-tertiary">小半径</p>
                  <p className="text-sm font-medium text-text-primary">{parameters.minorRadius} m</p>
                </div>
                <div className="text-center p-2 bg-background-tertiary rounded-lg">
                  <p className="text-xs text-text-tertiary">等离子体电流</p>
                  <p className="text-sm font-medium text-text-primary">{parameters.plasmaCurrent} MA</p>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-text-primary">边界条件配置</h2>
              <button onClick={addBC} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-all">
                <Plus size={16} />添加
              </button>
            </div>
            <div className="space-y-3">
              {boundaryConditions.map((bc) => (
                <div key={bc.id} className="flex items-center gap-3 p-3 bg-background-tertiary rounded-xl">
                  <InputField value={bc.name} onChange={(v) => updateBC(bc.id, { name: v })} className="flex-1" />
                  <SelectField
                    value={bc.type}
                    onChange={(v) => updateBC(bc.id, { type: v as BoundaryType })}
                    options={(Object.keys(BOUNDARY_TYPE_LABELS) as BoundaryType[]).map((t) => ({ value: t, label: BOUNDARY_TYPE_LABELS[t] }))}
                    className="w-40"
                  />
                  <InputField type="number" value={bc.value} onChange={(v) => updateBC(bc.id, { value: parseFloat(v) })} step={0.1} className="w-24" />
                  <button onClick={() => removeBC(bc.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-text-primary">源项配置</h2>
              <button onClick={addST} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-all">
                <Plus size={16} />添加
              </button>
            </div>
            <div className="space-y-3">
              {sourceTerms.map((st) => (
                <div key={st.id} className="p-4 bg-background-tertiary rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <InputField value={st.name} onChange={(v) => updateST(st.id, { name: v })} className="flex-1" />
                    <SelectField
                      value={st.type}
                      onChange={(v) => updateST(st.id, { type: v as SourceType })}
                      options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => ({ value: t, label: SOURCE_TYPE_LABELS[t] }))}
                      className="w-32"
                    />
                    <button onClick={() => removeST(st.id)} className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-text-tertiary mb-1">幅值</label>
                      <InputField type="number" value={st.amplitude} onChange={(v) => updateST(st.id, { amplitude: parseFloat(v) })} step={0.1} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-text-tertiary mb-1">空间分布</label>
                      <InputField value={st.spatialProfile} onChange={(v) => updateST(st.id, { spatialProfile: v })} />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-text-tertiary mb-1">开始时间</label>
                      <InputField type="number" value={st.startTime} onChange={(v) => updateST(st.id, { startTime: parseFloat(v) })} step={0.1} />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-text-tertiary mb-1">持续时间</label>
                      <InputField type="number" value={st.duration} onChange={(v) => updateST(st.id, { duration: parseFloat(v) })} step={0.1} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="glass-card p-6">
              <Collapsible.Trigger className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2"><Settings size={20} className="text-primary" /><h2 className="text-lg font-medium text-text-primary">高级设置</h2></div>
                {advancedOpen ? <ChevronUp size={20} className="text-text-tertiary" /> : <ChevronDown size={20} className="text-text-tertiary" />}
              </Collapsible.Trigger>
              <Collapsible.Content className={cn('mt-4', advancedOpen && 'animate-slide-down')}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">模拟模式</label>
                    <SelectField
                      value={mode}
                      onChange={(v) => setMode(v as SimulationMode)}
                      options={(Object.keys(MODE_LABELS) as SimulationMode[]).map((m) => ({ value: m, label: MODE_LABELS[m] }))}
                      className="py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">时间步长 (s)</label>
                    <InputField type="number" value={timeStep} onChange={(v) => setTimeStep(parseFloat(v))} step={1e-7} className="py-2.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">不稳定性阈值</label>
                    <InputField type="number" value={instabilityThreshold} onChange={(v) => setInstabilityThreshold(parseFloat(v))} step={0.01} className="py-2.5" />
                  </div>
                </div>
              </Collapsible.Content>
            </div>
          </Collapsible.Root>

          <div className="flex justify-end gap-4">
            <button onClick={() => {}} className="px-6 py-3 bg-background-tertiary text-text-secondary rounded-xl font-medium hover:bg-background-secondary transition-all">取消</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn('flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium hover:shadow-glow-lg transition-all duration-300 hover:scale-105', !canSubmit && 'opacity-50 cursor-not-allowed hover:scale-100')}
            >
              <Play size={20} />创建并开始模拟
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
