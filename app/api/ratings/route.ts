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

    const supabase = createServiceClient();

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

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
