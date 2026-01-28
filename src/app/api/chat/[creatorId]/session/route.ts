// ===========================================
// API ROUTE: /api/chat/[creatorId]/session/route.ts
// Purchase paid chat session with tokens
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  purchaseChatSession,
  checkChatAccess,
  getSessionPack,
  CHAT_CONFIG,
} from '@/lib/chat';

interface RouteParams {
  params: Promise<{ creatorId: string }>;
}

/**
 * POST /api/chat/[creatorId]/session
 *
 * Purchase a paid chat session using tokens.
 * This allows non-subscribers to chat by buying message packs.
 *
 * Body:
 * - messages: Number of messages to purchase (must match a pack)
 * - modelId: Optional specific model to chat with
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
    const { messages, modelId } = body;

    // Validate message count matches a pack
    const pack = getSessionPack(messages);
    if (!pack) {
      const validPacks = CHAT_CONFIG.session_message_packs
        .map(p => p.messages)
        .join(', ');
      return NextResponse.json(
        { error: `Invalid message count. Valid options: ${validPacks}` },
        { status: 400 }
      );
    }

    // Check if user already has subscription (shouldn't need to buy session)
    const currentAccess = await checkChatAccess(supabase, user.id, creatorId);
    if (currentAccess.accessType === 'subscription' && currentAccess.canSendMessage) {
      return NextResponse.json(
        { error: 'You already have an active subscription with messages remaining' },
        { status: 400 }
      );
    }

    // creatorId might be a model ID, creator ID, or profile ID
    // We need to verify the entity exists and resolve to proper IDs
    let resolvedCreatorId = creatorId;
    let resolvedModelId = modelId;

    // First check if creatorId is actually a model ID
    const { data: modelFromId } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .eq('id', creatorId)
      .maybeSingle();

    if (modelFromId) {
      // creatorId is a model ID - use it as the model and get the actual creator
      resolvedModelId = modelFromId.id;
      resolvedCreatorId = modelFromId.creator_id;
    }

    // Verify creator exists
    const { data: creator } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', resolvedCreatorId)
      .maybeSingle();

    if (!creator) {
      // Maybe creatorId is a profile ID? Check if user has a creator account
      const { data: creatorByUserId } = await supabase
        .from('creators')
        .select('id, user_id')
        .eq('user_id', creatorId)
        .maybeSingle();

      if (!creatorByUserId) {
        return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
      }
      resolvedCreatorId = creatorByUserId.id;
    }

    // If modelId was provided separately, verify it belongs to this creator
    if (modelId && modelId !== resolvedModelId) {
      const { data: model } = await supabase
        .from('creator_models')
        .select('id, creator_id')
        .eq('id', modelId)
        .maybeSingle();

      if (!model || model.creator_id !== resolvedCreatorId) {
        return NextResponse.json(
          { error: 'Model not found or does not belong to this creator' },
          { status: 400 }
        );
      }
      resolvedModelId = modelId;
    }

    // Purchase the session
    // Use original creatorId for storage (ensures consistent lookup in checkPaidSessionAccess)
    // Pass resolvedModelId so the session knows which model this is for
    const result = await purchaseChatSession(
      supabase,
      user.id,
      creatorId, // Keep original ID for session lookup consistency
      pack.messages,
      pack.tokens,
      resolvedModelId || undefined
    );

    if (!result.success) {
      // Check if it's a balance issue
      if (result.error_message?.includes('Insufficient')) {
        return NextResponse.json(
          {
            error: 'Insufficient token balance',
            required: pack.tokens,
            message: result.error_message,
          },
          { status: 402 } // Payment Required
        );
      }

      return NextResponse.json(
        { error: result.error_message || 'Failed to purchase session' },
        { status: 500 }
      );
    }

    // Get updated access
    const newAccess = await checkChatAccess(supabase, user.id, creatorId);

    return NextResponse.json({
      success: true,
      session_id: result.session_id,
      messages_purchased: pack.messages,
      tokens_spent: pack.tokens,
      new_balance: result.new_balance,
      access: newAccess,
    });
  } catch (error) {
    console.error('Purchase session error:', error);
    return NextResponse.json(
      { error: 'Failed to purchase session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/[creatorId]/session
 *
 * Get current session status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active session
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .maybeSingle();

    if (!session) {
      return NextResponse.json({
        hasSession: false,
        availablePacks: CHAT_CONFIG.session_message_packs,
      });
    }

    return NextResponse.json({
      hasSession: true,
      session: {
        id: session.id,
        messages_purchased: session.messages_purchased,
        messages_remaining: session.messages_remaining,
        created_at: session.created_at,
        last_message_at: session.last_message_at,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
