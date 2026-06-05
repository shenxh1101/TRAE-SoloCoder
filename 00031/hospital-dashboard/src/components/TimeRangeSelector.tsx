import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import type { TimeRange } from '../types';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  const options: { value: TimeRange; label: string; icon: React.ReactNode }[] = [
    { value: 'day', label: '今日', icon: <Calendar className="w-4 h-4" /> },
    { value: 'week', label: '本周', icon: <CalendarDays className="w-4 h-4" /> },
    { value: 'month', label: '本月', icon: <CalendarRange className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            selected === option.value
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
