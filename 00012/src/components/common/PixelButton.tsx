import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<PixelButtonProps['variant']>, string> = {
  primary:
    'border-[#a855f7] text-[#a855f7] hover:bg-[#a855f7]/10 hover:shadow-[0_0_12px_rgba(168,85,247,0.5)] active:translate-y-[2px] active:shadow-none',
  secondary:
    'border-[#22c55e]/50 text-[#22c55e] hover:bg-[#22c55e]/10 active:translate-y-[2px] active:shadow-none',
  danger:
    'border-red-500/50 text-red-400 hover:bg-red-500/10 active:translate-y-[2px] active:shadow-none',
};

export default function PixelButton({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  className = '',
  ...rest
}: PixelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-none border-2 bg-[#1a1a2e] px-4 py-2
        text-sm font-bold tracking-wider uppercase
        transition-all duration-100
        shadow-[3px_3px_0px_0px_rgba(168,85,247,0.3)]
        hover:shadow-[3px_3px_0px_0px_rgba(168,85,247,0.6)]
        active:shadow-[1px_1px_0px_0px_rgba(168,85,247,0.3)]
        disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:shadow-[3px_3px_0px_0px_rgba(168,85,247,0.3)]
        ${VARIANT_STYLES[variant]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
