// ===========================================
// PROMPT BUILDER SERVICE
// Assembles the complete prompt with all dynamic context
// ===========================================

import {
  MASTER_SYSTEM_PROMPT_V2,
  buildDynamicContext,
  ConversationStateContext,
  UserPreferenceContext
} from './master-prompt-v2';
import {
  ConversationStateService,
  getConversationStateService,
  endsWithQuestion,
  getFirstWord
} from './conversation-state';
import {
  MemoryService,
  getMemoryService
} from './memory-service';
import {
  UserPreferencesService,
  getUserPreferencesService
} from './user-preferences';
import {
  MessageAnalyticsService,
  getMessageAnalyticsService,
  countEmojis
} from './message-analytics';
import { getFewShotExamples, ANTI_PATTERN_EXAMPLES, LENGTH_GUIDE } from './few-shot-examples';
import { buildPersonalityPrompt } from '../personality/prompt-builder';
import { AIPersonalityFull } from '../personality/prompt-builder';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface ChatContext {
  conversationId: string;
  userId: string;
  personaId: string;
  persona: AIPersonalityFull;
  currentMessage: string;
  previousBotMessageId?: string;
  abTestVariant?: string;
}

export interface BuiltPrompt {
  systemPrompt: string;
  analyticsId: string;
}

// ===========================================
// PROMPT BUILDER SERVICE
// ===========================================

