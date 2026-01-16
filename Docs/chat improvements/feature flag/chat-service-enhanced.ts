// ===========================================
// ENHANCED CHAT SERVICE
// Drop-in replacement for generateChatResponse with new features
// ===========================================

import { createClient } from '@supabase/supabase-js';
import { MASTER_SYSTEM_PROMPT, FORBIDDEN_PATTERNS } from './master-prompt';
import { buildPersonalityPrompt, AIPersonalityFull } from './personality/prompt-builder';
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
import { shouldUseEnhancedChat, shouldLogAnalytics } from '../config/feature-flags';

// Import new services
import { 
  ConversationStateService,
  detectHeatLevel,
  classifyLength,
  getFirstWord,
  endsWithQuestion 
} from '../services/conversation-state';
import { MemoryService } from '../services/memory-service';
import { UserPreferencesService } from '../services/user-preferences';
import { MessageAnalyticsService, countEmojis } from '../services/message-analytics';
import { getFewShotExamples, ANTI_PATTERN_EXAMPLES, LENGTH_GUIDE } from '../services/few-shot-examples';

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
  referenced_content?: string[];
}

// ===========================================
// SERVICE INSTANCES (Lazy initialized)
// ===========================================

let stateService: ConversationStateService | null = null;
let memoryServiceNew: MemoryService | null = null;
let prefsService: UserPreferencesService | null = null;
let analyticsService: MessageAnalyticsService | null = null;

function getServices(supabaseUrl: string, supabaseKey: string) {
  if (!stateService) {
    stateService = new ConversationStateService(supabaseUrl, supabaseKey);
  }
  if (!memoryServiceNew) {
    memoryServiceNew = new MemoryService(supabaseUrl, supabaseKey);
  }
  if (!prefsService) {
    prefsService = new UserPreferencesService(supabaseUrl, supabaseKey);
  }
  if (!analyticsService) {
    analyticsService = new MessageAnalyticsService(supabaseUrl, supabaseKey);
  }
  return { stateService, memoryServiceNew, prefsService, analyticsService };
}

// ===========================================
// MAIN ENHANCED CHAT FUNCTION
// ===========================================

