// ===========================================
// USER PREFERENCES SERVICE
// Tracks and learns user behavior patterns
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface UserPreferences {
  id: string;
  userId: string;
  personaId: string;

  // Message patterns
  avgMessageLength: number;
  avgResponseTimeSeconds: number;

  // Session patterns
  avgSessionDurationMinutes: number;
  avgMessagesPerSession: number;
  totalSessions: number;
  totalMessages: number;

  // Behavioral patterns
  escalationSpeed: number;        // 1-10: how fast they get flirty
  preferredPace: number;          // 1-10: slow burn vs direct
  questionTolerance: number;      // 0-1: do they engage with questions
  emojiResponseRate: number;      // 0-1: do they use emojis back

  // Engagement signals
  avgHeatLevel: number;
  peakHeatLevel: number;

  // Trait resonance (which persona traits get engagement)
  traitScores: Record<string, number>;

  // Timing patterns
  typicalActiveHours: number[];   // Hours when they're usually active
  preferredDayOfWeek: number[];   // Days they chat most

  // Response preferences
  preferredResponseLength: 'short' | 'medium' | 'long';

  // Timestamps
  firstInteraction: Date;
  lastInteraction: Date;
  updatedAt: Date;
}

export interface PreferenceHints {
  hints: string[];
}

// ===========================================
// USER PREFERENCES SERVICE
// ===========================================

export class UserPreferencesService {
  private prefsCache: Map<string, UserPreferences> = new Map();

  constructor(private supabase: SupabaseClient) {}

  // ===========================================
  // GET OR CREATE PREFERENCES
  // ===========================================

