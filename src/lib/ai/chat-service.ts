// ===========================================
// LYRA AI CHAT SERVICE (COMPLETE)
// With memory + content awareness
// ===========================================

import { MASTER_SYSTEM_PROMPT, FORBIDDEN_PATTERNS } from './master-prompt';
import { 
  buildChatContext, 
  formatMemoryForPrompt, 
  updateMemory,
  ConversationContext 
} from './memory-system/memory-service';
import { 
  detectContentReference,
  findMatchingContent,
  buildContentContext 
} from './content-awareness/content-service';
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
  referenced_content?: string[]; // IDs of content user referenced
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

  // 1. Build memory context
  const memoryContext = await buildChatContext(supabase, subscriberId, creatorId);
  
  // 2. Check if user is referencing content
  let contentContext = '';
  let referencedContentIds: string[] = [];
  
  if (detectContentReference(message)) {
    const matches = await findMatchingContent(supabase, creatorId, message);
    if (matches.length > 0) {
      contentContext = buildContentContext(matches);
      referencedContentIds = matches.map(m => m.content.id);
    }
  }

  // 3. Get or create conversation
  let conversationId = request.conversationId;
  if (!conversationId) {
    const { data: conv } = await (supabase as any)
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

  // 4. Save user message
  await (supabase as any).from('chat_messages').insert({
    conversation_id: conversationId,
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'user',
    content: message,
  });

  // 5. Build complete system prompt
  const systemPrompt = buildFullSystemPrompt(personality, memoryContext, contentContext);

  // 6. Build messages array
  const messages: ChatMessage[] = [
    ...memoryContext.recent_messages.slice(-20),
    { role: 'user', content: message },
  ];

  // 7. Generate AI response
  let aiResponse = await callAnthropicAPI(systemPrompt, messages);

  // 8. Compliance check
  const complianceResult = checkCompliance(aiResponse);
  
  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    aiResponse = await regenerateCompliant(systemPrompt, messages, complianceResult.issues);
  }

  // 9. Save AI response
  await (supabase as any).from('chat_messages').insert({
    conversation_id: conversationId,
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'assistant',
    content: aiResponse,
  });

  // 10. Update conversation timestamp
  await (supabase as any)
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // 11. Background memory update
  updateMemoryInBackground(supabase, subscriberId, creatorId, [
    ...messages,
    { role: 'assistant', content: aiResponse },
  ]);

  return {
    response: aiResponse,
    conversationId: conversationId!,
    passed_compliance: complianceResult.passed,
    compliance_issues: complianceResult.issues,
    referenced_content: referencedContentIds.length > 0 ? referencedContentIds : undefined,
  };
}

// ===========================================
// SYSTEM PROMPT BUILDER
// ===========================================

function buildFullSystemPrompt(
  personality: AIPersonalityFull,
  memoryContext: ConversationContext,
  contentContext: string
): string {
  // 1. Non-negotiable platform rules
  let prompt = MASTER_SYSTEM_PROMPT;

  // 2. Creator's personality
  prompt += '\n\n' + buildPersonalityPrompt(personality);

  // 3. Memory context (if available)
  const memoryPrompt = formatMemoryForPrompt(memoryContext);
  if (memoryPrompt) {
    prompt += '\n' + memoryPrompt;
  }

  // 4. Content context (if user referenced images)
  if (contentContext) {
    prompt += '\n' + contentContext;
  }

  return prompt;
}

// ===========================================
// ANTHROPIC API
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
        max_tokens: 300,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      console.error('API error:', await response.text());
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
// COMPLIANCE
// ===========================================

interface ComplianceResult {
  passed: boolean;
  issues: string[];
}

function checkCompliance(response: string): ComplianceResult {
  const issues: string[] = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(response)) {
      issues.push(`Matched: ${pattern.source}`);
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
  issues: string[]
): Promise<string> {
  const stricterPrompt = systemPrompt + `

⚠️ COMPLIANCE ALERT - Your previous response violated rules.
Generate a new response that:
- Does NOT use forbidden patterns
- Stays flirty but NOT explicit
- No emotional dependency ("I missed you")
- No real-world locations/meetups
- Keep it SHORT and playful

Try again:`;

  return await callAnthropicAPI(stricterPrompt, messages);
}

// ===========================================
// HELPERS
// ===========================================

async function updateMemoryInBackground(
  supabase: ReturnType<typeof createClient>,
  subscriberId: string,
  creatorId: string,
  messages: ChatMessage[]
): Promise<void> {
  setImmediate(async () => {
    try {
      await updateMemory(supabase, subscriberId, creatorId, messages);
    } catch (error) {
      console.error('Memory update failed:', error);
    }
  });
}

const FALLBACK_RESPONSES = [
  "Hey you 💕 What's on your mind?",
  "There you are... I like when you show up 😏",
  "Mmm, hey. What are we getting into today?",
  "Well hello 💕 You've got my attention.",
];

function getFallbackResponse(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ===========================================
// MOCK RESPONSE GENERATOR (for demo creators)
// ===========================================

export async function generateMockResponse(
  creatorName: string,
  message: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    const systemPrompt = `${MASTER_SYSTEM_PROMPT}

═══════════════════════════════════════════
YOUR PERSONA: ${creatorName.toUpperCase()}
═══════════════════════════════════════════

You are ${creatorName}, a confident, playful AI creator on LYRA.
Keep responses SHORT (2-4 sentences), flirty but not explicit.
Ask engaging questions to keep the conversation going.
`;

    const messages: ChatMessage[] = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    return await callAnthropicAPI(systemPrompt, messages);
  } catch (error) {
    console.error('Mock response generation failed:', error);
    return getFallbackResponse();
  }
}

export { checkCompliance, ChatMessage, ChatRequest, ChatResponse };
