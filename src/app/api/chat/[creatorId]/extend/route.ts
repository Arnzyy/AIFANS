// ===========================================
// API ROUTE: /api/chat/[creatorId]/extend/route.ts
// Extend chat with additional messages
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  extendMessages,
  checkChatAccess,
  calculateExtensionCost,
  formatTokensAsGbp,
  CHAT_CONFIG,
} from '@/lib/chat';

interface RouteParams {
  params: Promise<{ creatorId: string }>;
}

/**
 * POST /api/chat/[creatorId]/extend
 *
 * Purchase additional messages with tokens.
 * Works for both:
 * - Subscribers who've hit their monthly limit
 * - Paid session users who want more messages
 *
 * Body:
 * - messages: Number of additional messages to buy
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();

    // Auth required
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body;

    // Validate message count
    if (!messages || typeof messages !== 'number' || messages < 1) {
      return NextResponse.json(
        { error: 'Invalid message count' },
        { status: 400 }
      );
    }

    // Enforce maximum
    if (messages > CHAT_CONFIG.max_session_messages) {
      return NextResponse.json(
        { error: `Maximum ${CHAT_CONFIG.max_session_messages} messages per extension` },
        { status: 400 }
      );
    }

    // Check current access - must have existing session or subscription
    const currentAccess = await checkChatAccess(supabase, user.id, creatorId);
    if (currentAccess.accessType === 'none' || currentAccess.accessType === 'preview') {
      return NextResponse.json(
        { error: 'No active subscription or session to extend. Purchase a session first.' },
        { status: 400 }
      );
    }

    // Calculate cost
    const cost = calculateExtensionCost(messages);

    // Extend the session/subscription
    const result = await extendMessages(supabase, user.id, creatorId, messages);

    if (!result.success) {
      // Check if it's a balance issue
      if (result.error_message?.includes('Insufficient')) {
        return NextResponse.json(
          {
            error: 'Insufficient token balance',
            required: cost,
            message: result.error_message,
          },
          { status: 402 } // Payment Required
        );
      }

      return NextResponse.json(
        { error: result.error_message || 'Failed to extend messages' },
        { status: 500 }
      );
    }

    // Get updated access
    const newAccess = await checkChatAccess(supabase, user.id, creatorId);

    return NextResponse.json({
      success: true,
      messages_added: messages,
      tokens_spent: cost,
      new_remaining: result.new_remaining,
      new_balance: result.new_balance,
      access: newAccess,
    });
  } catch (error) {
    console.error('Extend messages error:', error);
    return NextResponse.json(
      { error: 'Failed to extend messages' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/[creatorId]/extend
 *
 * Get extension pricing info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { creatorId: _creatorId } = await params;

    // Return pricing tiers
    const commonExtensions = [5, 10, 25, 50];
    const pricing = commonExtensions.map(messages => ({
      messages,
      tokens: calculateExtensionCost(messages),
      price: formatTokensAsGbp(calculateExtensionCost(messages)),
    }));

    return NextResponse.json({
      per_message_cost: CHAT_CONFIG.extra_message_cost_tokens,
      per_message_price: formatTokensAsGbp(CHAT_CONFIG.extra_message_cost_tokens),
      common_options: pricing,
      max_messages: CHAT_CONFIG.max_session_messages,
    });
  } catch (error) {
    console.error('Get extension pricing error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
