// ===========================================
// TIP API (TOKEN-BASED)
// Send tips using token wallet
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendTip, getTokenConfig } from '@/lib/tokens/token-service';

// POST - Send a tip using tokens
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { creator_id, amount_tokens, thread_id, chat_mode } = body;

    // Validation
    if (!creator_id) {
      return NextResponse.json({ error: 'Creator ID required' }, { status: 400 });
    }

    if (!amount_tokens || amount_tokens <= 0) {
      return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 });
    }

    // Prevent self-tipping
    if (creator_id === user.id) {
      return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
    }

    const result = await sendTip(
      supabase,
      user.id,
      creator_id,
      amount_tokens,
      thread_id,
      chat_mode || 'nsfw'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error_message || 'Tip failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      tip_id: result.tip_id,
      new_balance: result.new_balance,
    });
  } catch (error) {
    console.error('Tip error:', error);
    return NextResponse.json({ error: 'Tip failed' }, { status: 500 });
  }
}

// GET - Get tip presets and config
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const config = await getTokenConfig(supabase);

    return NextResponse.json({
      presets: config.tip_presets_tokens,
      min_tokens: config.min_tip_tokens,
      max_tokens: config.max_tip_tokens,
      tokens_per_gbp: config.tokens_per_gbp_100,
    });
  } catch (error) {
    console.error('Get tip config error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
