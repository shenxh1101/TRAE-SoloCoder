import React, { createElement } from 'react';
import { cn } from '../../lib/utils';

type GlowTextColor = 'cyan' | 'green' | 'red' | 'yellow' | 'purple' | 'white';

type GlowTextTag = 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface GlowTextProps {
  className?: string;
  color?: GlowTextColor;
  intensity?: 'low' | 'medium' | 'high';
  flicker?: boolean;
  children: React.ReactNode;
  as?: GlowTextTag;
}

const colorMap: Record<GlowTextColor, { text: string; glow: string }> = {
  cyan: {
    text: 'text-cyan-400',
    glow: 'drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]',
  },
  green: {
    text: 'text-green-400',
    glow: 'drop-shadow-[0_0_5px_rgba(74,222,128,0.8)] drop-shadow-[0_0_15px_rgba(74,222,128,0.6)] drop-shadow-[0_0_30px_rgba(74,222,128,0.4)]',
  },
  red: {
    text: 'text-red-500',
    glow: 'drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]',
  },
  yellow: {
    text: 'text-yellow-400',
    glow: 'drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]',
  },
  purple: {
    text: 'text-purple-400',
    glow: 'drop-shadow-[0_0_5px_rgba(192,132,252,0.8)] drop-shadow-[0_0_15px_rgba(192,132,252,0.6)] drop-shadow-[0_0_30px_rgba(192,132,252,0.4)]',
  },
  white: {
    text: 'text-white',
    glow: 'drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]',
  },
};

const intensityMap: Record<'low' | 'medium' | 'high', string> = {
  low: 'opacity-70',
  medium: 'opacity-100',
  high: 'opacity-100',
};

export const GlowText: React.FC<GlowTextProps> = ({
  className,
  color = 'cyan',
  intensity = 'medium',
  flicker = false,
  children,
  as = 'span',
}) => {
  const colors = colorMap[color];
  const intensityStyle = intensityMap[intensity];

  const classes = cn(
    'font-mono font-bold',
    colors.text,
    colors.glow,
    intensityStyle,
    flicker && 'animate-[flicker_0.15s_infinite_alternate]',
    className
  );

  return createElement(as, { className: classes }, children);
};
