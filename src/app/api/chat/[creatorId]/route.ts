// ===========================================
// API ROUTE: /api/chat/[creatorId]/route.ts
// Main chat endpoint with LYRA compliance
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateChatResponse } from '@/lib/ai/chat-service';
import { checkChatAccess, decrementMessage, isLowMessages } from '@/lib/chat';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();

    // Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check chat access (subscription OR paid session)
    const access = await checkChatAccess(supabase, user.id, creatorId);

    if (!access.hasAccess || !access.canSendMessage) {
      return NextResponse.json(
        {
          error: 'Chat access required',
          access,
          unlockOptions: access.unlockOptions,
        },
        { status: 403 }
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
      .eq('creator_id', creatorId)
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
      supabase as any,
      {
        subscriberId: user.id,
        creatorId: creatorId,
        message,
        conversationId,
      },
      personality
    );

    // Log compliance issues if any
    if (result.compliance_issues && result.compliance_issues.length > 0) {
      console.warn('Compliance issues detected:', result.compliance_issues);
    }

    // Decrement message count after successful response
    const decrementResult = await decrementMessage(
      supabase,
      user.id,
      creatorId,
      access.accessType
    );

    // Get updated access state
    const updatedAccess = await checkChatAccess(supabase, user.id, creatorId);

    // Build response with access info
    const response: Record<string, unknown> = {
      response: result.response,
      conversationId: result.conversationId,
      passed_compliance: result.passed_compliance,
      access: {
        messagesRemaining: updatedAccess.messagesRemaining,
        canSendMessage: updatedAccess.canSendMessage,
        isLowMessages: updatedAccess.isLowMessages,
        warningMessage: updatedAccess.warningMessage,
        accessType: updatedAccess.accessType,
      },
    };

    // Add warning if messages are low
    if (updatedAccess.isLowMessages && updatedAccess.messagesRemaining !== null) {
      response.messageWarning = updatedAccess.warningMessage;
    }

    // If messages exhausted, include unlock options
    if (!updatedAccess.canSendMessage) {
      response.unlockOptions = updatedAccess.unlockOptions;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

// GET - Chat history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
          `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
      )
      .single();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Try chat_messages first (new schema)
    let { data: messages } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If no chat_messages, try messages table (old schema)
    if (!messages || messages.length === 0) {
      const { data: oldMessages } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      messages = oldMessages;
    }

    // Format messages for frontend
    const formattedMessages = (messages || []).reverse().map((m: any) => ({
      id: m.id,
      role: m.sender_id === user.id ? 'user' : 'assistant',
      content: m.content,
      created_at: m.created_at,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
