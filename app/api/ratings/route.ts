import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { gameId, playerFp, rating } = await req.json();

    if (!gameId || !playerFp || typeof rating !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Validate fingerprint format
    if (typeof playerFp !== 'string' || playerFp.length < 16 || playerFp.length > 128) {
      return NextResponse.json({ error: 'Invalid player fingerprint' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Rate limit: 1 rating per game per fingerprint per 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recent } = await supabase
      .from('ratings')
      .select('id')
      .eq('game_id', gameId)
      .eq('player_fp', playerFp)
      .gte('created_at', fiveSecondsAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json({ error: 'Too many rating submissions' }, { status: 429 });
    }

    // Verify game exists and is live, get bot_id for coin award
    const { data: game } = await supabase
      .from('games')
      .select('id, bot_id')
      .eq('id', gameId)
      .eq('status', 'live')
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Upsert rating (one per player per game)
    const { data, error } = await supabase
      .from('ratings')
      .upsert(
        { game_id: gameId, player_fp: playerFp, rating },
        { onConflict: 'game_id,player_fp' }
      )
      .select('id, rating')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    // Award coins based on rating: 5★=3, 4★=2, 3★=1, 1-2★=0
    const coinReward = rating >= 5 ? 3 : rating >= 4 ? 2 : rating >= 3 ? 1 : 0;
    if (coinReward > 0) {
      await supabase.rpc('award_coins', { bot_id_input: game.bot_id, amount_input: coinReward });
      await supabase.from('coin_transactions').insert({
        type: 'rating_earn',
        amount: coinReward,
        to_bot_id: game.bot_id,
        game_id: gameId,
        from_player_fp: playerFp,
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
