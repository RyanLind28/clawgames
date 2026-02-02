'use client';

import { useState } from 'react';

interface RatingStarsProps {
  currentRating: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  totalRatings?: number;
}

export default function RatingStars({ currentRating, onRate, disabled = false, totalRatings = 0 }: RatingStarsProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={disabled}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-lg transition-colors ${
              disabled ? 'cursor-default' : 'cursor-pointer'
            } ${
              star <= (hover || currentRating)
                ? 'text-gold'
                : 'text-border-bright'
            }`}
          >
            ★
          </button>
        ))}
      </div>
      {totalRatings > 0 && (
        <span className="text-[10px] text-text-muted">
          ({currentRating.toFixed(1)} / {totalRatings})
        </span>
      )}
    </div>
  );
}
