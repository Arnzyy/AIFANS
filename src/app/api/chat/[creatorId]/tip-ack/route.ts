// ===========================================
// API ROUTE: /api/chat/[creatorId]/tip-ack
// Generates IMMEDIATE AI response when user sends a tip
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getPersonality, getCreatorWithPersonality } from '@/lib/cache/creator-cache';
import { TIP_ACKNOWLEDGEMENT_PROMPT } from '@/lib/tokens/tip-acknowledgement';

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

    const { tipId, tipAmount, conversationId } = await request.json();

    if (!tipAmount) {
      return NextResponse.json({ error: 'Missing tipAmount' }, { status: 400 });
    }

    console.log('[TipAck] Generating immediate tip response:', { tipId, tipAmount, conversationId });

    // ===========================================
    // GET AI PERSONALITY
    // ===========================================
    let personality: any = null;
    const cachedPersonality = await getPersonality(supabase, creatorId);

    if (cachedPersonality) {
      personality = cachedPersonality.data;
    } else {
      const { creator } = await getCreatorWithPersonality(supabase, creatorId);
      if (creator && creator.ai_chat_enabled) {
        personality = {
          id: creator.id,
          creator_id: creator.id,
          persona_name: creator.name,
          personality_traits: creator.personality_traits || ['friendly', 'flirty'],
          emoji_usage: creator.emoji_usage || 'moderate',
        };
      }
    }

    if (!personality) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 404 });
    }

    // ===========================================
    // GET OR CREATE CONVERSATION
    // ===========================================
    let convId = conversationId;
    if (!convId) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
          `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
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
    }

    // ===========================================
    // BUILD TIP ACKNOWLEDGEMENT PROMPT
    // ===========================================
    const tipPrompt = `
${TIP_ACKNOWLEDGEMENT_PROMPT}

[TIP DETAILS]
Amount: ${tipAmount} tokens
[END TIP DETAILS]

IMPORTANT: Generate ONLY a tip acknowledgement response. Keep it brief (1-2 sentences).
Match the personality: ${personality.persona_name || 'AI'}
Personality traits: ${(personality.personality_traits || []).join(', ')}
`;

    // ===========================================
    // GET RECENT CONTEXT (last few messages)
    // ===========================================
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(5);

    const messages = (recentMessages || []).reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // ===========================================
    // CALL ANTHROPIC API
    // ===========================================
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022', // Use Haiku for speed + cost
        max_tokens: 100, // Short response
        system: tipPrompt,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: '[User just sent a tip]' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TipAck] API error:', response.status, errorText);
      return NextResponse.json({ error: 'AI response failed' }, { status: 500 });
    }

    const data = await response.json();
    let aiResponse = data.content?.[0]?.text || '';

    // Strip asterisk actions
    aiResponse = aiResponse.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim();

    if (!aiResponse) {
      aiResponse = "Mm, thanks babe 😏";
    }

    console.log('[TipAck] AI response:', aiResponse);

    // ===========================================
    // SAVE RESPONSE TO CHAT
    // ===========================================
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      creator_id: creatorId,
      subscriber_id: user.id,
      role: 'assistant',
      content: aiResponse,
    });

    // Mark tip as acknowledged
    if (tipId) {
      await supabase
        .from('tips')
        .update({
          metadata: {
            needs_acknowledgement: false,
            acknowledged_at: new Date().toISOString(),
          },
        })
        .eq('id', tipId)
        .eq('user_id', user.id);
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId);

    // Return the response so frontend can display it immediately
    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversationId: convId,
    });
  } catch (error) {
    console.error('Tip acknowledgement error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
