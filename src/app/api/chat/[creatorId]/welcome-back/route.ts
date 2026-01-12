// ===========================================
// API ROUTE: /api/chat/[creatorId]/welcome-back
// Generates a contextual welcome back message for returning users
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateWelcomeBackMessage } from '@/lib/ai/chat-service';

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

    const { conversationId, creatorName } = await request.json();

    if (!conversationId || !creatorName) {
      return NextResponse.json({ error: 'Missing conversationId or creatorName' }, { status: 400 });
    }

    // Get recent messages from this conversation
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ welcomeMessage: '' });
    }

    const lastMessage = messages[0];
    const lastMessageTime = new Date(lastMessage.created_at).getTime();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    // Don't generate welcome back if:
    // 1. Conversation is still active (last message < 1 hour ago)
    // 2. Last message was from AI (they haven't replied yet - don't spam welcomes)
    if (lastMessageTime > oneHourAgo) {
      return NextResponse.json({ welcomeMessage: '' });
    }

    if (lastMessage.role === 'assistant') {
      // AI already sent the last message - user hasn't replied
      // Don't keep sending welcome messages, wait for user to respond
      return NextResponse.json({ welcomeMessage: '' });
    }

    // Format messages for the AI (reverse to chronological order)
    const formattedMessages = messages.reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Generate welcome back message
    const welcomeMessage = await generateWelcomeBackMessage(
      creatorName,
      formattedMessages,
      'short'
    );

    // Save the welcome back message to the conversation
    if (welcomeMessage) {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        creator_id: creatorId,
        subscriber_id: user.id,
        role: 'assistant',
        content: welcomeMessage,
      });

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return NextResponse.json({ welcomeMessage });
  } catch (error) {
    console.error('Welcome back message error:', error);
    return NextResponse.json({ error: 'Failed to generate welcome message' }, { status: 500 });
  }
}
