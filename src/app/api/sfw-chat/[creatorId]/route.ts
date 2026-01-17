// ===========================================
// API ROUTE: /api/sfw-chat/[creatorId]/route.ts
// SFW Companion Chat - COMPLETELY SEPARATE FROM NSFW
// DO NOT MODIFY NSFW CHAT API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Import SFW-specific services (separate from NSFW)
// import { handleSFWChat, calculateSFWMessageCost } from '@/lib/sfw-chat/sfw-chat-service';
// import { buildSFWSystemPrompt } from '@/lib/sfw-chat/sfw-prompt-builder';

export async function POST(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId } = params;
    const { message, threadId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // 2. Get SFW config (from sfw_ai_personalities table - SEPARATE from NSFW)
    const { data: sfwConfig, error: configError } = await supabase
      .from('sfw_ai_personalities')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('enabled', true)
      .single();

    if (configError || !sfwConfig) {
      return NextResponse.json(
        { error: 'SFW chat not available for this creator' },
        { status: 404 }
      );
    }

    // 3. Check/create SFW thread (from sfw_chat_threads - SEPARATE from NSFW)
    let currentThreadId = threadId;
    
    if (!currentThreadId) {
      // Check for existing thread
      const { data: existingThread } = await supabase
        .from('sfw_chat_threads')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('subscriber_id', user.id)
        .single();

      if (existingThread) {
        currentThreadId = existingThread.id;
      } else {
        // Create new SFW thread
        const { data: newThread, error: threadError } = await supabase
          .from('sfw_chat_threads')
          .insert({
            creator_id: creatorId,
            subscriber_id: user.id,
          })
          .select('id')
          .single();

        if (threadError) throw threadError;
        currentThreadId = newThread.id;
      }
    }

    // 4. Get conversation history (from sfw_chat_messages - SEPARATE, 200 messages for better memory)
    const { data: history } = await supabase
      .from('sfw_chat_messages')
      .select('role, content')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
      .limit(200);

    // 5. Calculate cost (using SFW pricing - SEPARATE from NSFW)
    const isSubscriber = await checkSubscription(supabase, user.id, creatorId);
    let messageCost = 0;
    
    if (sfwConfig.pricing_model === 'per_message') {
      messageCost = isSubscriber ? 0 : sfwConfig.price_per_message;
    }

    // 6. Build SFW system prompt (using SFW prompt builder - SEPARATE)
    // const systemPrompt = buildSFWSystemPrompt(sfwConfig);

    // 7. Call AI with SFW prompt
    // const response = await handleSFWChat({
    //   creatorId,
    //   subscriberId: user.id,
    //   message,
    //   conversationHistory: history || [],
    // }, sfwConfig);

    // PLACEHOLDER RESPONSE (replace with actual AI call)
    const aiReply = `Hey! I'd love to chat more about that 😊 What else is on your mind?`;

    // 8. Save messages to SFW tables
    await supabase.from('sfw_chat_messages').insert([
      {
        thread_id: currentThreadId,
        creator_id: creatorId,
        subscriber_id: user.id,
        role: 'user',
        content: message,
        cost: 0,
      },
      {
        thread_id: currentThreadId,
        creator_id: creatorId,
        subscriber_id: user.id,
        role: 'assistant',
        content: aiReply,
        cost: messageCost,
      },
    ]);

    // 9. Update thread last_message_at
    await supabase
      .from('sfw_chat_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', currentThreadId);

    return NextResponse.json({
      reply: aiReply,
      threadId: currentThreadId,
      cost: messageCost,
      mode: 'sfw', // Indicate this is SFW mode
    });

  } catch (error) {
    console.error('SFW Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

// Helper to check subscription status
async function checkSubscription(
  supabase: any,
  subscriberId: string,
  creatorId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single();

  return !!data;
}

// GET - Get SFW chat history
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

    const { creatorId } = params;

    // Get SFW thread (SEPARATE from NSFW)
    const { data: thread } = await supabase
      .from('sfw_chat_threads')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('subscriber_id', user.id)
      .single();

    if (!thread) {
      return NextResponse.json({ messages: [], threadId: null });
    }

    // Get SFW messages (SEPARATE from NSFW)
    const { data: messages } = await supabase
      .from('sfw_chat_messages')
      .select('role, content, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      messages: messages || [],
      threadId: thread.id,
      mode: 'sfw',
    });

  } catch (error) {
    console.error('Get SFW chat error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
