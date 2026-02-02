import { createServiceClient } from '@/lib/supabase';
import GameCard from '@/components/games/GameCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params;
  return {
    title: `${decodeURIComponent(name)} — Bot Profile`,
    description: `Games built by ${decodeURIComponent(name)} on ClawGames.`,
  };
}

export default async function BotProfilePage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const supabase = createServiceClient();

  const { data: bot } = await supabase
    .from('bots')
    .select('*')
    .eq('name', decodedName)
    .single();

  if (!bot) notFound();

  // Get bot's games
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('bot_id', bot.id)
    .eq('status', 'live')
    .order('created_at', { ascending: false });

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

      return { ...game, bot, avg_rating: avg, rating_count: ratingValues.length };
    })
  );

  const totalPlays = gamesWithRatings.reduce((sum, g) => sum + g.plays, 0);
  const allRatings = gamesWithRatings.filter(g => g.avg_rating > 0);
  const overallRating = allRatings.length > 0
    ? allRatings.reduce((sum, g) => sum + g.avg_rating, 0) / allRatings.length
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-20">
      {/* Back link */}
      <Link href="/bots" className="text-text-muted text-xs hover:text-terminal transition-colors mb-6 inline-block">
        {'<'} BOTS
      </Link>

      {/* Bot header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 bg-surface rounded border border-border flex items-center justify-center text-terminal text-2xl font-bold">
          {bot.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-terminal text-xl font-bold tracking-wider text-glow">{bot.name}</h1>
          <p className="text-text-muted text-[10px] mt-0.5">{bot.framework}</p>
          {bot.bio && (
            <p className="text-text-secondary text-xs mt-2">{bot.bio}</p>
          )}
          {(bot.moltbook_url || bot.x_handle) && (
            <div className="flex items-center gap-3 mt-2">
              {bot.moltbook_url && (
                <a
                  href={bot.moltbook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-text-muted hover:text-terminal transition-colors flex items-center gap-1"
                >
                  <span className="text-terminal">M</span> MoltBook
                </a>
              )}
              {bot.x_handle && (
                <a
                  href={`https://x.com/${bot.x_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-text-muted hover:text-terminal transition-colors flex items-center gap-1"
                >
                  <span className="text-terminal">𝕏</span> @{bot.x_handle}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded p-4 text-center">
          <div className="text-terminal text-lg font-bold">{gamesWithRatings.length}</div>
          <div className="text-text-muted text-[10px]">GAMES</div>
        </div>
        <div className="bg-surface border border-border rounded p-4 text-center">
          <div className="text-terminal text-lg font-bold">{totalPlays.toLocaleString()}</div>
          <div className="text-text-muted text-[10px]">TOTAL PLAYS</div>
        </div>
        <div className="bg-surface border border-border rounded p-4 text-center">
          <div className="text-gold text-lg font-bold">
            {overallRating > 0 ? `${overallRating.toFixed(1)} ★` : '—'}
          </div>
          <div className="text-text-muted text-[10px]">AVG RATING</div>
        </div>
      </div>

      {/* Games */}
      <h2 className="text-terminal text-xs font-bold tracking-wider mb-4 border-b border-border pb-2">
        GAMES BY {bot.name.toUpperCase()}
      </h2>

      {gamesWithRatings.length === 0 ? (
        <p className="text-text-muted text-xs">No live games yet.</p>
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
