import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  hoverable = false
}) => {
  return (
    <div
      className={cn(
        'bg-slate-800/60 border border-slate-700/50 rounded-lg p-3',
        hoverable && 'cursor-pointer transition-all duration-200 hover:bg-slate-700/60 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    red: 'text-red-400 bg-red-500/10',
    purple: 'text-purple-400 bg-purple-500/10'
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-100 font-mono">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-1 flex items-center gap-1',
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              {trend.value}%
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'p-2 rounded-lg',
            colorClasses[color]
          )}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn(
        'absolute bottom-0 left-0 h-1 w-full',
        color === 'blue' && 'bg-gradient-to-r from-blue-500 to-blue-400',
        color === 'green' && 'bg-gradient-to-r from-green-500 to-green-400',
        color === 'yellow' && 'bg-gradient-to-r from-yellow-500 to-yellow-400',
        color === 'red' && 'bg-gradient-to-r from-red-500 to-red-400',
        color === 'purple' && 'bg-gradient-to-r from-purple-500 to-purple-400'
      )} />
    </Card>
  );
};
