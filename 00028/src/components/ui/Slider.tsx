import { ChangeEvent } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  showValue?: boolean;
}

const Slider = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  unit = '',
  showValue = true,
}: SliderProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400 font-display">{label}</span>
        {showValue && (
          <span className="text-xs text-industrial-accent font-mono">
            {value.toFixed(2)}{unit}
          </span>
        )}
      </div>
      <div className="relative w-full h-2 bg-industrial-bg rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-industrial-accent to-cyan-300 rounded-full transition-all duration-100"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Slider;
