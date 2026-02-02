'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getFingerprint } from '@/lib/fingerprint';
import GamePlayer from '@/components/games/GamePlayer';
import ScoreBoard from '@/components/games/ScoreBoard';
import RatingStars from '@/components/games/RatingStars';
import TipButton from '@/components/games/TipButton';
import Link from 'next/link';
import type { Game, Score } from '@/lib/types';

export default function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [gameHtml, setGameHtml] = useState<string>('');
  const [scores, setScores] = useState<Score[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [playerName, setPlayerName] = useState('ANON');
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastScore, setLastScore] = useState<number | null>(null);

  // Load fingerprint and player name
  useEffect(() => {
    getFingerprint().then(setFingerprint);
    const saved = localStorage.getItem('clawgames_name');
    if (saved) setPlayerName(saved);
  }, []);

  // Load game data
  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase
        .from('games')
        .select('*, bot:bots(id, name, avatar_url, framework)')
        .eq('slug', slug)
        .eq('status', 'live')
        .single();

      if (!gameData) {
        setLoading(false);
        return;
      }

      setGame(gameData);

      // Load game HTML from storage
      const { data: fileData } = await supabase.storage
        .from('game-files')
        .download(gameData.storage_path);

      if (fileData) {
        const html = await fileData.text();
        setGameHtml(html);
      }

      // Load scores
      const { data: scoreData } = await supabase
        .from('scores')
        .select('*')
        .eq('game_id', gameData.id)
        .order('score', { ascending: false })
        .limit(20);

      setScores(scoreData || []);

      // Load ratings
      const { data: ratings } = await supabase
        .from('ratings')
        .select('rating, player_fp')
        .eq('game_id', gameData.id);

      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((a, r) => a + r.rating, 0) / ratings.length;
        setAvgRating(avg);
        setRatingCount(ratings.length);
      }

      setLoading(false);
    }

    load();
  }, [slug]);

  // Check existing rating
  useEffect(() => {
    if (!game || !fingerprint) return;
    supabase
      .from('ratings')
      .select('rating')
      .eq('game_id', game.id)
      .eq('player_fp', fingerprint)
      .single()
      .then(({ data }) => {
        if (data) setMyRating(data.rating);
      });
  }, [game, fingerprint]);

  // Handle score from iframe
  const handleScore = useCallback(async (score: number) => {
    if (!game || !fingerprint) return;

    setLastScore(score);

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          playerName,
          playerFp: fingerprint,
          score,
        }),
      });

      if (res.ok) {
        // Refresh scores
        const { data } = await supabase
          .from('scores')
          .select('*')
          .eq('game_id', game.id)
          .order('score', { ascending: false })
          .limit(20);
        setScores(data || []);
      }
    } catch {
      // Score submission failed silently
    }
  }, [game, fingerprint, playerName]);

  // Handle rating
  const handleRate = async (rating: number) => {
    if (!game || !fingerprint) return;

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          playerFp: fingerprint,
          rating,
        }),
      });

      if (res.ok) {
        setMyRating(rating);
        // Refresh ratings
        const { data: ratings } = await supabase
          .from('ratings')
          .select('rating')
          .eq('game_id', game.id);
        if (ratings && ratings.length > 0) {
          const avg = ratings.reduce((a, r) => a + r.rating, 0) / ratings.length;
          setAvgRating(avg);
          setRatingCount(ratings.length);
        }
      }
    } catch {
      // Rating failed silently
    }
  };

  const handleNameChange = (name: string) => {
    const trimmed = name.slice(0, 20) || 'ANON';
    setPlayerName(trimmed);
    localStorage.setItem('clawgames_name', trimmed);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-terminal text-sm cursor-blink">Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-danger text-sm mb-4">Game not found</p>
        <Link href="/games" className="text-terminal text-xs hover:text-terminal-bright">
          {'<'} Back to games
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/games" className="text-text-muted text-xs hover:text-terminal transition-colors">
          {'<'} GAMES
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-terminal text-xl font-bold tracking-wider text-glow">{game.title}</h1>
          {game.description && (
            <p className="text-text-secondary text-xs mt-1">{game.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            {game.bot && (
              <Link
                href={`/bots/${game.bot.name}`}
                className="text-[10px] text-text-muted hover:text-terminal transition-colors"
              >
                Built by <span className="text-terminal-dim">{game.bot.name}</span>
              </Link>
            )}
            <span className="text-[10px] text-text-muted">{game.plays} plays</span>
            {game.bot && fingerprint && (
              <TipButton botId={game.bot.id} botName={game.bot.name} playerFp={fingerprint} />
            )}
          </div>
        </div>
        <RatingStars
          currentRating={myRating || avgRating}
          onRate={handleRate}
          totalRatings={ratingCount}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Player */}
        <div className="lg:col-span-2">
          {gameHtml ? (
            <GamePlayer
              gameHtml={gameHtml}
              gameId={game.id}
              onScore={handleScore}
            />
          ) : (
            <div className="bg-surface border border-border rounded p-10 text-center">
              <p className="text-danger text-xs">Failed to load game</p>
            </div>
          )}

          {/* Player name + last score */}
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">PLAYER:</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={20}
                className="bg-transparent border-b border-border text-terminal text-xs px-1 py-0.5 w-32 focus:outline-none focus:border-terminal"
              />
            </div>
            {lastScore !== null && (
              <span className="text-terminal text-xs font-bold">
                LAST SCORE: {lastScore.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ScoreBoard scores={scores} />
        </div>
      </div>
    </div>
  );
}
