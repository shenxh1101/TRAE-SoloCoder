import { useStore } from '../../store/useAppStore';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function PixelRangeSlider({ label, value, min, max, onChange }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-purple-300 uppercase"
          style={{ fontFamily: 'monospace' }}>
          {label}
        </label>
        <span
          className="inline-flex items-center justify-center rounded-sm bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/40"
          style={{ fontFamily: 'monospace' }}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 appearance-none cursor-pointer rounded-none outline-none
            [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:bg-purple-900/60 [&::-webkit-slider-runnable-track]:border [&::-webkit-slider-runnable-track]:border-purple-500/30
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-300 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,197,94,0.6)] [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-track]:h-3 [&::-moz-range-track]:bg-purple-900/60 [&::-moz-range-track]:border [&::-moz-range-track]:border-purple-500/30
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-300 [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(34,197,94,0.6)] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-500" style={{ fontFamily: 'monospace' }}>{min}</span>
          <span className="text-[10px] text-gray-500" style={{ fontFamily: 'monospace' }}>0</span>
          <span className="text-[10px] text-gray-500" style={{ fontFamily: 'monospace' }}>+{max}</span>
        </div>
      </div>
    </div>
  );
}

export default function BrightnessContrastSlider() {
  const brightness = useStore((s) => s.settings.brightness);
  const contrast = useStore((s) => s.settings.contrast);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <div className="space-y-4">
      <PixelRangeSlider
        label="亮度"
        value={brightness}
        min={-50}
        max={50}
        onChange={(v) => setSettings({ brightness: v })}
      />
      <PixelRangeSlider
        label="对比度"
        value={contrast}
        min={-50}
        max={50}
        onChange={(v) => setSettings({ contrast: v })}
      />
    </div>
  );
}
