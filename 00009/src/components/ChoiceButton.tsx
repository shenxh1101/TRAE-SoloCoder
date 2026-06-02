import type { StoryChoice } from '../engine/types';

interface ChoiceButtonProps {
  choice: StoryChoice;
  index: number;
  colors: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
  disabled: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function ChoiceButton({
  choice,
  index,
  colors,
  disabled,
  onClick,
  style,
}: ChoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`choice-btn animate-fade-in-up ${colors.bg} ${colors.border} ${colors.text} hover:shadow-lg ${colors.glow} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none text-left min-h-[80px]`}
      style={style}
    >
      <span className="absolute top-2 left-3 text-xs opacity-60 font-display">
        选择 {index + 1}
      </span>
      <span className="block pt-4 font-body text-base md:text-lg">
        {choice.text}
      </span>
      {choice.nextNodeId && (
        <span className="absolute bottom-2 right-3 text-xs opacity-50">
          ✨ 已探索
        </span>
      )}
    </button>
  );
}