export class PromptBuilderService {
  private stateService: ConversationStateService;
  private memoryService: MemoryService;
  private prefsService: UserPreferencesService;
  private analyticsService: MessageAnalyticsService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.stateService = getConversationStateService(supabaseUrl, supabaseKey);
    this.memoryService = getMemoryService(supabaseUrl, supabaseKey);
    this.prefsService = getUserPreferencesService(supabaseUrl, supabaseKey);
    this.analyticsService = getMessageAnalyticsService(supabaseUrl, supabaseKey);
  }

  // ===========================================
  // BUILD COMPLETE PROMPT
  // ===========================================

  async buildPrompt(context: ChatContext): Promise<BuiltPrompt> {
    const startTime = Date.now();

    // 1. Get or create conversation state
    const state = await this.stateService.getState(
      context.conversationId,
      context.userId,
      context.personaId
    );

    // 2. Update state with incoming user message
    await this.stateService.updateWithUserMessage(
      context.conversationId,
      context.currentMessage
    );

    // 3. Get user preferences
    const prefs = await this.prefsService.getPreferences(
      context.userId,
      context.personaId
    );

    // 4. Generate guidance from state
    const stateGuidance = this.stateService.generateGuidance(state);

    // 5. Generate preference hints
    const prefHints = this.prefsService.generatePreferenceHints(prefs);

    // 6. Get relevant memories
    const memories = await this.memoryService.getRelevantMemories(
      context.userId,
      context.personaId,
      context.currentMessage,
      state.messagesThisSession
    );
    const memoryContext = this.memoryService.formatMemoriesForPrompt(memories);

    // 7. Get few-shot examples for current heat level
    // Cast when_complimented to expected type (may be free-form string in DB)
    const validComplimentResponses = ['gets_shy', 'flirts_back', 'playfully_deflects', 'owns_it'] as const;
    const whenComplimented = validComplimentResponses.includes(context.persona.when_complimented as any)
      ? context.persona.when_complimented as typeof validComplimentResponses[number]
      : undefined;

    // Cast dynamic to expected type (may be free-form string in DB)
    const validDynamics = ['submissive', 'switch', 'dominant'] as const;
    const dynamic = validDynamics.includes(context.persona.dynamic as any)
      ? context.persona.dynamic as typeof validDynamics[number]
      : undefined;

    // Cast emoji_usage to expected type (may be free-form string in DB)
    const validEmojiUsage = ['none', 'minimal', 'moderate', 'heavy'] as const;
    const emojiUsage = validEmojiUsage.includes(context.persona.emoji_usage as any)
      ? context.persona.emoji_usage as typeof validEmojiUsage[number]
      : undefined;

    const fewShotExamples = getFewShotExamples(
      stateGuidance.heatLevel,
      {
        dynamic,
        when_complimented: whenComplimented,
        emoji_usage: emojiUsage,
      }
    );

    // 8. Build persona prompt section
    const personaPrompt = buildPersonalityPrompt(context.persona);

    // 9. Build dynamic context
    const dynamicContext = buildDynamicContext({
      conversationState: {
        guidance: stateGuidance.guidance,
        heatLevel: stateGuidance.heatLevel,
        messageCount: stateGuidance.messageCount,
      },
      memoryContext,
      userPreferences: {
        hints: prefHints.hints,
      },
      fewShotExamples: fewShotExamples + '\n' + LENGTH_GUIDE,
    });

    // 10. Assemble complete system prompt
    const systemPrompt = [
      MASTER_SYSTEM_PROMPT_V2,
      personaPrompt,
      dynamicContext,
      ANTI_PATTERN_EXAMPLES,
    ].join('\n\n');

    // 11. Log analytics
    const analyticsId = await this.analyticsService.logMessage({
      messageId: crypto.randomUUID(),
      conversationId: context.conversationId,
      userId: context.userId,
      personaId: context.personaId,
      isUserMessage: true,
      messageLength: context.currentMessage.length,
      heatLevel: stateGuidance.heatLevel,
      endedWithQuestion: endsWithQuestion(context.currentMessage),
      emojiCount: countEmojis(context.currentMessage),
      startedWith: getFirstWord(context.currentMessage),
      sessionMessageNumber: state.messagesThisSession,
      priorHeatLevel: state.currentHeatLevel,
      abTestVariant: context.abTestVariant,
    });

    // 12. Update engagement on previous bot message if exists
    if (context.previousBotMessageId) {
      const responseTime = (Date.now() - startTime) / 1000;
      await this.analyticsService.updateEngagement(context.previousBotMessageId, {
        userReplied: true,
        replyDelaySeconds: responseTime,
        replyLength: context.currentMessage.length,
        sessionContinued: true,
      });
    }

    // 13. Update user preferences with this message
    await this.prefsService.updateWithMessage(
      context.userId,
      context.personaId,
      {
        messageLength: context.currentMessage.length,
        responseTimeSeconds: (Date.now() - startTime) / 1000,
        heatLevel: stateGuidance.heatLevel,
        userUsedEmoji: countEmojis(context.currentMessage) > 0,
        userAskedQuestion: endsWithQuestion(context.currentMessage),
        sessionMessageNumber: state.messagesThisSession,
      }
    );

    // 14. Extract and save any new memories from message
    const extractedMemories = this.memoryService.extractMemoriesFromMessage(
      context.currentMessage
    );

    for (const memory of extractedMemories) {
      await this.memoryService.saveMemory(
        context.userId,
        context.personaId,
        memory.category,
        memory.fact,
        'user_stated'
      );
    }

    return {
      systemPrompt,
      analyticsId,
    };
  }

  // ===========================================
  // POST-RESPONSE PROCESSING
  // ===========================================

  async processResponse(
    conversationId: string,
    botResponse: string,
    analyticsId: string,
    userId: string,
    personaId: string
  ): Promise<void> {
    // Update conversation state with bot message
    await this.stateService.updateWithBotMessage(conversationId, botResponse);

    // Get current state for heat level
    const state = await this.stateService.getState(conversationId, userId, personaId);

    // Log bot message analytics
    await this.analyticsService.logMessage({
      messageId: analyticsId,
      conversationId,
      userId,
      personaId,
      isUserMessage: false,
      messageLength: botResponse.length,
      heatLevel: state.currentHeatLevel,
      endedWithQuestion: endsWithQuestion(botResponse),
      emojiCount: countEmojis(botResponse),
      startedWith: getFirstWord(botResponse),
      sessionMessageNumber: state.messagesThisSession,
      priorHeatLevel: state.currentHeatLevel,
    });
  }
}

// ===========================================
// SINGLETON EXPORT
// ===========================================

let promptBuilder: PromptBuilderService | null = null;

export function getPromptBuilder(
  supabaseUrl?: string,
  supabaseKey?: string
): PromptBuilderService {
  if (!promptBuilder) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required for first initialization');
    }
    promptBuilder = new PromptBuilderService(supabaseUrl, supabaseKey);
  }
  return promptBuilder;
}
