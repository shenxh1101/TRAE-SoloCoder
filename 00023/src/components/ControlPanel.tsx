import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette, Layers, Sun, Sparkles, Grid3X3 } from 'lucide-react';
import { usePagodaStore } from '@/store/usePagodaStore';
import { BodyColor, SpireType } from '@/types';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-amber-100">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="mt-3 pl-2 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step = 1, onChange, unit = '' }: SliderProps) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-sm font-medium text-amber-300">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-12 h-6 rounded-full transition-colors",
          checked ? "bg-amber-500" : "bg-slate-600"
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
            checked ? "translate-x-7" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function ControlPanel() {
  const { config, setFloors, setRoofAngle, setBodyColor, setSpireType, setSunPosition, setShadowsEnabled, setGridHelper, setFirefliesEnabled } = usePagodaStore();

  const colorOptions: { value: BodyColor; label: string; color: string }[] = [
    { value: 'red', label: '朱红', color: '#8B0000' },
    { value: 'brown', label: '棕褐', color: '#5D4037' },
    { value: 'gray', label: '青灰', color: '#455A64' },
  ];

  const spireOptions: { value: SpireType; label: string; icon: string }[] = [
    { value: 'sharp', label: '尖顶', icon: '🔺' },
    { value: 'round', label: '圆顶', icon: '⭕' },
    { value: 'pearl', label: '宝珠', icon: '💎' },
  ];

  return (
    <div className="w-80 h-full bg-slate-800/90 backdrop-blur-md border-r border-slate-700 overflow-y-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-400 mb-1" style={{ fontFamily: 'serif' }}>
          宝塔生成器
        </h1>
        <p className="text-sm text-slate-400">3D交互式中国风宝塔设计</p>
      </div>

      <Section title="结构参数" icon={<Layers size={18} className="text-amber-400" />}>
        <Slider
          label="层数"
          value={config.floors}
          min={3}
          max={9}
          onChange={setFloors}
          unit="层"
        />
        <Slider
          label="屋檐翘起角度"
          value={config.roofAngle}
          min={0}
          max={45}
          step={1}
          onChange={setRoofAngle}
          unit="°"
        />
      </Section>

      <Section title="外观样式" icon={<Palette size={18} className="text-amber-400" />}>
        <div>
          <label className="text-sm text-slate-300 block mb-2">塔身颜色</label>
          <div className="flex gap-2">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setBodyColor(option.value)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all",
                  config.bodyColor === option.value
                    ? "bg-amber-500/30 ring-2 ring-amber-400"
                    : "bg-slate-700/50 hover:bg-slate-700"
                )}
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-300 block mb-2">塔尖样式</label>
          <div className="flex gap-2">
            {spireOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSpireType(option.value)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all",
                  config.spireType === option.value
                    ? "bg-amber-500/30 ring-2 ring-amber-400"
                    : "bg-slate-700/50 hover:bg-slate-700"
                )}
              >
                <span>{option.icon}</span>
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="光照与阴影" icon={<Sun size={18} className="text-amber-400" />}>
        <Slider
          label="太阳高度"
          value={config.sunPosition.y}
          min={10}
          max={80}
          onChange={(y) => setSunPosition(config.sunPosition.x, y, config.sunPosition.z)}
          unit=""
        />
        <Slider
          label="太阳方位 X"
          value={config.sunPosition.x}
          min={-80}
          max={80}
          onChange={(x) => setSunPosition(x, config.sunPosition.y, config.sunPosition.z)}
          unit=""
        />
        <Slider
          label="太阳方位 Z"
          value={config.sunPosition.z}
          min={-80}
          max={80}
          onChange={(z) => setSunPosition(config.sunPosition.x, config.sunPosition.y, z)}
          unit=""
        />
        <Toggle
          label="启用阴影"
          checked={config.shadowsEnabled}
          onChange={setShadowsEnabled}
        />
      </Section>

      <Section title="特效" icon={<Sparkles size={18} className="text-amber-400" />}>
        <Toggle
          label="萤火虫粒子"
          checked={config.firefliesEnabled}
          onChange={setFirefliesEnabled}
        />
      </Section>

      <Section title="辅助工具" icon={<Grid3X3 size={18} className="text-amber-400" />}>
        <Toggle
          label="显示网格"
          checked={config.gridHelper}
          onChange={setGridHelper}
        />
      </Section>
    </div>
  );
}
