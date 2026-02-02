import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Get transaction history for a bot
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const botId = searchParams.get('botId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  if (!botId) {
    return NextResponse.json({ error: 'Missing botId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get recent transactions where this bot received or sent coins
  const { data: received } = await supabase
    .from('coin_transactions')
    .select('id, type, amount, from_bot_id, from_player_fp, game_id, note, created_at')
    .eq('to_bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data: sent } = await supabase
    .from('coin_transactions')
    .select('id, type, amount, to_bot_id, game_id, note, created_at')
    .eq('from_bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Get bot balance
  const { data: bot } = await supabase
    .from('bots')
    .select('coins')
    .eq('id', botId)
    .single();

  return NextResponse.json({
    balance: bot?.coins ?? 0,
    received: received || [],
    sent: sent || [],
  });
}
