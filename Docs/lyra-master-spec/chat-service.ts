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
import { buildPersonalityPrompt, AIPersonalityFull } from './personality/prompt-builder';
import { createClient } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  subscriberId: string;
  creatorId: string;
  message: string;
  conversationId?: string;
}

interface ChatResponse {
  response: string;
  conversationId: string;
  passed_compliance: boolean;
  compliance_issues?: string[];
}

// ===========================================
// MAIN CHAT FUNCTION
// ===========================================

export async function generateChatResponse(
  supabase: ReturnType<typeof createClient>,
  request: ChatRequest,
  personality: AIPersonalityFull
): Promise<ChatResponse> {
  const { subscriberId, creatorId, message } = request;

  // 1. Build context from memory
  const context = await buildChatContext(supabase, subscriberId, creatorId);
  
  // 2. Get or create conversation
  let conversationId = request.conversationId;
  if (!conversationId) {
    const { data: conv } = await supabase
      .from('conversations')
      .upsert({
        subscriber_id: subscriberId,
        creator_id: creatorId,
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'creator_id,subscriber_id' })
      .select('id')
      .single();
    conversationId = conv?.id;
  }

  // 3. Save user message
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'user',
    content: message,
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
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'assistant',
    content: aiResponse,
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

interface ComplianceResult {
  passed: boolean;
  issues: string[];
}

function checkCompliance(response: string): ComplianceResult {
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
  supabase: ReturnType<typeof createClient>,
  subscriberId: string,
  creatorId: string,
  messages: ChatMessage[]
): Promise<void> {
  // Run async without blocking response
  setImmediate(async () => {
    try {
      await updateMemory(supabase, subscriberId, creatorId, messages);
    } catch (error) {
      console.error('Background memory update failed:', error);
    }
  });
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
// EXPORTS
// ===========================================

export {
  checkCompliance,
  buildFullSystemPrompt,
  ChatMessage,
  ChatRequest,
  ChatResponse,
};
