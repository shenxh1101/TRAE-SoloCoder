import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  score: number | undefined;
  onScore: (score: number) => void;
}

export default function StarRating({ score, onScore }: StarRatingProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const isFixed = score !== undefined;

  const getColor = (index: number) => {
    if (isFixed) return index < score! ? "#D4A574" : "#444";
    if (hoverIndex !== null) return index <= hoverIndex ? "#E8C49A" : "#444";
    return index < (score ?? 0) ? "#D4A574" : "#444";
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={isFixed}
          onClick={() => onScore(i + 1)}
          onMouseEnter={() => !isFixed && setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
          className="p-0 bg-transparent border-none cursor-pointer disabled:cursor-default transition-transform duration-150 hover:scale-125 disabled:hover:scale-100"
        >
          <Star
            size={16}
            fill={getColor(i)}
            stroke={getColor(i)}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
