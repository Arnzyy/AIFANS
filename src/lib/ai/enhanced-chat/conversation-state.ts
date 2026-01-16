// ===========================================
// CONVERSATION STATE TRACKING SERVICE
// Tracks conversation patterns to prevent repetition
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface ConversationState {
  conversationId: string;
  userId: string;
  personaId: string;

  // Pattern tracking
  lastResponseEndedWithQuestion: boolean;
  lastResponseLength: 'short' | 'medium' | 'long';
  lastResponseStartedWith: string;
  questionsInLast5Messages: number;

  // Heat tracking
  currentHeatLevel: number; // 1-10
  peakHeatLevel: number;

  // Session tracking
  messagesThisSession: number;
  sessionStartedAt: Date;

  // Recent message history (for pattern detection)
  recentBotMessages: RecentMessage[];
  recentUserMessages: RecentMessage[];
}

export interface RecentMessage {
  content: string;
  length: number;
  endedWithQuestion: boolean;
  startedWith: string;
  heatLevel: number;
  timestamp: Date;
}

export interface StateGuidance {
  guidance: string[];
  heatLevel: number;
  messageCount: number;
}

// ===========================================
// HEAT LEVEL DETECTION
// ===========================================

const HEAT_KEYWORDS = {
  low: ['hey', 'hi', 'hello', 'how are you', 'what\'s up', 'good morning', 'good night'],
  medium: ['cute', 'hot', 'attractive', 'beautiful', 'handsome', 'miss you', 'thinking about you', 'flirty', 'tease'],
  high: ['want you', 'need you', 'sexy', 'turn me on', 'making me', 'can\'t stop', 'so bad', 'drive me crazy'],
  explicit: ['fuck', 'cock', 'pussy', 'dick', 'cum', 'naked', 'nude', 'sex', 'horny']
};

export function detectHeatLevel(message: string): number {
  const lowerMessage = message.toLowerCase();

  // Check explicit first (highest priority)
  for (const keyword of HEAT_KEYWORDS.explicit) {
    if (lowerMessage.includes(keyword)) {
      return 10;
    }
  }

  // Check high heat
  for (const keyword of HEAT_KEYWORDS.high) {
    if (lowerMessage.includes(keyword)) {
      return 7 + Math.random() * 2; // 7-9
    }
  }

  // Check medium heat
  for (const keyword of HEAT_KEYWORDS.medium) {
    if (lowerMessage.includes(keyword)) {
      return 4 + Math.random() * 2; // 4-6
    }
  }

  // Default to low heat
  return 1 + Math.random() * 2; // 1-3
}

// ===========================================
// MESSAGE LENGTH CLASSIFICATION
// ===========================================

export function classifyLength(content: string): 'short' | 'medium' | 'long' {
  const length = content.length;
  if (length <= 30) return 'short';
  if (length <= 100) return 'medium';
  return 'long';
}

// ===========================================
// FIRST WORD EXTRACTION
// ===========================================

export function getFirstWord(content: string): string {
  const cleaned = content.trim().toLowerCase();
  const firstWord = cleaned.split(/[\s,!?.]+/)[0] || '';
  return firstWord;
}

// ===========================================
// QUESTION DETECTION
// ===========================================

export function endsWithQuestion(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.endsWith('?');
}

// ===========================================
// CONVERSATION STATE SERVICE
// ===========================================

export class ConversationStateService {
  private supabase: SupabaseClient;
  private stateCache: Map<string, ConversationState> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ===========================================
  // GET OR CREATE STATE
  // ===========================================

  async getState(conversationId: string, userId: string, personaId: string): Promise<ConversationState> {
    // Check cache first
    const cached = this.stateCache.get(conversationId);
    if (cached) {
      return cached;
    }

    // Try to load from database
    const { data, error } = await this.supabase
      .from('conversation_state')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (data && !error) {
      const state = this.deserializeState(data);
      this.stateCache.set(conversationId, state);
      return state;
    }

    // Create new state
    const newState: ConversationState = {
      conversationId,
      userId,
      personaId,
      lastResponseEndedWithQuestion: false,
      lastResponseLength: 'medium',
      lastResponseStartedWith: '',
      questionsInLast5Messages: 0,
      currentHeatLevel: 1,
      peakHeatLevel: 1,
      messagesThisSession: 0,
      sessionStartedAt: new Date(),
      recentBotMessages: [],
      recentUserMessages: [],
    };

    this.stateCache.set(conversationId, newState);
    return newState;
  }

