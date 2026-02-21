// ===========================================
// API ROUTE: /api/chat/[creatorId]/welcome-back
// Returns welcome message if user has been away
// Enhanced with memory context for AI generation
// ===========================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWelcomeBackMessage } from '@/lib/ai/welcome-back';
import { updateConversationState } from '@/lib/ai/conversation-state';
import { getRelationshipStage, getMemoryLimitByStage } from '@/lib/ai/relationship-stage';

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

    // Get relationship stage and fetch memories for AI generation
    const relationshipStage = await getRelationshipStage(supabase, user.id, creatorId);
    const memoryLimit = getMemoryLimitByStage(relationshipStage);

    // Fetch top memories for welcome-back context
    const { data: memoriesData } = await supabase
      .from('user_memories_v2')
      .select('*')
      .eq('user_id', user.id)
      .eq('persona_id', creatorId)
      .order('emotional_weight', { ascending: false })
      .limit(memoryLimit);

    // Map to UserMemory format
    const memories = (memoriesData || []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      personaId: m.persona_id,
      category: m.category,
      fact: m.fact,
      confidence: m.confidence,
      emotionalWeight: m.emotional_weight ?? 5,
      source: m.source,
      recency: m.recency,
      lastMentioned: new Date(m.last_mentioned),
      mentionCount: m.mention_count,
      createdAt: new Date(m.created_at),
      updatedAt: new Date(m.updated_at),
    }));

    // Check for welcome back message (with memories for AI generation)
    const result = await getWelcomeBackMessage(
      supabase,
      user.id,
      creatorId,
      personality,
      memories
    );

    console.log('[welcome-back] Check result:', {
      userId: user.id,
      creatorId,
      shouldSend: result.shouldSendWelcome,
      hours: result.hoursSinceLastMessage,
      gap: result.gapDescription,
      stage: result.relationshipStage,
      aiGenerated: result.wasAiGenerated,
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
      hours: result.hoursSinceLastMessage,
      stage: result.relationshipStage,
      aiGenerated: result.wasAiGenerated,
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
