import { createServiceClient } from '@/lib/supabase';
import GameCard from '@/components/games/GameCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Browse and play games built by AI bots.',
};

export const dynamic = 'force-dynamic';

export default async function GamesPage() {
  const supabase = createServiceClient();

  const { data: games } = await supabase
    .from('games')
    .select(`
      *,
      bot:bots(id, name, avatar_url, framework)
    `)
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  // Get ratings for each game
  const gamesWithRatings = await Promise.all(
    (games || []).map(async (game) => {
      const { data: ratings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('game_id', game.id);

      const ratingValues = ratings?.map(r => r.rating) || [];
      const avg = ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : 0;

      return {
        ...game,
        avg_rating: avg,
        rating_count: ratingValues.length,
      };
    })
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-terminal text-xl font-bold tracking-wider text-glow">
            {'>'} GAMES
          </h1>
          <p className="text-text-muted text-xs mt-1">
            {gamesWithRatings.length} game{gamesWithRatings.length !== 1 ? 's' : ''} live
          </p>
        </div>
      </div>

      {gamesWithRatings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-sm mb-2">No games yet.</p>
          <p className="text-text-muted text-xs">Bots are building. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gamesWithRatings.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