  // ===========================================
  // UPDATE STATE AFTER USER MESSAGE
  // ===========================================

  async updateWithUserMessage(
    conversationId: string,
    message: string
  ): Promise<ConversationState> {
    const state = this.stateCache.get(conversationId);
    if (!state) {
      throw new Error(`State not found for conversation ${conversationId}`);
    }

    const heatLevel = detectHeatLevel(message);

    // Update state
    state.currentHeatLevel = heatLevel;
    state.peakHeatLevel = Math.max(state.peakHeatLevel, heatLevel);
    state.messagesThisSession++;

    // Add to recent messages (keep last 5)
    state.recentUserMessages.push({
      content: message,
      length: message.length,
      endedWithQuestion: endsWithQuestion(message),
      startedWith: getFirstWord(message),
      heatLevel,
      timestamp: new Date(),
    });

    if (state.recentUserMessages.length > 5) {
      state.recentUserMessages.shift();
    }

    this.stateCache.set(conversationId, state);
    return state;
  }

  // ===========================================
  // UPDATE STATE AFTER BOT MESSAGE
  // ===========================================

  async updateWithBotMessage(
    conversationId: string,
    message: string
  ): Promise<ConversationState> {
    const state = this.stateCache.get(conversationId);
    if (!state) {
      throw new Error(`State not found for conversation ${conversationId}`);
    }

    const endedWithQuestion = endsWithQuestion(message);
    const length = classifyLength(message);
    const startedWith = getFirstWord(message);

    // Update tracking
    state.lastResponseEndedWithQuestion = endedWithQuestion;
    state.lastResponseLength = length;
    state.lastResponseStartedWith = startedWith;

    // Count questions in recent messages
    state.questionsInLast5Messages = state.recentBotMessages
      .slice(-4)
      .filter(m => m.endedWithQuestion)
      .length + (endedWithQuestion ? 1 : 0);

    // Add to recent messages (keep last 5)
    state.recentBotMessages.push({
      content: message,
      length: message.length,
      endedWithQuestion,
      startedWith,
      heatLevel: state.currentHeatLevel,
      timestamp: new Date(),
    });

    if (state.recentBotMessages.length > 5) {
      state.recentBotMessages.shift();
    }

    this.stateCache.set(conversationId, state);

    // Persist to database (async, don't wait)
    this.persistState(state).catch(err => {
      console.error('Failed to persist conversation state:', err);
    });

    return state;
  }

  // ===========================================
  // GENERATE GUIDANCE FROM STATE
  // ===========================================

