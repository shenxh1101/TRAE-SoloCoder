import React from 'react';
import { SimulationStatus, STATUS_FLOW, STATUS_LABELS } from '../../../shared/types';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatusFlowTrackerProps {
  currentStatus: SimulationStatus;
  size?: 'sm' | 'md';
}

export const StatusFlowTracker: React.FC<StatusFlowTrackerProps> = ({
  currentStatus,
  size = 'md',
}) => {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STATUS_FLOW.map((status, index) => {
          const isCompleted = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isPending = currentIndex < index;

          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className={cn(
                    'rounded-full flex items-center justify-center transition-all duration-500',
                    size === 'sm' ? 'w-7 h-7' : 'w-10 h-10',
                    isCompleted && 'bg-accent-green shadow-glow-cyan',
                    isCurrent && 'bg-primary animate-pulse-glow shadow-glow',
                    isPending && 'bg-background-tertiary border border-border'
                  )}
                >
                  {isCompleted ? (
                    <Check size={size === 'sm' ? 14 : 18} className="text-white" />
                  ) : isCurrent ? (
                    <Loader2 size={size === 'sm' ? 14 : 18} className="text-white animate-spin" />
                  ) : (
                    <span className={cn('font-semibold', size === 'sm' ? 'text-xs' : 'text-sm', 'text-text-muted')}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-center font-medium transition-colors duration-300 whitespace-nowrap',
                    size === 'sm' ? 'text-[10px]' : 'text-xs',
                    isCompleted && 'text-accent-green',
                    isCurrent && 'text-primary-light',
                    isPending && 'text-text-muted'
                  )}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              {index < STATUS_FLOW.length - 1 && (
                <div className="flex-1 mx-1 relative h-0.5">
                  <div className="absolute inset-0 bg-border rounded-full" />
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-700',
                      isCompleted || (isCurrent && index < currentIndex)
                        ? 'bg-gradient-primary w-full'
                        : 'w-0'
                    )}
                  />
                  <ChevronRight
                    size={size === 'sm' ? 12 : 14}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-text-muted"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
