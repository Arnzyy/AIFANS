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
    // First check if conversation exists
    const { data: existingConv } = await (supabase as any)
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${subscriberId},participant2_id.eq.${creatorId}),` +
        `and(participant1_id.eq.${creatorId},participant2_id.eq.${subscriberId})`
      )
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation
      const { data: newConv } = await (supabase as any)
        .from('conversations')
        .insert({
          participant1_id: subscriberId,
          participant2_id: creatorId,
        })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }
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

  // 7. Generate AI response (use personality's response_length setting)
  let aiResponse = await callAnthropicAPI(systemPrompt, messages, personality.response_length);

  // 8. Compliance check
  const complianceResult = checkCompliance(aiResponse);

  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    aiResponse = await regenerateCompliant(systemPrompt, messages, complianceResult.issues, personality.response_length);
  }

  // 8.5. Post-processing: Strip any remaining asterisk actions as failsafe
  aiResponse = stripAsteriskActions(aiResponse);

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

/**
 * Get max tokens based on response_length setting
 */
function getMaxTokensForLength(responseLength: 'short' | 'medium' | 'long' = 'medium'): number {
  switch (responseLength) {
    case 'short': return 100;  // 1-2 sentences
    case 'medium': return 250; // 2-4 sentences
    case 'long': return 500;   // Detailed responses
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
    return getFallbackResponse();
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
  issues: string[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const stricterPrompt = systemPrompt + `

⚠️ COMPLIANCE ALERT - Your previous response violated rules.
Generate a new response that:
- ABSOLUTELY NO asterisk actions (*leans*, *chuckles*, etc) - just speak normally like texting
- NO dismissive phrases ("I can't engage", "too explicit", "air of mystery")
- NEVER say you can't do something - just redirect with confidence and warmth
- Stays flirty but NOT explicit
- No emotional dependency ("I missed you")
- No real-world locations/meetups
- Keep it playful

When redirecting from explicit content, use confidence not refusal:
✅ "Bold." / "You've got my attention" / "Keep that energy" / "Mm, I felt that"
❌ "I can't engage" / "too explicit" / "maintain some mystery"

Try again:`;

  return await callAnthropicAPI(stricterPrompt, messages, responseLength);
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Post-process AI response to enforce natural texting
 */
function postProcessResponse(text: string): string {
  let cleaned = text;

  // 1. Remove all *action* patterns
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');

  // 2. Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 3. Remove robotic openers (only if followed by more content)
  if (cleaned.length > 20) {
    cleaned = cleaned.replace(/^(Oh,?\s*|Well,?\s*|Hmm,?\s*|Ahh?,?\s*)/i, '');
  }

  // 4. If we stripped everything, return a fallback
  if (!cleaned || cleaned.length < 2) {
    return "Hey you 😏";
  }

  return cleaned;
}

// Alias for backwards compatibility
function stripAsteriskActions(text: string): string {
  return postProcessResponse(text);
}

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
NEVER use asterisks for actions like *giggles* or *smiles*. Express yourself naturally without roleplay formatting.
`;

    const messages: ChatMessage[] = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const response = await callAnthropicAPI(systemPrompt, messages);
    return stripAsteriskActions(response);
  } catch (error) {
    console.error('Mock response generation failed:', error);
    return getFallbackResponse();
  }
}

// ===========================================
// WELCOME BACK MESSAGE GENERATOR
// ===========================================

/**
 * Generate a natural "welcome back" message for returning users
 * References their previous conversation to feel like a real person
 */
export async function generateWelcomeBackMessage(
  creatorName: string,
  recentMessages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  if (recentMessages.length === 0) {
    return ''; // No history, no welcome back needed
  }

  // Get the last few messages for context
  const lastMessages = recentMessages.slice(-6);
  const lastUserMessage = lastMessages.filter(m => m.role === 'user').pop();

  try {
    const systemPrompt = `You are ${creatorName}, greeting a user who just came back to chat.

CRITICAL RULES:
- Keep it SHORT - one casual sentence, like a text from a friend
- Reference what they were talking about last time (if relevant)
- Sound natural and happy to see them, not formal
- NO asterisks (*action*) - just natural speech
- NO formal greetings like "Welcome back!" or "Hello again!"
- Think: how would a flirty friend text you when you come back online?

GOOD examples (short, casual):
- "Hey! How was the gym? 💪"
- "You're back! Miss me? 😏"
- "There you are... was just thinking about you"
- "Hey you 💕 How'd it go?"

BAD examples (too formal/long):
- "Welcome back! I'm so glad you decided to return to our conversation!"
- "Hello again! It's wonderful to see you!"`;

    const contextMessages: ChatMessage[] = [
      ...lastMessages,
      {
        role: 'user',
        content: `[User just returned to the chat after being away. Generate a SHORT, casual welcome back message referencing our last conversation. Last thing they said: "${lastUserMessage?.content || 'chatting with me'}"]`
      }
    ];

    const response = await callAnthropicAPI(systemPrompt, contextMessages, 'short');
    return stripAsteriskActions(response);
  } catch (error) {
    console.error('Welcome back message generation failed:', error);
    // Fallback to simple greeting
    return "Hey, you're back! 💕";
  }
}

