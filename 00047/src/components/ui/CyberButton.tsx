import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type CyberButtonVariant = 'primary' | 'danger' | 'success' | 'warning';

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CyberButtonVariant;
  glowIntensity?: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantStyles: Record<CyberButtonVariant, { base: string; glow: string; hover: string }> = {
  primary: {
    base: 'border-cyan-400 text-cyan-400',
    glow: 'shadow-[0_0_10px_rgba(34,211,238,0.5),0_0_20px_rgba(34,211,238,0.3)]',
    hover: 'hover:bg-cyan-400/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.7),0_0_30px_rgba(34,211,238,0.5)]',
  },
  danger: {
    base: 'border-red-500 text-red-500',
    glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5),0_0_20px_rgba(239,68,68,0.3)]',
    hover: 'hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.7),0_0_30px_rgba(239,68,68,0.5)]',
  },
  success: {
    base: 'border-green-400 text-green-400',
    glow: 'shadow-[0_0_10px_rgba(74,222,128,0.5),0_0_20px_rgba(74,222,128,0.3)]',
    hover: 'hover:bg-green-400/20 hover:shadow-[0_0_15px_rgba(74,222,128,0.7),0_0_30px_rgba(74,222,128,0.5)]',
  },
  warning: {
    base: 'border-yellow-400 text-yellow-400',
    glow: 'shadow-[0_0_10px_rgba(250,204,21,0.5),0_0_20px_rgba(250,204,21,0.3)]',
    hover: 'hover:bg-yellow-400/20 hover:shadow-[0_0_15px_rgba(250,204,21,0.7),0_0_30px_rgba(250,204,21,0.5)]',
  },
};

const glowIntensityStyles: Record<'low' | 'medium' | 'high', string> = {
  low: 'opacity-70',
  medium: 'opacity-100',
  high: 'opacity-100 animate-pulse',
};

export const CyberButton = forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = 'primary', glowIntensity = 'medium', size = 'md', children, disabled, ...props }, ref) => {
    const style = variantStyles[variant];
    const intensityStyle = glowIntensityStyles[glowIntensity];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'relative font-mono font-bold uppercase tracking-wider',
          sizeStyles[size || 'md'],
          'bg-gray-900/80 backdrop-blur-sm border-2 rounded-none',
          'transition-all duration-300 ease-out',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
          'before:translate-x-[-100%] before:transition-transform before:duration-500',
          'hover:before:translate-x-[100%]',
          'after:absolute after:top-0 after:left-0 after:w-2 after:h-2 after:border-l-2 after:border-t-2',
          'after:border-inherit',
          style.base,
          style.glow,
          style.hover,
          intensityStyle,
          disabled && 'opacity-50 cursor-not-allowed hover:shadow-none',
          className
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-inherit" />
      </button>
    );
  }
);

CyberButton.displayName = 'CyberButton';

export default CyberButton;
