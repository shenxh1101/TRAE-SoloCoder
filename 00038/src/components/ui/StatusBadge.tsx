import React from 'react';
import { SimulationStatus, NotificationType, STATUS_LABELS } from '../../../shared/types';
import { CheckCircle, Clock, AlertTriangle, Play, Pause, XCircle, Zap, MessageSquare } from 'lucide-react';

interface StatusBadgeProps {
  status: SimulationStatus | NotificationType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: React.ElementType }> = {
  PENDING: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    dot: 'bg-gray-400',
    icon: Clock,
  },
  PARAM_VALIDATION: {
    bg: 'bg-accent-cyan/20',
    text: 'text-accent-cyan',
    dot: 'bg-accent-cyan',
    icon: CheckCircle,
  },
  GRID_GENERATION: {
    bg: 'bg-accent-purple/20',
    text: 'text-accent-purple',
    dot: 'bg-accent-purple',
    icon: Zap,
  },
  COMPUTING: {
    bg: 'bg-primary/20',
    text: 'text-primary-light',
    dot: 'bg-primary',
    icon: Play,
  },
  DATA_DIAGNOSIS: {
    bg: 'bg-accent-yellow/20',
    text: 'text-accent-yellow',
    dot: 'bg-accent-yellow',
    icon: Zap,
  },
  COMPLETED: {
    bg: 'bg-accent-green/20',
    text: 'text-accent-green',
    dot: 'bg-accent-green',
    icon: CheckCircle,
  },
  PAUSED: {
    bg: 'bg-accent-orange/20',
    text: 'text-accent-orange',
    dot: 'bg-accent-orange',
    icon: Pause,
  },
  FAILED: {
    bg: 'bg-accent-red/20',
    text: 'text-accent-red',
    dot: 'bg-accent-red',
    icon: XCircle,
  },
  PERFORMANCE_ALERT: {
    bg: 'bg-accent-orange/20',
    text: 'text-accent-orange',
    dot: 'bg-accent-orange',
    icon: AlertTriangle,
  },
  CONVERGENCE_ISSUE: {
    bg: 'bg-accent-red/20',
    text: 'text-accent-red',
    dot: 'bg-accent-red',
    icon: XCircle,
  },
  SIMULATION_COMPLETE: {
    bg: 'bg-accent-green/20',
    text: 'text-accent-green',
    dot: 'bg-accent-green',
    icon: CheckCircle,
  },
  SUGGESTION: {
    bg: 'bg-accent-cyan/20',
    text: 'text-accent-cyan',
    dot: 'bg-accent-cyan',
    icon: MessageSquare,
  },
  INSTABILITY_ALERT: {
    bg: 'bg-accent-orange/20',
    text: 'text-accent-orange',
    dot: 'bg-accent-orange',
    icon: AlertTriangle,
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-xs gap-1.5',
  lg: 'px-4 py-1.5 text-sm gap-2',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const config = statusConfig[status] || statusConfig.PENDING;
  const label = (STATUS_LABELS as Record<string, string>)[status] || status;
  const Icon = config.icon;

  return (
    <span className={`status-badge ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {showIcon && <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />}
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'COMPUTING' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
};
