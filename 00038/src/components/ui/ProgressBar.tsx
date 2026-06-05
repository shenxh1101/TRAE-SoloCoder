import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
}

const colorClasses = {
  primary: 'bg-gradient-primary',
  success: 'bg-gradient-green',
  warning: 'bg-gradient-orange',
  danger: 'bg-accent-red',
  cyan: 'bg-accent-cyan',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  striped = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayLabel = label || `${percentage.toFixed(0)}%`;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-text-secondary">{displayLabel}</span>
          <span className="text-xs text-text-tertiary font-mono">{value.toFixed(1)}/{max}</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-background-tertiary rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorClasses[color],
            animated && 'animate-pulse',
            striped &&
              'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
