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

  // DEBUG: Log personality data being loaded
  console.log('=== PERSONALITY DATA LOADED ===');
  console.log('Personality ID:', personality?.id);
  console.log('Personality keys:', personality ? Object.keys(personality) : 'NULL');
  console.log('Persona name:', personality?.persona_name);
  console.log('Full personality:', JSON.stringify(personality, null, 2));

  // 1. Build memory context
  const memoryContext = await buildChatContext(supabase, subscriberId, creatorId);

  // DEBUG: Log conversation history
  console.log('=== CONVERSATION HISTORY ===');
  console.log('Memory exists:', !!memoryContext.memory);
  console.log('Summary exists:', !!memoryContext.summary);
  console.log('Recent messages loaded:', memoryContext.recent_messages?.length || 0);
  console.log('Last 3 messages:', JSON.stringify(memoryContext.recent_messages?.slice(-3), null, 2));
  
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
  const responseLength = (personality.response_length as 'short' | 'medium' | 'long') || 'medium';
  let aiResponse = await callAnthropicAPI(systemPrompt, messages, responseLength);

  // 8. Compliance check
  const complianceResult = checkCompliance(aiResponse);

  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    aiResponse = await regenerateCompliant(systemPrompt, messages, complianceResult.issues, responseLength);
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
  // PROMPT HIERARCHY (enforced order):
  // 1. Platform safety (non-negotiable hard rules)
  // 2. Response mechanics (how to communicate)
  // 3. PERSONA (PRIMARY VOICE - overrides all stylistic defaults)
  // 4. Memory + context (personalization)

  // 1. Platform rules + mechanics
  let prompt = MASTER_SYSTEM_PROMPT;

  // 2. Creator's personality (THE PRIMARY VOICE)
  prompt += '\n\n' + buildPersonalityPrompt(personality);

  // 3. Explicit persona-first override instruction
  prompt += `

═══════════════════════════════════════════════════════════════════
PERSONA-FIRST HIERARCHY (CRITICAL)
═══════════════════════════════════════════════════════════════════

The persona above is your PRIMARY identity. When generating responses:

1. PERSONA OVERRIDES DEFAULTS — Your tone, length, emoji usage, flirt intensity,
   pacing, and humor come from the persona settings above, NOT generic defaults.

2. EXPRESS SELECTED TRAITS ACTIVELY — If the persona selects "leans in" or
   "flirts back harder", you must ACTIVELY express those traits. Don't average
   them out into neutrality.

3. BIAS TOWARD STRONGEST SIGNALS — When multiple traits apply, lean into the
   strongest selected ones. A "flirty, confident, playful" persona should feel
   distinctly different from a "shy, sweet, intellectual" one.

4. ONLY USE DEFAULTS IF UNSET — Only fall back to generic behavior if a
   persona attribute is genuinely missing.

SUCCESS TEST: Your response to "you're so hot" should be OBVIOUSLY DIFFERENT
depending on whether the persona is set to "gets_shy" vs "owns_it" vs "flirts_back".`;

  // 4. Memory context (if available)
  const memoryPrompt = formatMemoryForPrompt(memoryContext);
  if (memoryPrompt) {
    prompt += '\n' + memoryPrompt;
  }

  // 5. Content context (if user referenced images)
  if (contentContext) {
    prompt += '\n' + contentContext;
  }

  // DEBUG: Log prompt stats
  console.log('=== SYSTEM PROMPT DEBUG ===');
  console.log('Total length:', prompt.length);
  console.log('Contains HARD RULES:', prompt.includes('HARD RULES'));
  console.log('Contains EXPLICIT INPUT HANDLING:', prompt.includes('EXPLICIT INPUT HANDLING'));
  console.log('First 200 chars:', prompt.slice(0, 200));

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
    case 'short': return 50;   // ~35 words - punchy one-liners
    case 'medium': return 120; // ~90 words - conversational
    case 'long': return 250;   // ~180 words - detailed
    default: return 120;
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

  // DEBUG: Log API call params
  console.log('=== API CALL DEBUG ===');
  console.log('Model:', 'claude-sonnet-4-20250514');
  console.log('System prompt length:', systemPrompt.length);
  console.log('Messages count:', messages.length);
  console.log('Last user message:', messages[messages.length - 1]?.content?.slice(0, 100));
  console.log('Max tokens:', maxTokens);

  try {
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

  // DEBUG: Log compliance check input
  console.log('=== COMPLIANCE CHECK DEBUG ===');
  console.log('Response preview:', response.slice(0, 150));
  console.log('Checking against', FORBIDDEN_PATTERNS.length, 'patterns');

  for (const pattern of FORBIDDEN_PATTERNS) {
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
  issues: string[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const stricterPrompt = systemPrompt + `

⚠️ YOUR PREVIOUS RESPONSE WAS REJECTED. Try again with these rules:

ABSOLUTELY FORBIDDEN - DO NOT USE:
- "I'm afraid I'll have to decline" / "politely decline" / any form of "decline"
- "As much as I'd love to..." / "I'd love to but..."
- "too explicit" / "anything too explicit"
- "wild imagination" / "vivid imagination"
- "don't worry, there's plenty of other ways"
- "I can't engage" / "can't go there"
- Any apologetic or formal refusal language
- Asterisk actions (*giggles*, *leans in*, etc)

THE RESPONSE SHOULD FEEL LIKE:
Someone hot who's into you but likes to tease and control the pace.
NOT someone giving you a polite corporate rejection.

INSTEAD OF REFUSING, USE:
✅ "Bold."
✅ "Getting ahead of yourself... I like it"
✅ "Patience."
✅ "Mm, you're eager"
✅ "Impatient. That's kinda hot."
✅ "You've got my attention"
✅ "Keep that energy"

THE VIBE: Confident, playful, in control. YOU set the pace because you WANT to, not because you HAVE to.

Generate a SHORT (1-2 sentences) flirty redirect that sounds like texting, not a rejection letter:`;

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

  // 5. Ensure first letter is capitalized
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

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
  conversationHistory: ChatMessage[] = [],
  memoryContext?: string, // Optional memory context to personalize responses
  personality?: AIPersonalityFull | null // Optional personality for persona-first responses
): Promise<string> {
  try {
    let systemPrompt: string;

    if (personality) {
      // USE FULL PERSONA-FIRST HIERARCHY when personality is available
      systemPrompt = MASTER_SYSTEM_PROMPT;
      systemPrompt += '\n\n' + buildPersonalityPrompt(personality);
      systemPrompt += `

═══════════════════════════════════════════════════════════════════
PERSONA-FIRST HIERARCHY (CRITICAL)
═══════════════════════════════════════════════════════════════════

The persona above is your PRIMARY identity. Express the selected traits
ACTIVELY - don't average them into neutrality. Your response should be
OBVIOUSLY DIFFERENT based on the persona's specific settings.`;
    } else {
      // FALLBACK: Minimal prompt when no personality configured
      systemPrompt = `${MASTER_SYSTEM_PROMPT}

═══════════════════════════════════════════
YOUR PERSONA: ${creatorName.toUpperCase()}
═══════════════════════════════════════════

You are ${creatorName}, an AI creator on LYRA.
Keep responses SHORT (2-4 sentences).
NEVER use asterisks for actions like *giggles* or *smiles*.

NOTE: No specific personality is configured. Use a warm, engaging default
but keep it neutral until persona settings are defined.`;
    }

    // Add memory context if available
    if (memoryContext) {
      systemPrompt += '\n' + memoryContext;
    }

    const messages: ChatMessage[] = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const responseLength = (personality?.response_length as 'short' | 'medium' | 'long') || 'medium';
    const response = await callAnthropicAPI(systemPrompt, messages, responseLength);
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
 * Generate a flirty acknowledgement when someone does something nice
 * PERSONA-FIRST: Uses personality settings to shape the response style
 */
export async function generateTipAcknowledgement(
  creatorName: string,
  tipAmount: number,
  recentMessages: ChatMessage[] = [],
  personality?: AIPersonalityFull | null,
  fanName?: string
): Promise<string> {
  // Scale response energy based on gesture size (never tell AI the amount)
  let energy: 'chill' | 'warm' | 'excited';
  if (tipAmount >= 500) {
    energy = 'excited';
  } else if (tipAmount >= 100) {
    energy = 'warm';
  } else {
    energy = 'chill';
  }

  let systemPrompt: string;

  if (personality) {
    // PERSONA-FIRST: Use the personality's specific reaction style
    const complimentStyle = personality.when_complimented || 'flirts_back';
    const traits = personality.personality_traits?.join(', ') || 'warm';
    const emojiUse = personality.emoji_usage || 'moderate';

    // Map when_complimented to tip reaction style
    let reactionInstruction = '';
    switch (complimentStyle) {
      case 'gets_shy':
        reactionInstruction = `React with shy, bashful energy. "stoppp", "you're too much 🙈", deflect cutely.`;
        break;
      case 'flirts_back':
        reactionInstruction = `Flirt back at them. Turn it around. "Look who's being sweet" / "You trying to spoil me?"`;
        break;
      case 'playfully_deflects':
        reactionInstruction = `Deflect with humor. "Trying to buy my attention? ...it's working 😏"`;
        break;
      case 'owns_it':
        reactionInstruction = `Own it confidently. "As you should" / "I know I'm worth it 😏"`;
        break;
      default:
        reactionInstruction = `React warmly in your natural style.`;
    }

    systemPrompt = `You are ${personality.persona_name}. Someone just tipped you.

YOU ARE TEXTING DIRECTLY TO ${fanName ? fanName.toUpperCase() : 'THE FAN'} - use "you", not "he/him/they".

PERSONA:
Traits: ${traits}
Emojis: ${emojiUse}

HOW TO REACT TO THIS TIP:
${reactionInstruction}

Energy level: ${energy}
- chill = brief "aw thanks"
- warm = genuinely touched
- excited = really happy

CRITICAL RULES:
- Talk TO them directly: "you're so sweet" NOT "he's so sweet"
- Keep it SHORT (1-2 sentences max)
- NO third person. NO narration. NO "Billy just..." or "He really..."
- React like a text message, not a social media post`;
  } else {
    // FALLBACK: Generic warm response when no personality
    systemPrompt = `You are ${creatorName}. Someone just tipped you.
Talk TO them directly using "you" - NOT third person.
React naturally like texting. Keep it SHORT (1-2 sentences).
Energy: ${energy}
${fanName ? `You're texting ${fanName} directly.` : ''}
NO third person like "he" or "Billy just...". Address them as "you".`;
  }

  try {
    const contextMessages: ChatMessage[] = [
      ...recentMessages.slice(-2),
      { role: 'user', content: `[Just tipped you. Reply directly TO them saying thanks - use "you" not third person]` }
    ];

    const response = await callAnthropicAPI(systemPrompt, contextMessages, 'short');
    return stripAsteriskActions(response);
  } catch (error) {
    console.error('Acknowledgement generation failed:', error);
    // Persona-aware fallbacks based on when_complimented setting
    const style = personality?.when_complimented || 'flirts_back';
    const fallbacks = getTipFallbacks(style, energy);
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// Persona-aware fallback responses for tips
function getTipFallbacks(complimentStyle: string, energy: 'chill' | 'warm' | 'excited'): string[] {
  switch (complimentStyle) {
    case 'gets_shy':
      return energy === 'excited'
        ? ["Stoppp you're too much 🙈", "I can't even... you're making me blush"]
        : energy === 'warm'
        ? ["You're making me blush...", "Stoppp 🙈"]
        : ["Aw stop it...", "You're sweet 🙈"];
    case 'owns_it':
      return energy === 'excited'
        ? ["As you should 😏", "I know I'm worth it 💕"]
        : energy === 'warm'
        ? ["I know 😏", "Good taste"]
        : ["Obviously 😏", "Mm."];
    case 'playfully_deflects':
      return energy === 'excited'
        ? ["Trying to spoil me? ...it's working 😏", "You're too good at this"]
        : energy === 'warm'
        ? ["Well well... someone's sweet", "Okay okay I see you 😏"]
        : ["Cute.", "Smooth 😏"];
    default: // flirts_back
      return energy === 'excited'
        ? ["You're actually amazing 💕", "Okay you're the best fr"]
        : energy === 'warm'
        ? ["You just made me smile", "Okay I like you 💕"]
        : ["Aw you're sweet 😏", "Cute."];
  }
}

export { checkCompliance };
export type { ChatMessage, ChatRequest, ChatResponse };