  async getPreferences(userId: string, personaId: string): Promise<UserPreferences> {
    const cacheKey = `${userId}-${personaId}`;

    // Check cache
    const cached = this.prefsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Try to load from database
    const { data, error } = await this.supabase
      .from('user_preferences_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .single();

    if (data && !error) {
      const prefs = this.deserializePreferences(data);
      this.prefsCache.set(cacheKey, prefs);
      return prefs;
    }

    // Create default preferences
    const now = new Date();
    const defaultPrefs: UserPreferences = {
      id: '',
      userId,
      personaId,
      avgMessageLength: 50,
      avgResponseTimeSeconds: 30,
      avgSessionDurationMinutes: 10,
      avgMessagesPerSession: 15,
      totalSessions: 0,
      totalMessages: 0,
      escalationSpeed: 5,
      preferredPace: 5,
      questionTolerance: 0.5,
      emojiResponseRate: 0.5,
      avgHeatLevel: 3,
      peakHeatLevel: 3,
      traitScores: {},
      typicalActiveHours: [],
      preferredDayOfWeek: [],
      preferredResponseLength: 'medium',
      firstInteraction: now,
      lastInteraction: now,
      updatedAt: now,
    };

    this.prefsCache.set(cacheKey, defaultPrefs);
    return defaultPrefs;
  }

  // ===========================================
  // UPDATE WITH MESSAGE DATA
  // ===========================================

  async updateWithMessage(
    userId: string,
    personaId: string,
    messageData: {
      messageLength: number;
      responseTimeSeconds: number;
      heatLevel: number;
      userUsedEmoji: boolean;
      userAskedQuestion: boolean;
      sessionMessageNumber: number;
    }
  ): Promise<void> {
    const prefs = await this.getPreferences(userId, personaId);
    const now = new Date();

    // Update running averages
    const totalMessages = prefs.totalMessages + 1;

    prefs.avgMessageLength = this.runningAverage(
      prefs.avgMessageLength,
      messageData.messageLength,
      totalMessages
    );

    prefs.avgResponseTimeSeconds = this.runningAverage(
      prefs.avgResponseTimeSeconds,
      messageData.responseTimeSeconds,
      totalMessages
    );

    prefs.avgHeatLevel = this.runningAverage(
      prefs.avgHeatLevel,
      messageData.heatLevel,
      totalMessages
    );

    // Update peak heat
    prefs.peakHeatLevel = Math.max(prefs.peakHeatLevel, messageData.heatLevel);

    // Update emoji response rate
    prefs.emojiResponseRate = this.runningAverage(
      prefs.emojiResponseRate,
      messageData.userUsedEmoji ? 1 : 0,
      totalMessages
    );

    // Update escalation speed based on when heat increases
    if (messageData.heatLevel >= 5 && messageData.sessionMessageNumber < 10) {
      prefs.escalationSpeed = Math.min(10, prefs.escalationSpeed + 0.2);
    } else if (messageData.heatLevel < 3 && messageData.sessionMessageNumber > 20) {
      prefs.escalationSpeed = Math.max(1, prefs.escalationSpeed - 0.1);
    }

    // Update timing patterns
    const hour = now.getHours();
    if (!prefs.typicalActiveHours.includes(hour)) {
      prefs.typicalActiveHours.push(hour);
      // Keep only top 5 most common hours (simplified)
      if (prefs.typicalActiveHours.length > 5) {
        prefs.typicalActiveHours.shift();
      }
    }

    // Update preferred response length based on their messages
    if (prefs.avgMessageLength < 30) {
      prefs.preferredResponseLength = 'short';
    } else if (prefs.avgMessageLength > 100) {
      prefs.preferredResponseLength = 'long';
    } else {
      prefs.preferredResponseLength = 'medium';
    }

    prefs.totalMessages = totalMessages;
    prefs.lastInteraction = now;
    prefs.updatedAt = now;

    // Update cache
    const cacheKey = `${userId}-${personaId}`;
    this.prefsCache.set(cacheKey, prefs);

    // Persist async
    this.persistPreferences(prefs).catch(err => {
      console.error('Failed to persist user preferences:', err);
    });
  }

  // ===========================================
  // GENERATE PREFERENCE HINTS
  // ===========================================

  generatePreferenceHints(prefs: UserPreferences): PreferenceHints {
    const hints: string[] = [];

    // Message length preference
    if (prefs.avgMessageLength < 30) {
      hints.push('This user sends SHORT messages - keep your responses extra brief to match.');
    } else if (prefs.avgMessageLength > 100) {
      hints.push('This user sends longer messages - you can give slightly more detailed responses.');
    }

    // Escalation speed
    if (prefs.escalationSpeed >= 7) {
      hints.push('This user escalates FAST - match their energy, don\'t slow them down.');
    } else if (prefs.escalationSpeed <= 3) {
      hints.push('This user prefers SLOW BURN - take your time, build tension gradually.');
    }

    // Question tolerance
    if (prefs.questionTolerance < 0.3) {
      hints.push('This user doesn\'t engage much with questions - prefer statements and reactions.');
    } else if (prefs.questionTolerance > 0.7) {
      hints.push('This user responds well to questions - feel free to ask and engage.');
    }

    // Emoji usage
    if (prefs.emojiResponseRate < 0.2) {
      hints.push('This user rarely uses emojis - keep your emoji usage minimal.');
    } else if (prefs.emojiResponseRate > 0.7) {
      hints.push('This user loves emojis - feel free to use them more.');
    }

    // Heat level patterns
    if (prefs.avgHeatLevel >= 6) {
      hints.push('This user typically runs HOT - be confident and match their intensity.');
    } else if (prefs.avgHeatLevel <= 2) {
      hints.push('This user keeps things casual - don\'t push too hard on flirtation.');
    }

    // Session patterns
    if (prefs.avgMessagesPerSession > 30) {
      hints.push('This user has LONG sessions - pace yourself, maintain variety.');
    } else if (prefs.avgMessagesPerSession < 10) {
      hints.push('This user has SHORT sessions - make every message count.');
    }

    // Time patterns
    if (prefs.typicalActiveHours.length > 0) {
      const lateNight = prefs.typicalActiveHours.filter(h => h >= 22 || h <= 4);
      if (lateNight.length >= 2) {
        hints.push('This user often chats late at night - they may be looking for more intimate conversation.');
      }
    }

    return { hints };
  }

  // ===========================================
  // HELPERS
  // ===========================================

  private runningAverage(current: number, newValue: number, count: number): number {
    return current + (newValue - current) / count;
  }

  private async persistPreferences(prefs: UserPreferences): Promise<void> {
    const serialized = {
      user_id: prefs.userId,
      persona_id: prefs.personaId,
      avg_message_length: prefs.avgMessageLength,
      avg_response_time_seconds: prefs.avgResponseTimeSeconds,
      avg_session_duration_minutes: prefs.avgSessionDurationMinutes,
      avg_messages_per_session: prefs.avgMessagesPerSession,
      total_sessions: prefs.totalSessions,
      total_messages: prefs.totalMessages,
      escalation_speed: prefs.escalationSpeed,
      preferred_pace: prefs.preferredPace,
      question_tolerance: prefs.questionTolerance,
      emoji_response_rate: prefs.emojiResponseRate,
      avg_heat_level: prefs.avgHeatLevel,
      peak_heat_level: prefs.peakHeatLevel,
      trait_scores: JSON.stringify(prefs.traitScores),
      typical_active_hours: prefs.typicalActiveHours,
      preferred_day_of_week: prefs.preferredDayOfWeek,
      preferred_response_length: prefs.preferredResponseLength,
      first_interaction: prefs.firstInteraction.toISOString(),
      last_interaction: prefs.lastInteraction.toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.supabase
      .from('user_preferences_v2')
      .upsert(serialized, {
        onConflict: 'user_id,persona_id',
      });
  }

  private deserializePreferences(data: any): UserPreferences {
    return {
      id: data.id,
      userId: data.user_id,
      personaId: data.persona_id,
      avgMessageLength: data.avg_message_length,
      avgResponseTimeSeconds: data.avg_response_time_seconds,
      avgSessionDurationMinutes: data.avg_session_duration_minutes,
      avgMessagesPerSession: data.avg_messages_per_session,
      totalSessions: data.total_sessions,
      totalMessages: data.total_messages,
      escalationSpeed: data.escalation_speed,
      preferredPace: data.preferred_pace,
      questionTolerance: data.question_tolerance,
      emojiResponseRate: data.emoji_response_rate,
      avgHeatLevel: data.avg_heat_level,
      peakHeatLevel: data.peak_heat_level,
      traitScores: JSON.parse(data.trait_scores || '{}'),
      typicalActiveHours: data.typical_active_hours || [],
      preferredDayOfWeek: data.preferred_day_of_week || [],
      preferredResponseLength: data.preferred_response_length,
      firstInteraction: new Date(data.first_interaction),
      lastInteraction: new Date(data.last_interaction),
      updatedAt: new Date(data.updated_at),
    };
  }
}
