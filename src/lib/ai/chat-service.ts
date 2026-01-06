// ===========================================
// LYRA AI CHAT SERVICE
// Compliant chat with safe memory integration
// ===========================================

import { MASTER_SYSTEM_PROMPT, FORBIDDEN_PATTERNS } from './master-prompt';
import {
  buildChatContext,
  formatMemoryForPrompt,
  updateMemory,
  ConversationContext
} from './memory-system/memory-service';
import { buildPersonalityPrompt } from './personality/prompt-builder';
import { AIPersonalityFull } from './personality/types';

// Supabase client type (using any for compatibility with server client)
type SupabaseClient = any;

// ===========================================
// TYPES
// ===========================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  subscriberId: string;
  creatorId: string;
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  passed_compliance: boolean;
  compliance_issues?: string[];
}

// ===========================================
// MAIN CHAT FUNCTION
// ===========================================

export async function generateChatResponse(
  supabase: SupabaseClient,
  request: ChatRequest,
  personality: AIPersonalityFull
): Promise<ChatResponse> {
  const { subscriberId, creatorId, message } = request;

  // 1. Build context from memory
  const context = await buildChatContext(supabase, subscriberId, creatorId);

  // 2. Get or create conversation
  let conversationId = request.conversationId;
  if (!conversationId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('subscriber_id', subscriberId)
      .eq('creator_id', creatorId)
      .single();

    if (existing) {
      conversationId = existing.id;
    } else {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({
          participant1_id: subscriberId,
          participant2_id: creatorId,
          is_ai_enabled: true,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      conversationId = conv?.id;
    }
  }

  // 3. Save user message
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    sender_id: subscriberId,
    receiver_id: creatorId,
    content: message,
    is_ai_generated: false,
  });

  // 4. Build full system prompt
  const systemPrompt = buildFullSystemPrompt(personality, context);

  // 5. Build messages array (recent history + new message)
  const messages: ChatMessage[] = [
    ...context.recent_messages.slice(-20),
    { role: 'user', content: message },
  ];

  // 6. Generate AI response
  let aiResponse = await callAnthropicAPI(systemPrompt, messages);

  // 7. Compliance check
  const complianceResult = checkCompliance(aiResponse);

  // 8. If failed compliance, regenerate with stricter prompt
  if (!complianceResult.passed) {
    console.warn('Compliance issues detected:', complianceResult.issues);
    aiResponse = await regenerateCompliant(systemPrompt, messages, complianceResult.issues);
  }

  // 9. Save AI response
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    sender_id: creatorId,
    receiver_id: subscriberId,
    content: aiResponse,
    is_ai_generated: true,
  });

  // 10. Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // 11. Trigger background memory update (non-blocking)
  updateMemoryInBackground(supabase, subscriberId, creatorId, [
    ...messages,
    { role: 'assistant', content: aiResponse },
  ]);

  return {
    response: aiResponse,
    conversationId: conversationId!,
    passed_compliance: complianceResult.passed,
    compliance_issues: complianceResult.issues,
  };
}

// ===========================================
// SYSTEM PROMPT BUILDER
// ===========================================

function buildFullSystemPrompt(
  personality: AIPersonalityFull,
  context: ConversationContext
): string {
  // 1. Start with non-negotiable master prompt
  let prompt = MASTER_SYSTEM_PROMPT;

  // 2. Add creator's personality customisation
  prompt += '\n\n' + buildPersonalityPrompt(personality);

  // 3. Add memory context (if available)
  const memoryContext = formatMemoryForPrompt(context);
  if (memoryContext) {
    prompt += '\n' + memoryContext;
  }

  return prompt;
}

// ===========================================
// ANTHROPIC API CALL
// ===========================================

async function callAnthropicAPI(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getFallbackResponse();
  }

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
        max_tokens: 300, // Keep responses short
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return getFallbackResponse();
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('API call error:', error);
    return getFallbackResponse();
  }
}

// ===========================================
// COMPLIANCE CHECKING
// ===========================================

export interface ComplianceResult {
  passed: boolean;
  issues: string[];
}

export function checkCompliance(response: string): ComplianceResult {
  const issues: string[] = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(response)) {
      issues.push(`Matched forbidden pattern: ${pattern.source}`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Regenerate response with explicit compliance reminders
 */
async function regenerateCompliant(
  systemPrompt: string,
  messages: ChatMessage[],
  issues: string[]
): Promise<string> {
  const stricterPrompt = systemPrompt + `

⚠️ COMPLIANCE ALERT ⚠️
Your previous response violated these rules:
${issues.join('\n')}

Generate a new response that:
- Does NOT use any forbidden patterns
- Stays flirty but NOT explicit
- Does NOT imply emotional dependency
- Does NOT suggest real-world meeting
- Keeps it SHORT and playful

Try again:`;

  return await callAnthropicAPI(stricterPrompt, messages);
}

// ===========================================
// BACKGROUND MEMORY UPDATE
// ===========================================

async function updateMemoryInBackground(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string,
  messages: ChatMessage[]
): Promise<void> {
  // Run async without blocking response
  setTimeout(async () => {
    try {
      await updateMemory(supabase, subscriberId, creatorId, messages);
    } catch (error) {
      console.error('Background memory update failed:', error);
    }
  }, 0);
}

// ===========================================
// FALLBACK RESPONSES
// ===========================================

const FALLBACK_RESPONSES = [
  "Hey you 💕 What's on your mind?",
  "There you are... I like when you show up 😏",
  "Mmm, hey. What are we getting into today?",
  "Well hello 💕 You've got my attention.",
  "Hey... I was hoping you'd say something 😏",
];

function getFallbackResponse(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ===========================================
// SIMPLE MOCK CHAT (for demo creators)
// ===========================================

export async function generateMockResponse(
  creatorName: string,
  message: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getMockFallback(message);
  }

  const systemPrompt = `${MASTER_SYSTEM_PROMPT}

═══════════════════════════════════════════
YOUR PERSONA: ${creatorName.toUpperCase()}
═══════════════════════════════════════════

You are ${creatorName}, a flirty AI persona on LYRA.
Keep responses SHORT (2-3 sentences), playful, and engaging.
Use emojis naturally 💕
Ask questions to keep the conversation going.`;

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
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          ...conversationHistory.slice(-10),
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      return getMockFallback(message);
    }

    const data = await response.json();
    let aiResponse = data.content[0].text;

    // Compliance check
    const compliance = checkCompliance(aiResponse);
    if (!compliance.passed) {
      return getMockFallback(message);
    }

    return aiResponse;
  } catch {
    return getMockFallback(message);
  }
}

function getMockFallback(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey there 💕 Good to see you. What's on your mind?";
  }

  if (lower.includes('how are you')) {
    return "I'm good now that you're here 😏 What are you up to?";
  }

  // Redirect explicit content smoothly
  if (lower.includes('fuck') || lower.includes('sex') || lower.includes('nude')) {
    return "Mmm, I like that energy... but I'm all about the slow build 😏 What else you got?";
  }

  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}
