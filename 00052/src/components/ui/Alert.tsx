import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertSeverity } from '@/types';

interface AlertProps {
  type?: AlertSeverity | 'info' | 'success';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  timestamp?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'medium',
  title,
  message,
  onClose,
  className,
  timestamp
}) => {
  const configs: Record<string, any> = {
    low: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/50',
      iconColor: 'text-blue-400'
    },
    medium: {
      icon: AlertCircle,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/50',
      iconColor: 'text-yellow-400'
    },
    high: {
      icon: AlertTriangle,
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/50',
      iconColor: 'text-orange-400'
    },
    critical: {
      icon: AlertTriangle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      iconColor: 'text-red-400',
      animate: 'animate-pulse'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/50',
      iconColor: 'text-blue-400'
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500/10',
      border: 'border-green-500/50',
      iconColor: 'text-green-400'
    }
  };

  const config = configs[type] || configs.medium;
  const Icon = config.icon;
  const animateClass = config.animate || '';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm',
        config.bg,
        config.border,
        animateClass,
        className
      )}
    >
      <Icon className={cn('flex-shrink-0 mt-0.5', config.iconColor)} size={18} />
      <div className="flex-1 min-w-0">
        {title && <p className={cn('text-sm font-medium', config.iconColor)}>{title}</p>}
        <p className="text-xs text-slate-400 mt-0.5">{message}</p>
        {timestamp && (
          <p className="text-xs text-slate-500 mt-1">{timestamp}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export const AlertToast: React.FC<{
  alerts: { id: string; type: AlertSeverity; title: string; message: string }[];
  onDismiss: (id: string) => void;
}> = ({ alerts, onDismiss }) => {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 w-80">
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          className="animate-slideInRight"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <Alert
            type={alert.type}
            title={alert.title}
            message={alert.message}
            onClose={() => onDismiss(alert.id)}
          />
        </div>
      ))}
    </div>
  );
};
