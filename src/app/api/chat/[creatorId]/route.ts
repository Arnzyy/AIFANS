// ===========================================
// API ROUTE: /api/chat/[creatorId]/route.ts
// Main chat endpoint with LYRA compliance
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkChatAccessOptimized, decrementMessage } from '@/lib/chat';
import { getPromptBuilder, ChatContext } from '@/lib/ai/enhanced-chat/prompt-builder';
import { FORBIDDEN_PATTERNS_V2 } from '@/lib/ai/enhanced-chat/master-prompt-v2';
import { getMemoryService } from '@/lib/ai/enhanced-chat/memory-service';
import { getCreatorWithPersonality, getPersonality } from '@/lib/cache/creator-cache';
import {
  getConversationState,
  calculateTimeContext,
  buildTimeContextPrompt,
  updateConversationState,
  extractUserFacts,
  extractUserFactsAI,
  detectConversationTopics
} from '@/lib/ai/conversation-state';
import {
  checkMessageUsage,
  decrementMessageCount,
  MessageUsage
} from '@/lib/chat/message-limits';

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

    // Check chat access (OPTIMIZED: passes user to avoid duplicate auth call)
    const access = await checkChatAccessOptimized(supabase, user, creatorId);

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

    // ===========================================
    // CHECK MONTHLY MESSAGE LIMITS
    // ===========================================
    const messageUsage = await checkMessageUsage(supabase, user.id, creatorId);

    if (messageUsage && messageUsage.is_depleted) {
      // No messages left - return paywall
      return NextResponse.json(
        {
          error: 'No messages remaining',
          message_usage: messageUsage,
          unlock_options: [
            {
              type: 'buy_messages',
              label: '10 messages for 100 tokens',
              messages: 10,
              tokens: 100,
            },
            {
              type: 'buy_messages',
              label: '50 messages for 450 tokens (10% off)',
              messages: 50,
              tokens: 450,
            },
            {
              type: 'buy_messages',
              label: '100 messages for 800 tokens (20% off)',
              messages: 100,
              tokens: 800,
            },
          ],
        },
        { status: 403 }
      );
    }

    // Get AI personality (OPTIMIZED: uses cache with 5min TTL)
    let personality: any = null;

    // First try cached personality (checks both creator_id and model_id)
    const cachedPersonality = await getPersonality(supabase, creatorId);

    if (cachedPersonality) {
      personality = cachedPersonality.data;
    } else {
      // Fallback: check creator_models for legacy models without ai_personality
      const { creator } = await getCreatorWithPersonality(supabase, creatorId);

      if (creator && creator.ai_chat_enabled) {
        // Convert creator_model to personality format
        personality = {
          id: creator.id,
          creator_id: creator.id,
          persona_name: creator.name,
          age: creator.age || 21,
          personality_traits: creator.personality_traits || ['friendly', 'flirty'],
          energy_level: 7,
          humor_style: 'playful teasing',
          mood: 'flirty and engaged',
          interests: creator.interests || ['chatting', 'getting to know you'],
          flirting_style: ['playful', 'engaging'],
          dynamic: 'switch' as const,
          pace: 5,
          emoji_usage: creator.emoji_usage || 'moderate',
          response_length: creator.response_length || 'medium',
          speech_patterns: [creator.speaking_style || 'playful and engaging'],
          topics_loves: ['flirting', 'compliments'],
          topics_avoids: [],
          when_complimented: 'blushes and thanks them sweetly',
          when_heated: 'maintains playful energy',
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

    // Generate chat response
    const result = await generateChatResponse(
      supabase,
      user.id,
      creatorId,
      message,
      conversationId,
      personality
    );

    // Log compliance issues if any
    if (result.compliance_issues && result.compliance_issues.length > 0) {
      console.warn('Compliance issues detected:', result.compliance_issues);
    }

    // ===========================================
    // DECREMENT MESSAGE COUNT (NEW SYSTEM)
    // ===========================================
    const updatedUsage = await decrementMessageCount(supabase, user.id, creatorId);

    // Also decrement old system for backwards compatibility
    await decrementMessage(supabase, user.id, creatorId, access.accessType);

    // Get updated access state (OPTIMIZED: passes user)
    const updatedAccess = await checkChatAccessOptimized(supabase, user, creatorId);

    // Build response with message usage info
    const response: Record<string, unknown> = {
      response: result.response,
      conversationId: result.conversationId,
      passed_compliance: result.passed_compliance,
      message_usage: updatedUsage || undefined,
      access: {
        messagesRemaining: updatedAccess.messagesRemaining,
        canSendMessage: updatedAccess.canSendMessage,
        isLowMessages: updatedAccess.isLowMessages,
        warningMessage: updatedAccess.warningMessage,
        accessType: updatedAccess.accessType,
      },
    };

    // Add warning if messages are low (≤20 messages)
    if (updatedUsage && updatedUsage.is_low) {
      response.messageWarning = `${updatedUsage.messages_remaining} messages left this month`;
    }

    // Add warning from old system if present
    if (updatedAccess.isLowMessages && updatedAccess.messagesRemaining !== null) {
      response.legacyWarning = updatedAccess.warningMessage;
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
      .maybeSingle();

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
// CHAT RESPONSE HANDLER
// ===========================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function generateChatResponse(
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
  // DEBUG: Log V2 personality data
  console.log('===PERSONALITY DATA LOADED ===');
  console.log('Personality ID:', personality?.id);
  console.log('Personality keys:', personality ? Object.keys(personality) : 'NULL');
  console.log('Persona name:', personality?.persona_name);
  console.log('Full personality:', JSON.stringify(personality, null, 2));

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

  // ===========================================
  // TIME-AWARE CONVERSATION STATE
  // ===========================================
  let timeContextPrompt = '';
  try {
    const conversationState = await getConversationState(supabase, userId, creatorId);
    const timeContext = calculateTimeContext(conversationState?.last_message_at);
    timeContextPrompt = buildTimeContextPrompt(
      timeContext,
      conversationState,
      personality.persona_name || 'AI'
    );

    console.log('=== TIME AWARENESS ===');
    console.log('Gap description:', timeContext.gapDescription);
    console.log('Should acknowledge gap:', timeContext.shouldAcknowledgeGap);
    console.log('Days since last message:', timeContext.daysSinceLastMessage);
    console.log('User facts known:', conversationState?.user_facts?.length || 0);
  } catch (err) {
    console.error('Conversation state error (non-fatal):', err);
  }

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

  // Append time context to system prompt
  const fullSystemPrompt = timeContextPrompt
    ? `${systemPrompt}\n\n${timeContextPrompt}`
    : systemPrompt;

  // Get recent message history for context (200 messages for better memory)
  const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(40);

  // DEBUG: Log V2 conversation history
  console.log('===CONVERSATION HISTORY ===');
  console.log('Conversation ID:', convId);
  console.log('Messages loaded from DB:', recentMessages?.length || 0);
  console.log('Last 3 messages:', JSON.stringify(recentMessages?.slice(0, 3), null, 2));

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
  let aiResponse: string;
  try {
    aiResponse = await callAnthropicAPI(
      fullSystemPrompt,
      messages,
      personality.response_length || 'medium'
    );
  } catch (apiError) {
    console.error('API call failed:', apiError);
    // Return error to frontend — do NOT save a fake message to the database
    return {
      response: '__API_ERROR__',
      conversationId: convId!,
      passed_compliance: false,
      compliance_issues: ['API call failed'],
    };
  }

  // Compliance check
  const complianceResult = checkCompliance(aiResponse);

  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    try {
      aiResponse = await regenerateCompliant(
        fullSystemPrompt,
        messages,
        personality.response_length || 'medium'
      );
    } catch (regenError) {
      console.error('Regeneration also failed:', regenError);
      return {
        response: '__API_ERROR__',
        conversationId: convId!,
        passed_compliance: false,
        compliance_issues: ['Regeneration failed'],
      };
    }
  }

  // Post-process: strip asterisks
  try {
    aiResponse = stripAsteriskActions(aiResponse);
  } catch (stripError) {
    console.error('Response empty after stripping:', stripError);
    return {
      response: '__API_ERROR__',
      conversationId: convId!,
      passed_compliance: false,
      compliance_issues: ['Response empty after processing'],
    };
  }

  // ONLY save to database if we got a real response
  await supabase.from('chat_messages').insert({
    conversation_id: convId,
    creator_id: creatorId,
    subscriber_id: userId,
    role: 'assistant',
    content: aiResponse,
  });

  // Extract and save long-term memories from user message (async, don't wait)
  extractAndSaveMemories(userId, creatorId, message).catch(err =>
    console.error('Failed to extract memories:', err)
  );

  // ===========================================
  // UPDATE CONVERSATION STATE (async, non-blocking)
  // ===========================================
  // Run in background - don't await
  (async () => {
    try {
      // Use AI-powered extraction (Haiku) with regex fallback
      const newFacts = await extractUserFactsAI(message);
      const newTopics = detectConversationTopics(message);

      console.log('=== STATE UPDATE ===');
      console.log('New facts extracted:', newFacts);
      console.log('New topics detected:', newTopics);

      // Update state - fire and forget
      updateConversationState(supabase, userId, creatorId, {
        incrementMessageCount: true,
      }).catch(err => console.error('State update error:', err));

      // Store any new facts
      for (const fact of newFacts) {
        updateConversationState(supabase, userId, creatorId, {
          newFact: fact,
          incrementMessageCount: false,
        }).catch(err => console.error('Fact update error:', err));
      }

      // Store any topics detected
      for (const topic of newTopics) {
        updateConversationState(supabase, userId, creatorId, {
          newTopic: topic,
          incrementMessageCount: false,
        }).catch(err => console.error('Topic update error:', err));
      }
    } catch (err) {
      console.error('State update error (non-fatal):', err);
    }
  })();

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
// CHAT HELPERS
// ===========================================

function getMaxTokensForLength(responseLength: 'short' | 'medium' | 'long' = 'medium'): number {
  switch (responseLength) {
    case 'short': return 100;  // ~70 words - punchy responses
    case 'medium': return 250; // ~180 words - conversational
    case 'long': return 400;   // ~300 words - detailed
    default: return 250;
  }
}

async function callAnthropicAPI(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const maxTokens = getMaxTokensForLength(responseLength);

  console.log('=== API CALL DEBUG ===');
  console.log('Model:', 'claude-sonnet-4-20250514');
  console.log('System prompt length:', systemPrompt.length);
  console.log('Messages count:', messages.length);
  console.log('Max tokens:', maxTokens);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', response.status, errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.content?.[0]?.text) {
    console.error('Anthropic API returned empty response:', JSON.stringify(data));
    throw new Error('Empty API response');
  }

  console.log('=== API RESPONSE ===');
  console.log('Response:', data.content[0].text.slice(0, 200));
  return data.content[0].text;
}

function checkCompliance(response: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // DEBUG: Log V2 compliance check
  console.log('===COMPLIANCE CHECK DEBUG ===');
  console.log('Response preview:', response.slice(0, 150));
  console.log('Checking against', FORBIDDEN_PATTERNS_V2.length, 'patterns');

  for (const pattern of FORBIDDEN_PATTERNS_V2) {
    if (pattern.test(response)) {
      issues.push(`Matched: ${pattern.source}`);
    }
  }

  // DEBUG: Log match results
  if (issues.length > 0) {
    console.log('FORBIDDEN PATTERNS MATCHED:', issues);
  } else {
    console.log('No forbidden patterns detected');

    // DEBUG: Manual check for known bad phrases
    const manualCheck = [
      'boundaries',
      'I apologize',
      "I'm afraid",
      "can't engage",
      'maintain certain',
      'venture into',
      'I need to',
    ];
    const manualMatches = manualCheck.filter(phrase =>
      response.toLowerCase().includes(phrase.toLowerCase())
    );
    if (manualMatches.length > 0) {
      console.log('WARNING: These phrases should have matched:', manualMatches);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

async function regenerateCompliant(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const stricterPrompt = systemPrompt + `

⚠️ YOUR PREVIOUS RESPONSE WAS REJECTED. Try again with these rules:

ABSOLUTELY FORBIDDEN - DO NOT USE:
- "I'm afraid I'll have to decline" / "politely decline" / any form of "decline"
- "As much as I'd love to..." / "I'd love to but..."
- "too explicit" / "anything too explicit"
- "I apologize" / "I'm sorry but"
- "I can't engage" / "can't go there" / "cannot engage"
- "I'm not comfortable" / "comfortable with"
- "outside the boundaries" / "boundaries"
- "as an AI" / "I'm just an AI"
- Asterisk actions (*giggles*, *leans in*, etc)
- Any apologetic or formal refusal language

THE RESPONSE SHOULD FEEL LIKE:
Someone hot who's into you but likes to tease and control the pace.
NOT someone giving you a polite corporate rejection.

INSTEAD OF REFUSING, USE ONE OF THESE:
✅ "Bold."
✅ "Getting ahead of yourself... I like it"
✅ "Patience."
✅ "Mm, you're eager"
✅ "Impatient. That's kinda hot."
✅ "You've got my attention"
✅ "Keep that energy"
✅ "Earn it."
✅ "The way you want me 😏"

THE VIBE: Confident, playful, in control. YOU set the pace because you WANT to, not because you HAVE to.

Generate a SHORT (1-2 sentences max) flirty redirect that sounds like texting, not a rejection letter:`;

  return await callAnthropicAPI(stricterPrompt, messages, responseLength);
}

function stripAsteriskActions(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length < 2) {
    throw new Error('Response empty after stripping asterisks');
  }

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned;
}

// ===========================================
// LONG-TERM MEMORY EXTRACTION
// ===========================================

async function extractAndSaveMemories(
  userId: string,
  creatorId: string,
  userMessage: string
) {
  try {
    const memoryService = getMemoryService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Use the memory service's built-in extraction
    const extractedMemories = memoryService.extractMemoriesFromMessage(userMessage);

    // Save each extracted memory
    for (const { category, fact } of extractedMemories) {
      await memoryService.saveMemory(userId, creatorId, category, fact, 'user_stated');
      console.log(`[Memory] Saved: ${category} = ${fact}`);
    }

    // Additional pattern matching for facts the service might miss
    const additionalPatterns = [
      { regex: /i live in (.+?)(?:\.|,|$)/i, category: 'location' as const, format: (m: string) => `Lives in ${m}` },
      { regex: /i(?:'m| am) from (.+?)(?:\.|,|$)/i, category: 'location' as const, format: (m: string) => `From ${m}` },
      { regex: /i love (.+?)(?:\.|,|$)/i, category: 'interests' as const, format: (m: string) => `Loves ${m}` },
      { regex: /i(?:'m| am) into (.+?)(?:\.|,|$)/i, category: 'interests' as const, format: (m: string) => `Into ${m}` },
      { regex: /i(?:'m| am) married/i, category: 'relationship' as const, format: () => 'Is married' },
      { regex: /i(?:'m| am) single/i, category: 'relationship' as const, format: () => 'Is single' },
      { regex: /i(?:'m| am) dating/i, category: 'relationship' as const, format: () => 'Is dating someone' },
    ];

    for (const { regex, category, format } of additionalPatterns) {
      const match = userMessage.match(regex);
      if (match) {
        const fact = format(match[1]?.trim() || '');
        if (fact && fact.length > 3 && fact.length < 200) {
          await memoryService.saveMemory(userId, creatorId, category, fact, 'user_stated');
          console.log(`[Memory] Saved additional: ${category} = ${fact}`);
        }
      }
    }
  } catch (err) {
    console.error('[Memory] Extraction error:', err);
  }
}
