// ===========================================
// API ROUTE: /api/chat/[creatorId]/route.ts
// Main chat endpoint with LYRA compliance
// Supports v1 (legacy) and v2 (enhanced) via feature flag
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateChatResponse } from '@/lib/ai/chat-service';
import { checkChatAccess, decrementMessage, isLowMessages } from '@/lib/chat';
import { useEnhancedChatV2 } from '@/lib/feature-flags';
import { getPromptBuilder, ChatContext } from '@/lib/ai/enhanced-chat/prompt-builder';
import { FORBIDDEN_PATTERNS_V2 } from '@/lib/ai/enhanced-chat/master-prompt-v2';

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

    // Get AI personality - check ai_personalities first, then creator_models
    let personality: any = null;

    // First try ai_personalities table (for real human creators)
    const { data: aiPersonality } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .single();

    if (aiPersonality) {
      personality = aiPersonality;
    } else {
      // Check if this is a creator model (like Lyra)
      const { data: model } = await supabase
        .from('creator_models')
        .select('id, name, age, backstory, speaking_style, personality_traits, interests, turn_ons, turn_offs, emoji_usage, response_length, nsfw_enabled, sfw_enabled')
        .eq('id', creatorId)
        .eq('status', 'approved')
        .single();

      if (model) {
        // Convert creator_model persona to AIPersonalityFull format
        personality = {
          id: model.id,
          creator_id: model.id,
          // Identity - CRITICAL: persona_name is required for prompt builder
          persona_name: model.name,
          age: model.age || 21,
          // Personality
          personality_traits: model.personality_traits || ['friendly', 'flirty'],
          energy_level: 7,
          humor_style: 'playful teasing',
          mood: 'flirty and engaged',
          // Interests
          interests: model.interests || ['chatting', 'getting to know you'],
          // Chat style
          flirting_style: ['playful', 'engaging'],
          dynamic: 'switch' as const,
          pace: 5,
          // Voice
          emoji_usage: model.emoji_usage || 'moderate',
          response_length: model.response_length || 'medium',
          speech_patterns: [model.speaking_style || 'playful and engaging'],
          // Behavior
          topics_loves: model.turn_ons || ['flirting', 'compliments'],
          topics_avoids: model.turn_offs || [],
          when_complimented: 'blushes and thanks them sweetly',
          when_heated: 'maintains playful energy',
          // Status
          is_active: true,
        };
      }
    }

    if (!personality) {
      return NextResponse.json(
        { error: 'AI not configured for this creator' },
        { status: 404 }
      );
    }

    // Check if enhanced chat v2 is enabled for this user
    const useV2 = await useEnhancedChatV2(supabase, user.id);

    let result: {
      response: string;
      conversationId: string;
      passed_compliance: boolean;
      compliance_issues?: string[];
    };

    if (useV2) {
      // Use enhanced v2 chat system
      result = await generateV2Response(
        supabase,
        user.id,
        creatorId,
        message,
        conversationId,
        personality
      );
    } else {
      // Use legacy v1 chat system
      result = await generateChatResponse(
        supabase as any,
        {
          subscriberId: user.id,
          creatorId: creatorId,
          message,
          conversationId,
        },
        personality
      );
    }

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

// ===========================================
// V2 ENHANCED CHAT HANDLER
// ===========================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function generateV2Response(
  supabase: any,
  userId: string,
  creatorId: string,
  message: string,
  conversationId: string | undefined,
  personality: any
): Promise<{
  response: string;
  conversationId: string;
  passed_compliance: boolean;
  compliance_issues?: string[];
}> {
  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${userId},participant2_id.eq.${creatorId}),` +
        `and(participant1_id.eq.${creatorId},participant2_id.eq.${userId})`
      )
      .maybeSingle();

    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          participant1_id: userId,
          participant2_id: creatorId,
        })
        .select('id')
        .single();
      convId = newConv?.id;
    }
  }

  // Initialize the prompt builder service
  const promptBuilder = getPromptBuilder(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Build the chat context
  const chatContext: ChatContext = {
    conversationId: convId!,
    userId,
    personaId: creatorId,
    persona: personality,
    currentMessage: message,
  };

  // Build the enhanced prompt
  const { systemPrompt, analyticsId } = await promptBuilder.buildPrompt(chatContext);

  // Get recent message history for context
  const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(20);

  const messages: ChatMessage[] = [
    ...(recentMessages || []).reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // Save user message
  await supabase.from('chat_messages').insert({
    conversation_id: convId,
    creator_id: creatorId,
    subscriber_id: userId,
    role: 'user',
    content: message,
  });

  // Generate AI response
  let aiResponse = await callAnthropicAPIV2(
    systemPrompt,
    messages,
    personality.response_length || 'medium'
  );

  // Compliance check
  const complianceResult = checkComplianceV2(aiResponse);

  if (!complianceResult.passed) {
    console.warn('V2 Compliance issues:', complianceResult.issues);
    aiResponse = await regenerateCompliantV2(
      systemPrompt,
      messages,
      personality.response_length || 'medium'
    );
  }

  // Post-process: strip asterisks
  aiResponse = stripAsteriskActions(aiResponse);

  // Save AI response
  await supabase.from('chat_messages').insert({
    conversation_id: convId,
    creator_id: creatorId,
    subscriber_id: userId,
    role: 'assistant',
    content: aiResponse,
  });

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', convId);

  // Process response for analytics (async, don't wait)
  promptBuilder.processResponse(
    convId!,
    aiResponse,
    analyticsId,
    userId,
    creatorId
  ).catch((err: Error) => console.error('Failed to process response:', err));

  return {
    response: aiResponse,
    conversationId: convId!,
    passed_compliance: complianceResult.passed,
    compliance_issues: complianceResult.issues,
  };
}

// ===========================================
// V2 HELPERS
// ===========================================

function getMaxTokensForLength(responseLength: 'short' | 'medium' | 'long' = 'medium'): number {
  switch (responseLength) {
    case 'short': return 50;   // ~35 words - punchy one-liners
    case 'medium': return 120; // ~90 words - conversational
    case 'long': return 250;   // ~180 words - detailed
    default: return 120;
  }
}

async function callAnthropicAPIV2(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return "Hey you 💕 What's on your mind?";
  }

  const maxTokens = getMaxTokensForLength(responseLength);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      console.error('API error:', await response.text());
      return "Hey you 💕 What's on your mind?";
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('API call error:', error);
    return "Hey you 💕 What's on your mind?";
  }
}

function checkComplianceV2(response: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const pattern of FORBIDDEN_PATTERNS_V2) {
    if (pattern.test(response)) {
      issues.push(`Matched: ${pattern.source}`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

async function regenerateCompliantV2(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const stricterPrompt = systemPrompt + `

⚠️ YOUR PREVIOUS RESPONSE WAS REJECTED. Try again.

ABSOLUTELY FORBIDDEN - DO NOT USE:
- Asterisk actions (*smiles*, *leans in*, etc)
- "I'm afraid..."
- "As much as I'd love to..."
- "outside the boundaries"
- "I can't engage"
- "as an AI"
- Any apologetic refusal language

INSTEAD USE:
✅ "Bold."
✅ "Patience."
✅ "Getting ahead of yourself... I like it"
✅ "Mm, you're eager"
✅ "Keep that energy"

Generate a SHORT, flirty response. No explanations.`;

  return await callAnthropicAPIV2(stricterPrompt, messages, responseLength);
}

function stripAsteriskActions(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length < 2) {
    return "Hey you 😏";
  }

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned;
}