// ===========================================
// TIP ACKNOWLEDGEMENT GENERATOR
// ===========================================

/**
 * Generate an AI tip acknowledgement that scales with tip amount
 * Bigger tips = more enthusiastic, personalized responses
 * Uses creator's personality settings from dashboard
 */
export async function generateTipAcknowledgement(
  creatorName: string,
  tipAmount: number,
  recentMessages: ChatMessage[] = [],
  personality?: AIPersonalityFull | null
): Promise<string> {
  // Determine enthusiasm level based on tip amount
  let enthusiasmLevel: string;
  let maxLength: 'short' | 'medium' | 'long';

  if (tipAmount >= 1000) {
    enthusiasmLevel = 'EXTREMELY grateful and excited - this is a huge tip! Be very warm, personal, and appreciative. Make them feel special.';
    maxLength = 'medium';
  } else if (tipAmount >= 500) {
    enthusiasmLevel = 'Very enthusiastic and genuinely touched - this is a generous tip! Show real appreciation.';
    maxLength = 'medium';
  } else if (tipAmount >= 250) {
    enthusiasmLevel = 'Warm and appreciative - nice tip! Be sweet and thankful.';
    maxLength = 'short';
  } else if (tipAmount >= 100) {
    enthusiasmLevel = 'Appreciative and flirty - thank them warmly.';
    maxLength = 'short';
  } else {
    enthusiasmLevel = 'Casual and cute - a quick sweet thanks.';
    maxLength = 'short';
  }

  // Build personality context if available
  let personalityContext = '';
  if (personality) {
    personalityContext = `
YOUR PERSONALITY (from creator settings):
- Traits: ${personality.personality_traits?.join(', ') || 'playful, friendly'}
- Mood: ${personality.mood || 'happy'}
- Humor: ${personality.humor_style || 'witty'}
- Flirting pace: ${personality.pace || 5}/10
- Signature phrases: ${personality.signature_phrases || 'none specified'}
- Emoji usage: ${personality.emoji_usage || 'moderate'}

Stay in character with these personality traits while thanking for the tip.
`;
  }

  try {
    const systemPrompt = `You are ${creatorName}, thanking a user for a tip they just sent you.
${personalityContext}
TIP AMOUNT: ${tipAmount} tokens
ENTHUSIASM LEVEL: ${enthusiasmLevel}

RULES:
- Mention the specific amount (${tipAmount} tokens)
- Scale your excitement to match the tip size
- Keep it natural, like texting - not formal
- NO asterisks (*action*) - just natural speech
- Stay in character with your personality settings
- For big tips (500+), make them feel REALLY special
- For huge tips (1000+), be genuinely touched and personal

EXAMPLES BY TIP SIZE:
- 50 tokens: "Aww thanks babe 💕"
- 250 tokens: "Omg thank you! 250 tokens?! You're the sweetest 😘"
- 500 tokens: "Wait, 500 tokens?! You're actually amazing... that just made my whole day 💕"
- 1000+ tokens: "Oh my god... ${tipAmount} tokens?! I'm actually speechless right now. You're incredible, seriously. Thank you so much 🥺💕"
`;

    const contextMessages: ChatMessage[] = [
      ...recentMessages.slice(-5),
      {
        role: 'user',
        content: `[User just tipped ${tipAmount} tokens. Generate a thank you message that matches the tip size and your personality.]`
      }
    ];

    const response = await callAnthropicAPI(systemPrompt, contextMessages, maxLength);
    return stripAsteriskActions(response);
  } catch (error) {
    console.error('Tip acknowledgement generation failed:', error);
    // Fallback based on amount
    if (tipAmount >= 1000) {
      return `Oh my god... ${tipAmount} tokens?! You're incredible, thank you so much! 🥺💕`;
    } else if (tipAmount >= 500) {
      return `Wow ${tipAmount} tokens?! You're so generous! Thank you sweetie 😘`;
    } else if (tipAmount >= 250) {
      return `Aww thank you for the ${tipAmount} tokens! You're the best 💕`;
    } else {
      return `Thanks for the tip babe 💕`;
    }
  }
}

export { checkCompliance };
export type { ChatMessage, ChatRequest, ChatResponse };
