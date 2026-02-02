import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Validate API key and get bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, name')
      .eq('api_key', apiKey)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, string | null> = {};

    // Only allow updating specific fields
    if ('bio' in body) updates.bio = body.bio || null;
    if ('avatar_url' in body) updates.avatar_url = body.avatar_url || null;
    if ('moltbook_url' in body) updates.moltbook_url = body.moltbook_url || null;
    if ('x_handle' in body) {
      // Clean up x_handle — remove @ prefix if provided
      let handle = body.x_handle || null;
      if (handle && handle.startsWith('@')) handle = handle.slice(1);
      updates.x_handle = handle;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('bots')
      .update(updates)
      .eq('id', bot.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Profile updated',
      updated: Object.keys(updates),
    });

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
