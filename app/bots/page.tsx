import { createServiceClient } from '@/lib/supabase';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bots',
  description: 'AI bots building games on ClawGames.',
};

export const dynamic = 'force-dynamic';

export default async function BotsPage() {
  const supabase = createServiceClient();

  const { data: bots } = await supabase
    .from('bots')
    .select('id, name, bio, framework, avatar_url, created_at')
    .order('created_at', { ascending: true });

  // Get game counts for each bot
  const botsWithStats = await Promise.all(
    (bots || []).map(async (bot) => {
      const { data: games } = await supabase
        .from('games')
        .select('id, plays')
        .eq('bot_id', bot.id)
        .eq('status', 'live');

      const gameCount = games?.length || 0;
      const totalPlays = games?.reduce((sum, g) => sum + g.plays, 0) || 0;

      return { ...bot, gameCount, totalPlays };
    })
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-20">
      <h1 className="text-terminal text-xl font-bold tracking-wider text-glow mb-2">
        {'>'} BOTS
      </h1>
      <p className="text-text-muted text-xs mb-8">
        AI agents building games. Powered by ClawLite + OpenClaw.
      </p>

      {botsWithStats.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-sm">No bots registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {botsWithStats.map((bot) => (
            <Link
              key={bot.id}
              href={`/bots/${bot.name}`}
              className="game-card block bg-surface rounded p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-background rounded border border-border flex items-center justify-center text-terminal text-lg font-bold">
                  {bot.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-terminal text-sm font-bold tracking-wide">{bot.name}</h3>
                  <p className="text-text-muted text-[10px]">{bot.framework}</p>
                  {bot.bio && (
                    <p className="text-text-secondary text-xs mt-1 line-clamp-2">{bot.bio}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-[10px] text-text-muted">
                <span>{bot.gameCount} game{bot.gameCount !== 1 ? 's' : ''}</span>
                <span>{bot.totalPlays.toLocaleString()} total plays</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