export async function generateChatResponseEnhanced(
  supabase: ReturnType<typeof createClient>,
  request: ChatRequest,
  personality: AIPersonalityFull
): Promise<ChatResponse> {
  const { subscriberId, creatorId, message } = request;
  
  // Check if we should use enhanced system
  const useEnhanced = shouldUseEnhancedChat(subscriberId, creatorId);
  
  if (!useEnhanced) {
    // Fall back to original implementation
    return generateChatResponseOriginal(supabase, request, personality);
  }
  
  // Initialize services
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const services = getServices(supabaseUrl, supabaseKey);
  
  // 1. Get or create conversation
  let conversationId = request.conversationId;
  if (!conversationId) {
    const { data: existingConv } = await supabase
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
      const { data: newConv } = await supabase
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

  // 2. Get conversation state and update with user message
  const state = await services.stateService!.getState(
    conversationId!,
    subscriberId,
    creatorId
  );
  await services.stateService!.updateWithUserMessage(conversationId!, message);
  
  // 3. Generate state guidance
  const stateGuidance = services.stateService!.generateGuidance(state);
  
  // 4. Get user preferences and generate hints
  const prefs = await services.prefsService!.getPreferences(subscriberId, creatorId);
  const prefHints = services.prefsService!.generatePreferenceHints(prefs);
  
  // 5. Get relevant memories (new system)
  const relevantMemories = await services.memoryServiceNew!.getRelevantMemories(
    subscriberId,
    creatorId,
    message,
    state.messagesThisSession
  );
  const newMemoryContext = services.memoryServiceNew!.formatMemoriesForPrompt(relevantMemories);
  
  // 6. Also get old memory system context (for compatibility)
  const oldMemoryContext = await buildChatContext(supabase, subscriberId, creatorId);
  
  // 7. Check for content references
  let contentContext = '';
  let referencedContentIds: string[] = [];
  
  if (detectContentReference(message)) {
    const matches = await findMatchingContent(supabase, creatorId, message);
    if (matches.length > 0) {
      contentContext = buildContentContext(matches);
      referencedContentIds = matches.map(m => m.content.id);
    }
  }
  
  // 8. Get dynamic few-shot examples
  const fewShotExamples = getFewShotExamples(
    stateGuidance.heatLevel,
    {
      dynamic: personality.dynamic,
      when_complimented: personality.when_complimented as any,
      emoji_usage: personality.emoji_usage,
    }
  );
  
  // 9. Build the enhanced system prompt
  const systemPrompt = buildEnhancedSystemPrompt(
    personality,
    oldMemoryContext,
    contentContext,
    {
      stateGuidance: stateGuidance.guidance,
      heatLevel: stateGuidance.heatLevel,
      messageCount: stateGuidance.messageCount,
      prefHints: prefHints.hints,
      newMemoryContext,
      fewShotExamples,
    }
  );
  
  // 10. Save user message
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'user',
    content: message,
  });
  
  // 11. Build messages array
  const messages: ChatMessage[] = [
    ...oldMemoryContext.recent_messages.slice(-20),
    { role: 'user', content: message },
  ];
  
  // 12. Generate AI response
  let aiResponse = await callAnthropicAPI(systemPrompt, messages, personality.response_length);
  
  // 13. Compliance check
  const complianceResult = checkCompliance(aiResponse);
  
  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    aiResponse = await regenerateCompliant(systemPrompt, messages, complianceResult.issues, personality.response_length);
  }
  
  // 14. Post-processing
  aiResponse = stripAsteriskActions(aiResponse);
  
  // 15. Save AI response
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'assistant',
    content: aiResponse,
  });
  
  // 16. Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
  
  // 17. Update conversation state with bot response
  await services.stateService!.updateWithBotMessage(conversationId!, aiResponse);
  
  // 18. Update user preferences
  await services.prefsService!.updateWithMessage(subscriberId, creatorId, {
    messageLength: message.length,
    responseTimeSeconds: 0, // Would need to track this properly
    heatLevel: stateGuidance.heatLevel,
    userUsedEmoji: countEmojis(message) > 0,
    userAskedQuestion: message.trim().endsWith('?'),
    sessionMessageNumber: state.messagesThisSession,
  });
  
  // 19. Log analytics (if enabled)
  if (shouldLogAnalytics()) {
    await services.analyticsService!.logMessage({
      messageId: crypto.randomUUID(),
      conversationId: conversationId!,
      userId: subscriberId,
      personaId: creatorId,
      isUserMessage: true,
      messageLength: message.length,
      heatLevel: stateGuidance.heatLevel,
      endedWithQuestion: message.trim().endsWith('?'),
      emojiCount: countEmojis(message),
      startedWith: getFirstWord(message),
      sessionMessageNumber: state.messagesThisSession,
      priorHeatLevel: state.currentHeatLevel,
    });
    
    await services.analyticsService!.logMessage({
      messageId: crypto.randomUUID(),
      conversationId: conversationId!,
      userId: subscriberId,
      personaId: creatorId,
      isUserMessage: false,
      messageLength: aiResponse.length,
      heatLevel: stateGuidance.heatLevel,
      endedWithQuestion: aiResponse.trim().endsWith('?'),
      emojiCount: countEmojis(aiResponse),
      startedWith: getFirstWord(aiResponse),
      sessionMessageNumber: state.messagesThisSession + 1,
      priorHeatLevel: stateGuidance.heatLevel,
    });
  }
  
  // 20. Extract and save new memories
  const extractedMemories = services.memoryServiceNew!.extractMemoriesFromMessage(message);
  for (const memory of extractedMemories) {
    await services.memoryServiceNew!.saveMemory(
      subscriberId,
      creatorId,
      memory.category,
      memory.fact,
      'user_stated'
    );
  }
  
  // 21. Background old memory update (for compatibility)
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
// ENHANCED SYSTEM PROMPT BUILDER
// ===========================================

interface EnhancedContext {
  stateGuidance: string[];
  heatLevel: number;
  messageCount: number;
  prefHints: string[];
  newMemoryContext: string;
  fewShotExamples: string;
}

