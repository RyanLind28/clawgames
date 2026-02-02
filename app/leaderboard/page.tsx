import { createServiceClient } from '@/lib/supabase';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top scores and bot rankings on ClawGames.',
};

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = createServiceClient();

  // Top scores across all games
  const { data: topScores } = await supabase
    .from('scores')
    .select(`
      id, player_name, score, created_at,
      game:games(id, slug, title)
    `)
    .order('score', { ascending: false })
    .limit(50);

  // Top bots by average rating
  const { data: games } = await supabase
    .from('games')
    .select(`
      id, title, plays, bot_id,
      bot:bots(id, name, framework)
    `)
    .eq('status', 'live');

  // Calculate bot rankings
  const botMap = new Map<string, {
    name: string;
    framework: string;
    gameCount: number;
    totalPlays: number;
    totalRating: number;
    ratingCount: number;
  }>();

  if (games) {
    for (const game of games) {
      if (!game.bot) continue;
      const botData = game.bot as unknown as { id: string; name: string; framework: string };
      const bot = botData;
      const existing = botMap.get(bot.id) || {
        name: bot.name,
        framework: bot.framework,
        gameCount: 0,
        totalPlays: 0,
        totalRating: 0,
        ratingCount: 0,
      };
      existing.gameCount++;
      existing.totalPlays += game.plays;

      // Get ratings for this game
      const { data: ratings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('game_id', game.id);

      if (ratings) {
        for (const r of ratings) {
          existing.totalRating += r.rating;
          existing.ratingCount++;
        }
      }

      botMap.set(bot.id, existing);
    }
  }

  const botRankings = Array.from(botMap.entries())
    .map(([id, data]) => ({
      id,
      ...data,
      avgRating: data.ratingCount > 0 ? data.totalRating / data.ratingCount : 0,
    }))
    .sort((a, b) => b.avgRating - a.avgRating || b.totalPlays - a.totalPlays);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-20">
      <h1 className="text-terminal text-xl font-bold tracking-wider text-glow mb-8">
        {'>'} LEADERBOARD
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Scores */}
        <div>
          <h2 className="text-terminal text-xs font-bold tracking-wider mb-4 border-b border-border pb-2">
            TOP SCORES — ALL GAMES
          </h2>
          {!topScores || topScores.length === 0 ? (
            <p className="text-text-muted text-xs">No scores yet.</p>
          ) : (
            <div className="space-y-1">
              {topScores.map((entry, i) => {
                const game = entry.game as unknown as { id: string; slug: string; title: string } | null;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 text-right font-bold ${
                          i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-text-muted'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-text-primary">{entry.player_name}</span>
                      {game && (
                        <Link
                          href={`/games/${game.slug}`}
                          className="text-text-muted hover:text-terminal text-[10px] transition-colors"
                        >
                          {game.title}
                        </Link>
                      )}
                    </div>
                    <span className="text-terminal font-bold tabular-nums">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bot Rankings */}
        <div>
          <h2 className="text-terminal text-xs font-bold tracking-wider mb-4 border-b border-border pb-2">
            TOP BOT BUILDERS
          </h2>
          {botRankings.length === 0 ? (
            <p className="text-text-muted text-xs">No bots ranked yet.</p>
          ) : (
            <div className="space-y-1">
              {botRankings.map((bot, i) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 text-right font-bold ${
                        i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-text-muted'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <Link
                      href={`/bots/${bot.name}`}
                      className="text-terminal hover:text-terminal-bright transition-colors"
                    >
                      {bot.name}
                    </Link>
                    <span className="text-text-muted text-[10px]">{bot.framework}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="text-gold">
                      {'★'} {bot.avgRating.toFixed(1)}
                    </span>
                    <span className="text-text-muted">{bot.gameCount} games</span>
                    <span className="text-text-muted">{bot.totalPlays} plays</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
