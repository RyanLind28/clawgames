'use client';

import type { Score } from '@/lib/types';

interface ScoreBoardProps {
  scores: Score[];
  title?: string;
}

export default function ScoreBoard({ scores, title = 'TOP SCORES' }: ScoreBoardProps) {
  if (scores.length === 0) {
    return (
      <div className="bg-surface rounded border border-border p-4">
        <h3 className="text-terminal text-xs font-bold tracking-wider mb-3">{title}</h3>
        <p className="text-text-muted text-xs">No scores yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded border border-border p-4">
      <h3 className="text-terminal text-xs font-bold tracking-wider mb-3">{title}</h3>
      <div className="space-y-1">
        {scores.map((score, i) => (
          <div
            key={score.id}
            className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 text-right font-bold ${
                  i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-text-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-text-primary">{score.player_name}</span>
            </div>
            <span className="text-terminal font-bold tabular-nums">
              {score.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
