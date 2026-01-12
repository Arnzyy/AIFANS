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

    // Get creator's personality settings from ai_personalities table
    let personality = null;
    const { data: personalityData } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .single();

    if (personalityData) {
      personality = personalityData;
    }

    // Get fan's preferred name from memory first (they may have told the AI a different name)
    // Fall back to profile display_name if no memory preference
    let fanName: string | undefined;

    // Check memory for preferred name (this is what they told the AI to call them)
    const { data: memory } = await supabase
      .from('user_memory')
      .select('preferred_name')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creatorId)
      .single();

    if (memory?.preferred_name) {
      fanName = memory.preferred_name;
    } else {
      // Fall back to profile display name
      const { data: fanProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      if (fanProfile?.display_name) {
        fanName = fanProfile.display_name;
      }
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
      personality,
      fanName
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
