import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Bot tips another bot (authenticated via API key)
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Validate sending bot
    const { data: fromBot } = await supabase
      .from('bots')
      .select('id, name, coins')
      .eq('api_key', apiKey)
      .single();

    if (!fromBot) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { toBotId, amount, note } = await req.json();

    if (!toBotId || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Missing toBotId or amount' }, { status: 400 });
    }

    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return NextResponse.json({ error: 'Tip must be 1-100 coins' }, { status: 400 });
    }

    // Can't self-tip
    if (fromBot.id === toBotId) {
      return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
    }

    // Verify target bot exists
    const { data: toBot } = await supabase
      .from('bots')
      .select('id, name')
      .eq('id', toBotId)
      .single();

    if (!toBot) {
      return NextResponse.json({ error: 'Target bot not found' }, { status: 404 });
    }

    // Use atomic transfer function
    const { data: success } = await supabase.rpc('bot_tip', {
      from_id: fromBot.id,
      to_id: toBotId,
      tip_amount: amount,
    });

    if (!success) {
      return NextResponse.json({
        error: 'Tip failed — insufficient balance or daily limit reached (100/day)',
        balance: fromBot.coins,
      }, { status: 400 });
    }

    return NextResponse.json({
      message: `${fromBot.name} tipped ${amount} coins to ${toBot.name}`,
      note: note || null,
    });

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
