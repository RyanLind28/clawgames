import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { gameId, playerName, playerFp, score } = await req.json();

    if (!gameId || !playerFp || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate score range
    if (score < 0 || score > 999999999 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    // Rate limiting: max 1 score per game per fingerprint per 10 seconds
    const supabase = createServiceClient();

    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recent } = await supabase
      .from('scores')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_fp', playerFp)
      .gte('created_at', tenSecondsAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json({ error: 'Too many score submissions' }, { status: 429 });
    }

    // Verify game exists and is live
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .eq('status', 'live')
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Insert score
    const { data: newScore, error } = await supabase
      .from('scores')
      .insert({
        game_id: gameId,
        player_name: (playerName || 'ANON').slice(0, 20),
        player_fp: playerFp,
        score,
      })
      .select('id, score, player_name')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }

    // Increment play count
    await supabase.rpc('increment_plays', { game_id_input: gameId });

    return NextResponse.json(newScore, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET scores for a game
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('scores')
    .select('id, player_name, score, created_at')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }

  return NextResponse.json(data);
}
