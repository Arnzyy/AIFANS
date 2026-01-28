// ===========================================
// API ROUTE: /api/chat/[creatorId]/start/route.ts
// Initialize chat and get opening message
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  checkChatAccess,
  generateOpeningMessage,
  CHAT_CONFIG,
} from '@/lib/chat';

interface RouteParams {
  params: Promise<{ creatorId: string }>;
}

/**
 * GET /api/chat/[creatorId]/start
 *
 * Initialize a chat session and get the opening message.
 * This endpoint:
 * - Always returns an opening message (even for non-subscribers)
 * - Returns the user's current access status
 * - Creates/retrieves conversation ID if user is logged in
 *
 * Query params:
 * - modelId: Optional specific model to chat with
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId') || undefined;

    // Get user (may be null for guests)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get creator/model info for opening message
    const { data: model } = modelId
      ? await supabase
          .from('creator_models')
          .select('id, name, creator_id')
          .eq('id', modelId)
          .maybeSingle()
      : { data: null };

    // If modelId provided, verify it belongs to this creator
    if (modelId && model && model.creator_id !== creatorId) {
      return NextResponse.json(
        { error: 'Model does not belong to this creator' },
        { status: 400 }
      );
    }

    // Check chat access
    const access = await checkChatAccess(supabase, user?.id || null, creatorId);

    // Get user's subscription status for opening message context
    let isSubscribed = access.accessType === 'subscription';
    let isReturning = false;
    let userName: string | undefined;

    if (user) {
      // Check if returning user (has previous conversation)
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
            `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
        )
        .limit(1)
        .maybeSingle();

      isReturning = !!existingConversation && isSubscribed;

      // Get user's display name if subscribed (for personalized message)
      if (isSubscribed) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle();

        userName = profile?.display_name || profile?.username;
      }
    }

    // Generate opening message
    // Per spec: Always show opening message, even to logged out users
    let openingMessage;
    if (CHAT_CONFIG.allow_guest_opening_message || user) {
      const messageResult = await generateOpeningMessage(supabase, {
        creatorId,
        modelId,
        userId: user?.id,
        isSubscribed,
        isReturning,
        modelName: model?.name,
        userName,
      });

      openingMessage = {
        content: messageResult.content,
        type: messageResult.type,
        role: 'assistant' as const,
      };
    }

    // Get or create conversation ID if user has access
    let conversationId: string | undefined;
    if (user && access.hasAccess) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
            `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (conversation) {
        conversationId = conversation.id;
      } else {
        // Create new conversation
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: creatorId,
          })
          .select('id')
          .single();

        conversationId = newConversation?.id;
      }
    }

    // Get user's token balance if logged in
    let tokenBalance: number | undefined;
    if (user) {
      const { data: wallet } = await supabase
        .from('token_wallets')
        .select('balance_tokens')
        .eq('user_id', user.id)
        .maybeSingle();

      tokenBalance = wallet?.balance_tokens ?? 0;
    }

    return NextResponse.json({
      openingMessage,
      access,
      conversationId,
      tokenBalance,
      modelId: model?.id,
      modelName: model?.name,
    });
  } catch (error) {
    console.error('Start chat error:', error);
    return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 });
  }
}
