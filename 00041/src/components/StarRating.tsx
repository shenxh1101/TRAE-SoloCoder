import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({ value, onChange, readonly = false, size = 20 }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const isInteractive = !readonly && onChange;
  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => isInteractive && onChange?.(star)}
          onMouseEnter={() => isInteractive && setHoverValue(star)}
          onMouseLeave={() => isInteractive && setHoverValue(0)}
          className={`transition-transform ${isInteractive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            size={size}
            fill={star <= displayValue ? 'var(--primary)' : 'none'}
            stroke={star <= displayValue ? 'var(--primary)' : '#CBD5E0'}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  );
}
