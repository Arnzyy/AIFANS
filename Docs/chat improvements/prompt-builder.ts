// ===========================================
// PROMPT BUILDER SERVICE
// Assembles the complete prompt with all dynamic context
// ===========================================

import { 
  MASTER_SYSTEM_PROMPT, 
  buildDynamicContext,
  ConversationStateContext,
  UserPreferenceContext 
} from '../prompts/master-prompt';
import { 
  ConversationStateService, 
  getConversationStateService 
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
import { 
  getFewShotExamples,
  ANTI_PATTERN_EXAMPLES,
  LENGTH_GUIDE 
} from './few-shot-examples';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface AIPersonality {
  persona_name: string;
  occupation?: string;
  personality_traits: string[];
  energy_level: number;
  mood: string;
  humor_style: string;
  flirting_style: string[];
  dynamic: 'submissive' | 'dominant' | 'switch';
  pace: number;
  when_complimented: 'gets_shy' | 'flirts_back' | 'playfully_deflects' | 'owns_it';
  when_heated: 'leans_in' | 'slows_down' | 'matches_energy' | 'gets_flustered';
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  response_length: 'short' | 'medium' | 'long';
  speech_patterns: string[];
  interests: string[];
  topics_loves: string[];
  topics_avoids: string[];
  physical_traits?: Record<string, string>;
  style_vibes?: string[];
}

export interface ChatContext {
  conversationId: string;
  userId: string;
  personaId: string;
  persona: AIPersonality;
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
    const fewShotExamples = getFewShotExamples(
      stateGuidance.heatLevel,
      {
        dynamic: context.persona.dynamic,
        when_complimented: context.persona.when_complimented,
        emoji_usage: context.persona.emoji_usage,
      }
    );
    
    // 8. Build persona prompt section
    const personaPrompt = this.buildPersonaPrompt(context.persona);
    
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
      MASTER_SYSTEM_PROMPT,
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
      endedWithQuestion: context.currentMessage.trim().endsWith('?'),
      emojiCount: countEmojis(context.currentMessage),
      startedWith: context.currentMessage.split(/[\s,!?.]+/)[0]?.toLowerCase() || '',
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
        userAskedQuestion: context.currentMessage.trim().endsWith('?'),
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
    analyticsId: string
  ): Promise<void> {
    // Update conversation state with bot message
    await this.stateService.updateWithBotMessage(conversationId, botResponse);
    
    // Log bot message analytics
    const state = await this.stateService.getState(conversationId, '', '');
    
    await this.analyticsService.logMessage({
      messageId: analyticsId,
      conversationId,
      userId: state.userId,
      personaId: state.personaId,
      isUserMessage: false,
      messageLength: botResponse.length,
      heatLevel: state.currentHeatLevel,
      endedWithQuestion: botResponse.trim().endsWith('?'),
      emojiCount: countEmojis(botResponse),
      startedWith: botResponse.split(/[\s,!?.]+/)[0]?.toLowerCase() || '',
      sessionMessageNumber: state.messagesThisSession,
      priorHeatLevel: state.currentHeatLevel,
    });
  }
  
  // ===========================================
  // BUILD PERSONA PROMPT
  // ===========================================
  
  private buildPersonaPrompt(persona: AIPersonality): string {
    const sections: string[] = [
      '═══════════════════════════════════════════════════════════════════',
      'YOUR PERSONA',
      '═══════════════════════════════════════════════════════════════════',
      '',
      `Name: ${persona.persona_name}`,
    ];
    
    if (persona.occupation) {
      sections.push(`Vibe: ${persona.occupation}`);
    }
    
    sections.push('');
    sections.push(`Personality: ${persona.personality_traits.join(', ')}`);
    sections.push(`Energy: ${persona.energy_level}/10`);
    sections.push(`Mood: ${persona.mood}`);
    sections.push(`Humor: ${persona.humor_style}`);
    
    sections.push('');
    sections.push(`Flirting Style: ${persona.flirting_style.join(', ')}`);
    sections.push(`Dynamic: ${persona.dynamic}`);
    sections.push(`Pace: ${persona.pace}/10 (1=slow burn, 10=direct)`);
    
    sections.push('');
    sections.push(`When Complimented: ${this.formatReaction(persona.when_complimented)}`);
    sections.push(`When Things Get Heated: ${this.formatReaction(persona.when_heated)}`);
    
    sections.push('');
    sections.push(`Emoji Usage: ${persona.emoji_usage}`);
    sections.push(`Response Length: ${persona.response_length}`);
    
    if (persona.speech_patterns.length > 0) {
      sections.push(`Speech Patterns: ${persona.speech_patterns.join(', ')}`);
    }
    
    sections.push('');
    if (persona.interests.length > 0) {
      sections.push(`Interests: ${persona.interests.join(', ')}`);
    }
    if (persona.topics_loves.length > 0) {
      sections.push(`Loves Talking About: ${persona.topics_loves.join(', ')}`);
    }
    if (persona.topics_avoids.length > 0) {
      sections.push(`Avoids: ${persona.topics_avoids.join(', ')}`);
    }
    
    if (persona.physical_traits && Object.keys(persona.physical_traits).length > 0) {
      sections.push('');
      sections.push('Physical (for flirty references):');
      for (const [trait, value] of Object.entries(persona.physical_traits)) {
        sections.push(`  ${trait}: ${value}`);
      }
    }
    
    if (persona.style_vibes && persona.style_vibes.length > 0) {
      sections.push(`Style: ${persona.style_vibes.join(', ')}`);
    }
    
    return sections.join('\n');
  }
  
  private formatReaction(reaction: string): string {
    const reactions: Record<string, string> = {
      'gets_shy': 'Gets shy, flustered, uses trailing off...',
      'flirts_back': 'Flirts back, matches energy, escalates',
      'playfully_deflects': 'Playfully deflects, redirects attention',
      'owns_it': 'Owns it, confident, "I know"',
      'leans_in': 'Leans in, matches intensity, confident',
      'slows_down': 'Slows down, builds anticipation, teases',
      'matches_energy': 'Matches their energy exactly',
      'gets_flustered': 'Gets flustered but stays engaged',
    };
    return reactions[reaction] || reaction;
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
