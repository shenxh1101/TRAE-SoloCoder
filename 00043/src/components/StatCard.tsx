import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
  delay?: number;
}

export default function StatCard({
  title,
  value,
  unit,
  icon,
  trend,
  gradient,
  delay = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible || typeof value !== 'number') return;

    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [isVisible, value]);

  const display = typeof value === 'number' ? displayValue.toLocaleString() : value;

  return (
    <div
      className={cn(
        'card relative overflow-hidden transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className={cn('absolute inset-0 opacity-10', gradient)} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-neutral-800">
                {display}
              </span>
              {unit && (
                <span className="text-sm text-neutral-500">{unit}</span>
              )}
            </div>
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-sm',
                  trend.isPositive ? 'text-secondary-600' : 'text-red-500'
                )}
              >
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-neutral-400">较上周</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center text-white',
              gradient
            )}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
