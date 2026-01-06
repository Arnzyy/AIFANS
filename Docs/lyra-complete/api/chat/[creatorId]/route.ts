// ===========================================
// API ROUTE: /api/chat/[creatorId]/route.ts
// Main chat endpoint
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateChatResponse } from '@/lib/ai/chat-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription + chat access
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, chat_enabled, messages_remaining')
      .eq('subscriber_id', user.id)
      .eq('creator_id', params.creatorId)
      .single();

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    if (!subscription.chat_enabled) {
      return NextResponse.json(
        { error: 'Chat add-on required', upgrade_url: `/subscribe/${params.creatorId}/chat` },
        { status: 402 }
      );
    }

    // Check message limit (if using daily limits)
    if (subscription.messages_remaining !== null && subscription.messages_remaining <= 0) {
      return NextResponse.json(
        { error: 'Daily message limit reached', buy_more_url: `/messages/buy` },
        { status: 429 }
      );
    }

    // Get message
    const { message, conversationId } = await request.json();

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Get AI personality
    const { data: personality } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', params.creatorId)
      .eq('is_active', true)
      .single();

    if (!personality) {
      return NextResponse.json(
        { error: 'AI not configured for this creator' },
        { status: 404 }
      );
    }

    // Generate response
    const result = await generateChatResponse(
      supabase,
      {
        subscriberId: user.id,
        creatorId: params.creatorId,
        message,
        conversationId,
      },
      personality
    );

    // Decrement message count if using limits
    if (subscription.messages_remaining !== null) {
      await supabase
        .from('subscriptions')
        .update({ messages_remaining: subscription.messages_remaining - 1 })
        .eq('subscriber_id', user.id)
        .eq('creator_id', params.creatorId);
    }

    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId,
      messages_remaining: subscription.messages_remaining ? subscription.messages_remaining - 1 : null,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

// GET - Chat history
export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', params.creatorId)
      .single();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    return NextResponse.json({
      messages: (messages || []).reverse(),
      conversationId: conversation.id,
    });

  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
