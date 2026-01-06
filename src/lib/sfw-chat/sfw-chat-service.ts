// ===========================================
// SFW / COMPANION CHAT SERVICE
// Completely separate from NSFW chat service
// DO NOT MODIFY NSFW CHAT - THIS IS A PARALLEL SYSTEM
// ===========================================

import { SFWPersonalityConfig } from './types';
import { buildSFWSystemPrompt } from './sfw-prompt-builder';

// ===========================================
// TYPES
// ===========================================

interface SFWChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SFWChatRequest {
  creatorId: string;
  subscriberId: string;
  message: string;
  conversationHistory?: SFWChatMessage[];
}

interface SFWChatResponse {
  reply: string;
  tokensUsed: number;
}

// ===========================================
// SFW CONTENT MODERATION
// Additional layer for SFW mode
// ===========================================

const EXPLICIT_PATTERNS = [
  /\b(fuck|cock|dick|pussy|cum|orgasm|naked|nude|sex)\b/i,
  /\b(blowjob|handjob|anal|oral)\b/i,
  /\bwhat are you wearing\b/i,
  /\btake off your\b/i,
  /\bshow me your\b/i,
];

function containsExplicitContent(message: string): boolean {
  return EXPLICIT_PATTERNS.some((pattern) => pattern.test(message));
}

// Pre-check user messages and add context if explicit
function preprocessUserMessage(message: string): {
  message: string;
  needsRedirection: boolean;
} {
  if (containsExplicitContent(message)) {
    return {
      message,
      needsRedirection: true,
    };
  }
  return { message, needsRedirection: false };
}

// ===========================================
// SFW MEMORY SERVICE (SAFE FACTS ONLY)
// Separate from NSFW memory
// ===========================================

interface SFWSafeMemory {
  preferred_name?: string;
  interests?: string[];
  preferences?: {
    reply_length?: string;
    topics_enjoyed?: string[];
  };
}

async function getSFWMemory(
  subscriberId: string,
  creatorId: string
): Promise<SFWSafeMemory | null> {
  // TODO: Implement Supabase query to sfw_user_memory table
  // This is separate from NSFW memory table
  return null;
}

async function updateSFWMemory(
  subscriberId: string,
  creatorId: string,
  memory: Partial<SFWSafeMemory>
): Promise<void> {
  // TODO: Implement Supabase upsert to sfw_user_memory table
}

// ===========================================
// MAIN SFW CHAT FUNCTION
// ===========================================

export async function handleSFWChat(
  request: SFWChatRequest,
  config: SFWPersonalityConfig
): Promise<SFWChatResponse> {
  // 1. Preprocess user message
  const { message, needsRedirection } = preprocessUserMessage(request.message);

  // 2. Get SFW-safe memory
  const memory = await getSFWMemory(request.subscriberId, request.creatorId);

  // 3. Build system prompt (SFW version)
  let systemPrompt = buildSFWSystemPrompt(config);

  // 4. Add memory context if exists
  if (memory) {
    systemPrompt += `
    
USER CONTEXT (from memory):
${memory.preferred_name ? `• User prefers to be called: ${memory.preferred_name}` : ''}
${memory.interests?.length ? `• Interests: ${memory.interests.join(', ')}` : ''}
`;
  }

  // 5. Add redirection hint if message was explicit
  if (needsRedirection) {
    systemPrompt += `

IMPORTANT: The user's message contains explicit content.
Respond with a playful, non-judgmental redirection.
Do NOT engage with the explicit request.
Do NOT scold or lecture.
Simply pivot to a different topic naturally.
Example: "Hmm, I think I'd rather hear about your day 😊 What have you been up to?"
`;
  }

  // 6. Build messages array
  const messages: SFWChatMessage[] = [
    ...(request.conversationHistory || []),
    { role: 'user', content: message },
  ];

  // 7. Call AI (Claude/OpenAI)
  // TODO: Implement actual API call
  const response = await callSFWAI(systemPrompt, messages);

  // 8. Post-process response (ensure SFW)
  const cleanedReply = postProcessSFWResponse(response.reply);

  // 9. Extract and save any memory updates
  await extractAndSaveSFWMemory(request.subscriberId, request.creatorId, message, cleanedReply);

  return {
    reply: cleanedReply,
    tokensUsed: response.tokensUsed,
  };
}

// ===========================================
// AI CALL (PLACEHOLDER)
// ===========================================

async function callSFWAI(
  systemPrompt: string,
  messages: SFWChatMessage[]
): Promise<{ reply: string; tokensUsed: number }> {
  // TODO: Implement actual API call to Claude/OpenAI
  // This should be a separate endpoint or use a mode flag
  // to ensure SFW responses

  // Placeholder response
  return {
    reply: "Hey! I'd love to chat more about that 😊 What else is on your mind?",
    tokensUsed: 100,
  };
}

// ===========================================
// POST-PROCESSING
// Final safety check on AI response
// ===========================================

function postProcessSFWResponse(response: string): string {
  // Additional safety: if AI somehow generated explicit content, clean it
  // This shouldn't happen with proper prompting, but belt-and-suspenders

  let cleaned = response;

  // Remove any accidentally generated explicit terms
  const explicitTerms = ['fuck', 'cock', 'pussy', 'cum', 'dick'];
  explicitTerms.forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '***');
  });

  return cleaned;
}

// ===========================================
// MEMORY EXTRACTION (SFW-SAFE)
// ===========================================

async function extractAndSaveSFWMemory(
  subscriberId: string,
  creatorId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  // Extract safe facts only:
  // - Name preferences: "call me X", "my name is X"
  // - Interests: "I love X", "I'm into X"
  // - Preferences: "I prefer X"

  const nameMatch = userMessage.match(/(?:call me|my name is|i'm|i am)\s+(\w+)/i);
  if (nameMatch) {
    await updateSFWMemory(subscriberId, creatorId, {
      preferred_name: nameMatch[1],
    });
  }

  // More extraction logic can be added here
}

// ===========================================
// PRICING CALCULATION (SFW)
// Separate from NSFW pricing
// ===========================================

export function calculateSFWMessageCost(
  config: SFWPersonalityConfig,
  isSubscriber: boolean
): number {
  if (config.pricing_model === 'included' && isSubscriber) {
    return 0;
  }
  return config.price_per_message;
}

// ===========================================
// EXPORTS
// ===========================================

export type { SFWChatMessage, SFWChatRequest, SFWChatResponse };
