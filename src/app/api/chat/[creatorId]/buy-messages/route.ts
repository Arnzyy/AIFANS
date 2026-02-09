// =====================================================
// API: Purchase Extra Messages with Tokens
// POST /api/chat/[creatorId]/buy-messages
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getPersonality, getCreatorWithPersonality } from '@/lib/cache/creator-cache';

const MESSAGE_PACKS = [
  { messages: 10, tokens: 100, label: '10 messages' },
  { messages: 50, tokens: 450, label: '50 messages (10% off)' },
  { messages: 100, tokens: 800, label: '100 messages (20% off)' },
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const { messages } = await request.json();

    const supabase = await createServerClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get real creator_id from personality (creatorId from URL may be model_id)
    let realCreatorId = creatorId;
    const cachedPersonality = await getPersonality(supabase, creatorId);
    if (cachedPersonality?.data?.creator_id) {
      realCreatorId = cachedPersonality.data.creator_id;
    } else {
      // Fallback: check creator_models
      const { creator } = await getCreatorWithPersonality(supabase, creatorId);
      if (creator?.creator_id) {
        realCreatorId = creator.creator_id;
      }
    }

    // Validate message pack
    const pack = MESSAGE_PACKS.find(p => p.messages === messages);
    if (!pack) {
      return NextResponse.json({ error: 'Invalid message pack' }, { status: 400 });
    }

    // Get user's token balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < pack.tokens) {
      return NextResponse.json({
        error: 'Insufficient tokens',
        required: pack.tokens,
        balance: wallet?.balance || 0,
      }, { status: 400 });
    }

    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"

    // Start transaction - use realCreatorId for proper FK relationship
    const { data: usage, error: usageError } = await supabase
      .from('monthly_message_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('creator_id', realCreatorId)
      .eq('month', currentMonth)
      .maybeSingle();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage:', usageError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Update or create usage record
    if (usage) {
      // Add purchased messages to existing record
      const { error: updateError } = await supabase
        .from('monthly_message_usage')
        .update({
          messages_purchased: (usage.messages_purchased || 0) + pack.messages,
        })
        .eq('id', usage.id);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    } else {
      // Create new record with purchased messages
      const { error: insertError } = await supabase
        .from('monthly_message_usage')
        .insert({
          user_id: user.id,
          creator_id: realCreatorId,
          month: currentMonth,
          messages_used: 0,
          messages_included: 100, // Default subscription amount (£9.99/month)
          messages_purchased: pack.messages,
        });

      if (insertError) {
        console.error('Error creating usage:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    // Deduct tokens from wallet
    const { data: updatedWallet, error: walletError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - pack.tokens })
      .eq('user_id', user.id)
      .select('balance')
      .single();

    if (walletError) {
      console.error('Error updating wallet:', walletError);
      return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
    }

    // Log transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        type: 'chat_messages_purchase',
        amount: -pack.tokens,
        description: `Purchased ${pack.messages} extra chat messages`,
        metadata: {
          creator_id: creatorId,
          messages_purchased: pack.messages,
          month: currentMonth,
        },
      });

    // Calculate new totals
    const updatedUsage = usage
      ? {
          ...usage,
          messages_purchased: (usage.messages_purchased || 0) + pack.messages,
        }
      : {
          messages_used: 0,
          messages_included: 100,
          messages_purchased: pack.messages,
        };

    const totalMessages = updatedUsage.messages_included + updatedUsage.messages_purchased;
    const messagesRemaining = totalMessages - updatedUsage.messages_used;

    return NextResponse.json({
      success: true,
      messages_purchased: pack.messages,
      tokens_spent: pack.tokens,
      new_balance: updatedWallet.balance,
      message_usage: {
        messages_used: updatedUsage.messages_used,
        messages_included: updatedUsage.messages_included,
        messages_purchased: updatedUsage.messages_purchased,
        messages_remaining: messagesRemaining,
        is_low: messagesRemaining <= 20 && messagesRemaining > 0,
        is_depleted: messagesRemaining === 0,
      },
    });

  } catch (error) {
    console.error('Buy messages error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET endpoint to fetch available packs
export async function GET() {
  return NextResponse.json({
    packs: MESSAGE_PACKS,
  });
}