function buildEnhancedSystemPrompt(
  personality: AIPersonalityFull,
  memoryContext: ConversationContext,
  contentContext: string,
  enhanced: EnhancedContext
): string {
  // 1. Platform rules + mechanics (unchanged)
  let prompt = MASTER_SYSTEM_PROMPT;

  // 2. Creator's personality
  prompt += '\n\n' + buildPersonalityPrompt(personality);

  // 3. Persona-first hierarchy
  prompt += `

═══════════════════════════════════════════════════════════════════
PERSONA-FIRST HIERARCHY (CRITICAL)
═══════════════════════════════════════════════════════════════════

The persona above is your PRIMARY identity. When generating responses:

1. PERSONA OVERRIDES DEFAULTS — Your tone, length, emoji usage, flirt intensity,
   pacing, and humor come from the persona settings above, NOT generic defaults.

2. EXPRESS SELECTED TRAITS ACTIVELY — If the persona selects "leans in" or
   "flirts back harder", you must ACTIVELY express those traits.

3. BIAS TOWARD STRONGEST SIGNALS — When multiple traits apply, lean into the
   strongest selected ones.

4. ONLY USE DEFAULTS IF UNSET — Only fall back to generic behavior if a
   persona attribute is genuinely missing.`;

  // 4. NEW: Conversation state guidance
  if (enhanced.stateGuidance.length > 0) {
    prompt += `

═══════════════════════════════════════════════════════════════════
CONVERSATION STATE (FOLLOW THESE NOW)
═══════════════════════════════════════════════════════════════════

Current heat level: ${enhanced.heatLevel}/10
Messages this session: ${enhanced.messageCount}

${enhanced.stateGuidance.map(g => `• ${g}`).join('\n')}`;
  }

  // 5. NEW: User preference hints
  if (enhanced.prefHints.length > 0) {
    prompt += `

═══════════════════════════════════════════════════════════════════
USER PREFERENCES (ADAPT TO THIS USER)
═══════════════════════════════════════════════════════════════════

${enhanced.prefHints.map(h => `• ${h}`).join('\n')}`;
  }

  // 6. NEW: Enhanced memory context
  if (enhanced.newMemoryContext && enhanced.newMemoryContext !== 'No memory context available yet.') {
    prompt += `

═══════════════════════════════════════════════════════════════════
WHAT YOU KNOW ABOUT THIS USER (USE NATURALLY)
═══════════════════════════════════════════════════════════════════

${enhanced.newMemoryContext}

Remember: Reference these details to make them feel seen, but weave them in naturally. Don't announce that you remember things.`;
  }

  // 7. Old memory context (for compatibility)
  const oldMemoryPrompt = formatMemoryForPrompt(memoryContext);
  if (oldMemoryPrompt) {
    prompt += '\n' + oldMemoryPrompt;
  }

  // 8. Content context
  if (contentContext) {
    prompt += '\n' + contentContext;
  }

  // 9. NEW: Dynamic few-shot examples
  prompt += `

═══════════════════════════════════════════════════════════════════
EXAMPLES FOR CURRENT CONTEXT
═══════════════════════════════════════════════════════════════════

${enhanced.fewShotExamples}

${LENGTH_GUIDE}`;

  // 10. NEW: Anti-pattern reminder
  prompt += `

${ANTI_PATTERN_EXAMPLES}`;

  // 11. NEW: Self-check before responding
  prompt += `

═══════════════════════════════════════════════════════════════════
SELF-CHECK BEFORE RESPONDING
═══════════════════════════════════════════════════════════════════

Before you respond, verify:
□ Not starting the same way as your last message
□ Not ending with a question if you asked one recently
□ Length matches their energy
□ No asterisk actions (*smiles*, etc.)
□ No forbidden phrases
□ Sounds like texting, not scripting

Now respond naturally as your persona:`;

  return prompt;
}

// ===========================================
// ORIGINAL IMPLEMENTATION (FALLBACK)
// This is a copy of your existing generateChatResponse
// ===========================================

async function generateChatResponseOriginal(
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
    const { data: existingConv } = await supabase
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
      const { data: newConv } = await supabase
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
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    creator_id: creatorId,
    subscriber_id: subscriberId,
    role: 'user',
    content: message,
  });

  // 5. Build complete system prompt (original way)
  let systemPrompt = MASTER_SYSTEM_PROMPT;
  systemPrompt += '\n\n' + buildPersonalityPrompt(personality);
  systemPrompt += `

═══════════════════════════════════════════════════════════════════
PERSONA-FIRST HIERARCHY (CRITICAL)
═══════════════════════════════════════════════════════════════════

The persona above is your PRIMARY identity.`;

  const memoryPrompt = formatMemoryForPrompt(memoryContext);
  if (memoryPrompt) {
    systemPrompt += '\n' + memoryPrompt;
  }

  if (contentContext) {
    systemPrompt += '\n' + contentContext;
  }

  // 6. Build messages array
  const messages: ChatMessage[] = [
    ...memoryContext.recent_messages.slice(-20),
    { role: 'user', content: message },
  ];

  // 7. Generate AI response
  let aiResponse = await callAnthropicAPI(systemPrompt, messages, personality.response_length);

  // 8. Compliance check
  const complianceResult = checkCompliance(aiResponse);

  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    aiResponse = await regenerateCompliant(systemPrompt, messages, complianceResult.issues, personality.response_length);
  }

  aiResponse = stripAsteriskActions(aiResponse);

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
// ANTHROPIC API (Same as original)
// ===========================================

function getMaxTokensForLength(responseLength: 'short' | 'medium' | 'long' = 'medium'): number {
  switch (responseLength) {
    case 'short': return 100;
    case 'medium': return 250;
    case 'long': return 500;
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
// COMPLIANCE (Same as original)
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

⚠️ YOUR PREVIOUS RESPONSE WAS REJECTED. Try again with these rules:

ABSOLUTELY FORBIDDEN - DO NOT USE:
- Any apologetic or formal refusal language
- Asterisk actions (*giggles*, *leans in*, etc)
- "As much as I'd love to..." / "I appreciate the energy but..."

INSTEAD USE:
✅ "Bold."
✅ "Getting ahead of yourself... I like it"
✅ "Patience."
✅ "Mm, you're eager"

Generate a SHORT (1-2 sentences) flirty redirect:`;

  return await callAnthropicAPI(stricterPrompt, messages, responseLength);
}

// ===========================================
// HELPERS (Same as original)
// ===========================================

function stripAsteriskActions(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 20) {
    cleaned = cleaned.replace(/^(Oh,?\s*|Well,?\s*|Hmm,?\s*|Ahh?,?\s*)/i, '');
  }
  if (!cleaned || cleaned.length < 2) {
    return "Hey you 😏";
  }
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned;
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

export { checkCompliance };
export type { ChatMessage, ChatRequest, ChatResponse };
