import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const operatorSecret = req.headers.get('x-operator-secret');
    if (operatorSecret !== process.env.OPERATOR_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId, action } = await req.json();

    if (!gameId || !action) {
      return NextResponse.json({ error: 'Missing gameId or action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const updates = action === 'approve'
      ? { status: 'live', approved_at: new Date().toISOString() }
      : { status: 'rejected' };

    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId)
      .select('id, slug, title, status')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
