// ===========================================
// API ROUTE: /api/tips/send
// Send a tip to a creator
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// import { sendTip } from '@/lib/tokens/token-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { creator_id, amount_tokens, thread_id, chat_mode } = body;

    // Validate
    if (!creator_id || !amount_tokens) {
      return NextResponse.json(
        { error: 'creator_id and amount_tokens required' },
        { status: 400 }
      );
    }

    if (amount_tokens < 50) {
      return NextResponse.json(
        { error: 'Minimum tip is 50 tokens', error_message: 'Minimum tip is 50 tokens' },
        { status: 400 }
      );
    }

    if (amount_tokens > 25000) {
      return NextResponse.json(
        { error: 'Maximum tip is 25,000 tokens', error_message: 'Maximum tip is 25,000 tokens' },
        { status: 400 }
      );
    }

    // Can't tip yourself
    if (creator_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot tip yourself', error_message: 'Cannot tip yourself' },
        { status: 400 }
      );
    }

    // Get user's wallet balance
    const { data: wallet } = await supabase
      .from('token_wallets')
      .select('balance_tokens')
      .eq('user_id', user.id)
      .single();

    const balance = wallet?.balance_tokens || 0;

    if (balance < amount_tokens) {
      return NextResponse.json(
        { 
          success: false, 
          error_message: 'Insufficient tokens',
          balance,
          required: amount_tokens,
        },
        { status: 400 }
      );
    }

    // Calculate split (30% platform fee)
    const platformFeePct = 30;
    const platformFeeTokens = Math.floor((amount_tokens * platformFeePct) / 100);
    const creatorShareTokens = amount_tokens - platformFeeTokens;

    // Use a database transaction via RPC
    const { data: result, error: rpcError } = await supabase.rpc('send_tip', {
      p_user_id: user.id,
      p_creator_id: creator_id,
      p_amount_tokens: amount_tokens,
      p_thread_id: thread_id || null,
      p_chat_mode: chat_mode || 'nsfw',
      p_platform_fee_pct: platformFeePct,
      p_platform_fee_tokens: platformFeeTokens,
      p_creator_share_tokens: creatorShareTokens,
    });

    if (rpcError) {
      console.error('Tip RPC error:', rpcError);
      
      // Check if it's an insufficient balance error
      if (rpcError.message?.includes('insufficient')) {
        return NextResponse.json(
          { success: false, error_message: 'Insufficient tokens' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error_message: 'Failed to send tip' },
        { status: 500 }
      );
    }

    // If RPC doesn't exist yet, fall back to manual transaction
    // This is a simplified version - production would use proper transaction
    if (!result) {
      // Deduct from wallet
      const { error: deductError } = await supabase
        .from('token_wallets')
        .update({ 
          balance_tokens: balance - amount_tokens,
          lifetime_spent: (wallet?.lifetime_spent || 0) + amount_tokens,
        })
        .eq('user_id', user.id);

      if (deductError) {
        throw new Error('Failed to deduct tokens');
      }

      // Create tip record
      const { data: tip, error: tipError } = await supabase
        .from('tips')
        .insert({
          user_id: user.id,
          creator_id,
          thread_id,
          chat_mode: chat_mode || 'nsfw',
          amount_tokens,
          amount_gbp_minor: Math.round((amount_tokens / 250) * 100),
          platform_fee_pct: platformFeePct,
          platform_fee_tokens: platformFeeTokens,
          creator_share_tokens: creatorShareTokens,
          status: 'SUCCEEDED',
        })
        .select()
        .single();

      if (tipError) {
        console.error('Tip record error:', tipError);
        // Should rollback wallet change in production
      }

      // Create ledger entry
      await supabase.from('token_ledger').insert({
        user_id: user.id,
        type: 'DEBIT',
        reason: 'TIP',
        amount_tokens,
        balance_after: balance - amount_tokens,
        related_creator_id: creator_id,
        related_thread_id: thread_id,
        related_tip_id: tip?.id,
        description: 'Tip sent',
      });

      // Insert tip event for chat
      if (thread_id) {
        await supabase.from('chat_events').insert({
          thread_id,
          event_type: 'TIP_RECEIVED',
          payload: {
            amount_tokens,
            from_user_id: user.id,
            tip_id: tip?.id,
          },
        });
      }

      return NextResponse.json({
        success: true,
        tip_id: tip?.id,
        new_balance: balance - amount_tokens,
        amount_tokens,
        creator_share_tokens,
      });
    }

    // RPC result
    return NextResponse.json({
      success: result.success,
      tip_id: result.tip_id,
      new_balance: result.new_balance,
      error_message: result.error_message,
    });

  } catch (error: any) {
    console.error('Send tip error:', error);
    return NextResponse.json(
      { success: false, error_message: error.message || 'Failed to send tip' },
      { status: 500 }
    );
  }
}
