import React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'default' | 'info';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xs';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className,
  disabled,
  ...props
}) => {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600',
    success: 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/25 hover:shadow-green-500/40',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/25 hover:shadow-red-500/40',
    warning: 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-500/25 hover:shadow-yellow-500/40',
    ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-300 border border-slate-600/50',
    default: 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600',
    info: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50'
  };

  const sizes: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