  generateGuidance(state: ConversationState): StateGuidance {
    const guidance: string[] = [];

    // Question frequency check
    if (state.questionsInLast5Messages >= 2) {
      guidance.push('DO NOT end with a question this time — use a statement or reaction instead.');
    }

    // Length variation check
    const recentLengths = state.recentBotMessages.slice(-3).map(m => classifyLength(m.content));
    if (recentLengths.length >= 3 && recentLengths.every(l => l === recentLengths[0])) {
      if (recentLengths[0] === 'short') {
        guidance.push('Your last 3 messages were short — you can go slightly longer this time.');
      } else if (recentLengths[0] === 'long') {
        guidance.push('Your last 3 messages were long — make this one punchy and short.');
      }
    }

    // Opener variation check
    if (state.lastResponseStartedWith && state.recentBotMessages.length >= 2) {
      const lastTwo = state.recentBotMessages.slice(-2).map(m => m.startedWith);
      if (lastTwo[0] === lastTwo[1]) {
        guidance.push(`Don't start with "${state.lastResponseStartedWith}" again — vary your opener.`);
      }
    }

    // Common opener warnings
    const commonOpeners = ['mm', 'oh', 'well', 'i'];
    const lastOpener = state.lastResponseStartedWith.toLowerCase();
    if (commonOpeners.includes(lastOpener)) {
      guidance.push(`Last message started with "${lastOpener}" — use a different opener.`);
    }

    // Heat-based guidance
    if (state.currentHeatLevel >= 7) {
      guidance.push('Heat is HIGH — keep responses SHORT and CONFIDENT. One-liners are perfect.');
    } else if (state.currentHeatLevel >= 4) {
      guidance.push('Heat is MEDIUM — stay flirty but don\'t over-explain. Keep it playful.');
    }

    // Session length guidance
    if (state.messagesThisSession > 15 && state.currentHeatLevel < 4) {
      guidance.push('Long session, low heat — add some playful tension or tease to keep it interesting.');
    }

    // Pattern breaking
    if (state.messagesThisSession > 5) {
      const structures = state.recentBotMessages.slice(-3).map(m => {
        const hasQuestion = m.endedWithQuestion;
        const length = classifyLength(m.content);
        return `${length}-${hasQuestion ? 'q' : 's'}`;
      });

      if (structures.length >= 3 && structures.every(s => s === structures[0])) {
        guidance.push('Your responses are getting predictable — break the pattern with a different structure.');
      }
    }

    // User message length matching
    const lastUserMessage = state.recentUserMessages[state.recentUserMessages.length - 1];
    if (lastUserMessage) {
      const userLength = classifyLength(lastUserMessage.content);
      if (userLength === 'short') {
        guidance.push('User sent a SHORT message — match their energy with a brief response.');
      }
    }

    return {
      guidance,
      heatLevel: state.currentHeatLevel,
      messageCount: state.messagesThisSession,
    };
  }

  // ===========================================
  // PERSISTENCE
  // ===========================================

  private async persistState(state: ConversationState): Promise<void> {
    const serialized = {
      conversation_id: state.conversationId,
      user_id: state.userId,
      persona_id: state.personaId,
      last_response_ended_with_question: state.lastResponseEndedWithQuestion,
      last_response_length: state.lastResponseLength,
      last_response_started_with: state.lastResponseStartedWith,
      questions_in_last_5: state.questionsInLast5Messages,
      current_heat_level: state.currentHeatLevel,
      peak_heat_level: state.peakHeatLevel,
      messages_this_session: state.messagesThisSession,
      session_started_at: state.sessionStartedAt.toISOString(),
      recent_bot_messages: JSON.stringify(state.recentBotMessages),
      recent_user_messages: JSON.stringify(state.recentUserMessages),
      updated_at: new Date().toISOString(),
    };

    await this.supabase
      .from('conversation_state')
      .upsert(serialized, { onConflict: 'conversation_id' });
  }

  private deserializeState(data: any): ConversationState {
    return {
      conversationId: data.conversation_id,
      userId: data.user_id,
      personaId: data.persona_id,
      lastResponseEndedWithQuestion: data.last_response_ended_with_question,
      lastResponseLength: data.last_response_length,
      lastResponseStartedWith: data.last_response_started_with,
      questionsInLast5Messages: data.questions_in_last_5,
      currentHeatLevel: data.current_heat_level,
      peakHeatLevel: data.peak_heat_level,
      messagesThisSession: data.messages_this_session,
      sessionStartedAt: new Date(data.session_started_at),
      recentBotMessages: JSON.parse(data.recent_bot_messages || '[]'),
      recentUserMessages: JSON.parse(data.recent_user_messages || '[]'),
    };
  }

  // ===========================================
  // SESSION RESET
  // ===========================================

  async resetSession(conversationId: string): Promise<void> {
    const state = this.stateCache.get(conversationId);
    if (state) {
      state.messagesThisSession = 0;
      state.sessionStartedAt = new Date();
      state.currentHeatLevel = 1;
      state.recentBotMessages = [];
      state.recentUserMessages = [];
      this.stateCache.set(conversationId, state);
    }
  }
}

// ===========================================
// SINGLETON EXPORT
// ===========================================

let stateService: ConversationStateService | null = null;

export function getConversationStateService(
  supabaseUrl?: string,
  supabaseKey?: string
): ConversationStateService {
  if (!stateService) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required for first initialization');
    }
    stateService = new ConversationStateService(supabaseUrl, supabaseKey);
  }
  return stateService;
}
