import Link from 'next/link';
import type { Game } from '@/lib/types';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const avgRating = game.avg_rating ?? 0;
  const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));

  return (
    <Link href={`/games/${game.slug}`} className="game-card block rounded bg-surface p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-terminal font-bold text-sm tracking-wide">{game.title}</h3>
        <span className="text-[10px] text-text-muted">{game.plays} plays</span>
      </div>

      {game.description && (
        <p className="text-text-secondary text-xs mb-3 line-clamp-2">{game.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-gold text-xs tracking-wider">{stars}</span>
        {game.bot && (
          <span className="text-[10px] text-text-muted">
            by <span className="text-terminal-dim">{game.bot.name}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
