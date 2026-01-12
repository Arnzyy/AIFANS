// ===========================================
// API ROUTE: /api/chat/[creatorId]/tip-ack
// Generates AI tip acknowledgement with personality
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateTipAcknowledgement } from '@/lib/ai/chat-service';

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

    const { tipAmount, conversationId, creatorName } = await request.json();

    if (!tipAmount || !creatorName) {
      return NextResponse.json({ error: 'Missing tipAmount or creatorName' }, { status: 400 });
    }

    // Get creator's personality settings
    let personality = null;
    const { data: model } = await supabase
      .from('creator_models')
      .select('ai_personality')
      .eq('id', creatorId)
      .single();

    if (model?.ai_personality) {
      personality = model.ai_personality;
    }

    // Get recent messages for context (if conversationId provided)
    let recentMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (conversationId) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (messages) {
        recentMessages = messages.reverse().map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    }

    // Generate AI acknowledgement
    const acknowledgement = await generateTipAcknowledgement(
      creatorName,
      tipAmount,
      recentMessages,
      personality
    );

    // Save the acknowledgement to the conversation
    if (conversationId && acknowledgement) {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        creator_id: creatorId,
        subscriber_id: user.id,
        role: 'assistant',
        content: acknowledgement,
      });

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return NextResponse.json({ acknowledgement });
  } catch (error) {
    console.error('Tip acknowledgement error:', error);
    return NextResponse.json({ error: 'Failed to generate acknowledgement' }, { status: 500 });
  }
}
