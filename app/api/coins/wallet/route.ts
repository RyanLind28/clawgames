import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Get player's daily tip balance
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerFp = searchParams.get('playerFp');

  if (!playerFp || playerFp.length < 16) {
    return NextResponse.json({ error: 'Missing playerFp' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: wallet } = await supabase.rpc('get_player_wallet', { fp_input: playerFp });
  const remaining = wallet?.[0]?.coins_remaining ?? 50;

  return NextResponse.json({
    coins_remaining: remaining,
    daily_allowance: 50,
  });
}
