// ===========================================
// API ROUTE: /api/chat/[creatorId]/route.ts
// Main chat endpoint with memory integration
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
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('subscriber_id', user.id)
      .eq('creator_id', params.creatorId)
      .single();

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    // Get request body
    const { message, conversationId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get creator's AI personality
    const { data: personality } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', params.creatorId)
      .eq('is_active', true)
      .single();

    if (!personality) {
      return NextResponse.json(
        { error: 'AI personality not configured' },
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

    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

// GET - Retrieve chat history
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

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', params.creatorId)
      .single();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    // Get messages
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    let query = supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages } = await query;

    return NextResponse.json({
      messages: (messages || []).reverse(),
      conversationId: conversation.id,
    });

  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}
