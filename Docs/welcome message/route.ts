// ===========================================
// API ROUTE: /api/chat/[creatorId]/welcome-back
// Returns welcome message if user has been away
// ===========================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWelcomeBackMessage } from '@/lib/ai/welcome-back';
import { updateConversationState } from '@/lib/ai/conversation-state';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const supabase = await createClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get model from creator
    const { data: model } = await supabase
      .from('creator_models')
      .select('id')
      .eq('id', creatorId)
      .single();
    
    const modelId = model?.id || creatorId;
    
    // Get personality
    const { data: personality } = await supabase
      .from('ai_personalities')
      .select('persona_name, personality_traits, emoji_usage, when_complimented')
      .eq('model_id', modelId)
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
      modelId,
      personality
    );
    
    console.log('[welcome-back] Check result:', {
      userId: user.id,
      modelId,
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
    
    // Save welcome message to chat history
    const { error: insertError } = await supabase
      .from('ai_chat_messages')
      .insert({
        user_id: user.id,
        model_id: modelId,
        role: 'assistant',
        content: result.message,
        metadata: { is_welcome_back: true }
      });
    
    if (insertError) {
      console.error('[welcome-back] Failed to save message:', insertError);
      // Still return the message even if save failed
    }
    
    // Update conversation state (non-blocking)
    updateConversationState(supabase, user.id, modelId, {
      incrementMessageCount: true,
    }).catch(err => console.error('[welcome-back] State update error:', err));
    
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
