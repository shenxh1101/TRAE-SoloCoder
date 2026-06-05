import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'cyan' | 'green' | 'orange' | 'purple';
  className?: string;
}

const colorClasses = {
  primary: 'from-primary/20 to-primary/5 text-primary',
  cyan: 'from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan',
  green: 'from-accent-green/20 to-accent-green/5 text-accent-green',
  orange: 'from-accent-orange/20 to-accent-orange/5 text-accent-orange',
  purple: 'from-accent-purple/20 to-accent-purple/5 text-accent-purple',
};

const iconBgClasses = {
  primary: 'bg-primary/20 text-primary',
  cyan: 'bg-accent-cyan/20 text-accent-cyan',
  green: 'bg-accent-green/20 text-accent-green',
  orange: 'bg-accent-orange/20 text-accent-orange',
  purple: 'bg-accent-purple/20 text-accent-purple',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  color = 'primary',
  className,
}) => {
  return (
    <div
      className={cn(
        'glass-card-hover p-5 relative overflow-hidden animate-slide-up',
        className
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', colorClasses[color])} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-text-secondary mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-display text-text-primary">
                {value}
              </span>
              {unit && <span className="text-sm text-text-tertiary">{unit}</span>}
            </div>
          </div>
          <div className={cn('p-3 rounded-xl', iconBgClasses[color])}>
            <Icon size={24} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1.5">
            {trend.isPositive ? (
              <TrendingUp size={14} className="text-accent-green" />
            ) : trend.value < 0 ? (
              <TrendingDown size={14} className="text-accent-red" />
            ) : (
              <Minus size={14} className="text-text-tertiary" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                trend.isPositive
                  ? 'text-accent-green'
                  : trend.value < 0
                  ? 'text-accent-red'
                  : 'text-text-tertiary'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value.toFixed(1)}%
            </span>
            <span className="text-xs text-text-tertiary">vs 上次</span>
          </div>
        )}
      </div>
    </div>
  );
};
