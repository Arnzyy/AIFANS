// =====================================================
// API: GET /api/chats
// Returns user's active AI model conversations
// =====================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscriptions to creators who have AI models
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        creator_id,
        created_at
      `)
      .eq('subscriber_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ chats: [] });
    }

    // For each subscription, check if they have approved AI models with chat enabled
    const chats = [];

    for (const sub of subscriptions) {
      const creatorId = sub.creator_id;

      // Check if this creator has any approved AI models
      const { data: models } = await supabase
        .from('creator_models')
        .select('id, name, avatar_url, backstory, speaking_style, personality_traits')
        .eq('creator_id', creatorId)
        .eq('status', 'approved');

      if (!models || models.length === 0) continue; // Skip if no approved models

      // For each model, check if there's a conversation
      for (const model of models) {
        // Skip models without AI chat configured
        const hasAiChat = !!(
          model.backstory ||
          model.speaking_style ||
          (model.personality_traits && model.personality_traits.length > 0)
        );
        if (!hasAiChat) continue;

        // Get the conversation for this model
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id, last_message_at, created_at')
          .or(
            `and(participant1_id.eq.${user.id},participant2_id.eq.${model.id}),` +
            `and(participant1_id.eq.${model.id},participant2_id.eq.${user.id})`
          )
          .maybeSingle();

        if (!conversation) continue; // No conversation yet

        // Get the last message
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('content, role, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        chats.push({
          model_id: model.id,
          model_name: model.name,
          username: model.name.toLowerCase().replace(/\s+/g, '_'),
          avatar: model.avatar_url || null,
          last_message: lastMessage ? {
            content: lastMessage.content,
            is_from_user: lastMessage.role === 'user',
            created_at: lastMessage.created_at,
          } : null,
          last_active: conversation.last_message_at || conversation.created_at,
        });
      }
    }

    // Sort by last active (most recent first)
    chats.sort((a, b) => {
      const timeA = new Date(a.last_active).getTime();
      const timeB = new Date(b.last_active).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ chats });

  } catch (error) {
    console.error('[Chats API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
