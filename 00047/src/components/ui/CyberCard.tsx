import React from 'react';
import { cn } from '../../lib/utils';

interface CyberCardProps {
  className?: string;
  children: React.ReactNode;
  borderColor?: string;
  showScanline?: boolean;
  showGlow?: boolean;
}

export const CyberCard: React.FC<CyberCardProps> = ({
  className,
  children,
  borderColor = '#22d3ee',
  showScanline = true,
  showGlow = true,
}) => {
  return (
    <div
      className={cn(
        'relative bg-gray-900/60 backdrop-blur-md border rounded-none',
        'overflow-hidden transition-all duration-300',
        showGlow && 'shadow-lg',
        className
      )}
      style={{
        borderColor,
        boxShadow: showGlow ? `0 0 15px ${borderColor}40, 0 0 30px ${borderColor}20, inset 0 0 30px ${borderColor}08` : undefined,
      }}
    >
      {showScanline && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-10"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            )`,
          }}
        >
          <div
            className="absolute w-full h-16 animate-[scanline_3s_linear_infinite]"
            style={{
              background: `linear-gradient(180deg, transparent, ${borderColor}10, transparent)`,
            }}
          />
        </div>
      )}

      <div
        className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2"
        style={{ borderColor }}
      />
      <div
        className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2"
        style={{ borderColor }}
      />
      <div
        className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2"
        style={{ borderColor }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2"
        style={{ borderColor }}
      />

      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
        }}
      />

      <div className="relative z-20 p-6">{children}</div>
    </div>
  );
};
