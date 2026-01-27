// ===========================================
// API ROUTE: /api/chat/[creatorId]/welcome-back
// Returns welcome message if user has been away
// ===========================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWelcomeBackMessage } from '@/lib/ai/welcome-back';
import { updateConversationState } from '@/lib/ai/conversation-state';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get personality
    const { data: personality } = await supabase
      .from('ai_personalities')
      .select('persona_name, personality_traits, emoji_usage, when_complimented')
      .or(`model_id.eq.${creatorId},creator_id.eq.${creatorId}`)
      .single();

    if (!personality) {
      return NextResponse.json({
        shouldShow: false,
        message: null,
        reason: 'no personality found'
      });
    }

    // Check for welcome back message
    const result = await getWelcomeBackMessage(
      supabase,
      user.id,
      creatorId,
      personality
    );

    console.log('[welcome-back] Check result:', {
      userId: user.id,
      modelId: creatorId,
      shouldSend: result.shouldSendWelcome,
      hours: result.hoursSinceLastMessage,
      gap: result.gapDescription,
    });

    if (!result.shouldSendWelcome || !result.message) {
      return NextResponse.json({
        shouldShow: false,
        message: null,
        gap: result.gapDescription,
        hours: result.hoursSinceLastMessage
      });
    }

    // Find or create conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
        `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
      )
      .maybeSingle();

    let convId = conversation?.id;

    // Create conversation if doesn't exist
    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: creatorId,
        })
        .select('id')
        .single();
      convId = newConv?.id;
    }

    if (!convId) {
      return NextResponse.json({
        shouldShow: false,
        message: null,
        reason: 'no conversation'
      });
    }

    // Save welcome message to chat history
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: convId,
        creator_id: creatorId,
        subscriber_id: user.id,
        role: 'assistant',
        content: result.message,
      });

    if (insertError) {
      console.error('[welcome-back] Failed to save message:', insertError);
      // Still return the message even if save failed
    }

    // Update conversation state (non-blocking)
    updateConversationState(supabase, user.id, creatorId, {
      incrementMessageCount: true,
    }).catch(err => console.error('[welcome-back] State update error:', err));

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId);

    return NextResponse.json({
      shouldShow: true,
      message: result.message,
      gap: result.gapDescription,
      hours: result.hoursSinceLastMessage
    });

  } catch (error) {
    console.error('[welcome-back] Error:', error);
    return NextResponse.json({
      shouldShow: false,
      message: null,
      error: 'Internal error'
    });
  }
}
