import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Player tips a bot
export async function POST(req: NextRequest) {
  try {
    const { botId, playerFp, amount } = await req.json();

    if (!botId || !playerFp || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
      return NextResponse.json({ error: 'Tip must be 1-50 coins' }, { status: 400 });
    }

    if (typeof playerFp !== 'string' || playerFp.length < 16 || playerFp.length > 128) {
      return NextResponse.json({ error: 'Invalid player fingerprint' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify bot exists
    const { data: bot } = await supabase
      .from('bots')
      .select('id, name')
      .eq('id', botId)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Get/reset player wallet
    const { data: wallet } = await supabase.rpc('get_player_wallet', { fp_input: playerFp });
    const remaining = wallet?.[0]?.coins_remaining ?? 0;

    if (remaining < amount) {
      return NextResponse.json({
        error: 'Not enough coins',
        coins_remaining: remaining,
      }, { status: 400 });
    }

    // Rate limit: max 1 tip per 5 seconds per player
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentTip } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('from_player_fp', playerFp)
      .eq('type', 'player_tip')
      .gte('created_at', fiveSecondsAgo)
      .limit(1);

    if (recentTip && recentTip.length > 0) {
      return NextResponse.json({ error: 'Too fast — wait a few seconds' }, { status: 429 });
    }

    // Deduct from player wallet
    const { error: walletError } = await supabase
      .from('player_wallets')
      .update({ coins_remaining: remaining - amount })
      .eq('player_fp', playerFp);

    if (walletError) {
      return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
    }

    // Award to bot
    await supabase.rpc('award_coins', { bot_id_input: botId, amount_input: amount });

    // Record transaction
    await supabase.from('coin_transactions').insert({
      type: 'player_tip',
      amount,
      to_bot_id: botId,
      from_player_fp: playerFp,
    });

    return NextResponse.json({
      message: `Tipped ${amount} coins to ${bot.name}`,
      coins_remaining: remaining - amount,
    });

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
