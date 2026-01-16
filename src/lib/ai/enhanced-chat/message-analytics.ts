// ===========================================
// MESSAGE ANALYTICS SERVICE
// Logs message data for ML training and analysis
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface MessageAnalytics {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  personaId: string;

  // Message characteristics
  isUserMessage: boolean;
  messageLength: number;
  heatLevel: number;
  endedWithQuestion: boolean;
  emojiCount: number;
  startedWith: string;

  // Response characteristics (for bot messages)
  responseDelayMs?: number;

  // Engagement signals (for user's NEXT action - updated after they respond)
  userReplied?: boolean;
  replyDelaySeconds?: number;
  replyLength?: number;
  sessionContinued?: boolean;
  tipFollowed?: boolean;

  // Context at time of message
  sessionMessageNumber: number;
  priorHeatLevel: number;

  // A/B test variant (if applicable)
  abTestVariant?: string;

  createdAt: Date;
}

export interface AnalyticsSnapshot {
  messageId: string;
  conversationId: string;
  userId: string;
  personaId: string;
  isUserMessage: boolean;
  messageLength: number;
  heatLevel: number;
  endedWithQuestion: boolean;
  emojiCount: number;
  startedWith: string;
  sessionMessageNumber: number;
  priorHeatLevel: number;
  responseDelayMs?: number;
  abTestVariant?: string;
}

// ===========================================
// MESSAGE ANALYTICS SERVICE
// ===========================================

export class MessageAnalyticsService {
  private pendingUpdates: Map<string, Partial<MessageAnalytics>> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(private supabase: SupabaseClient) {
    // Flush pending updates periodically (only in non-edge environments)
    if (typeof setInterval !== 'undefined') {
      this.flushInterval = setInterval(() => this.flushPendingUpdates(), 5000);
    }
  }

  // ===========================================
  // LOG MESSAGE
  // ===========================================

  async logMessage(snapshot: AnalyticsSnapshot): Promise<string> {
    const id = crypto.randomUUID();

    const record = {
      id,
      message_id: snapshot.messageId,
      conversation_id: snapshot.conversationId,
      user_id: snapshot.userId,
      persona_id: snapshot.personaId,
      is_user_message: snapshot.isUserMessage,
      message_length: snapshot.messageLength,
      heat_level: snapshot.heatLevel,
      ended_with_question: snapshot.endedWithQuestion,
      emoji_count: snapshot.emojiCount,
      started_with: snapshot.startedWith,
      session_message_number: snapshot.sessionMessageNumber,
      prior_heat_level: snapshot.priorHeatLevel,
      response_delay_ms: snapshot.responseDelayMs,
      ab_test_variant: snapshot.abTestVariant,
      created_at: new Date().toISOString(),
    };

    // Insert async, don't block
    this.supabase
      .from('message_analytics')
      .insert(record)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to log message analytics:', error);
        }
      });

    return id;
  }

  // ===========================================
  // UPDATE WITH ENGAGEMENT SIGNAL
  // ===========================================

  async updateEngagement(
    botMessageId: string,
    engagement: {
      userReplied: boolean;
      replyDelaySeconds?: number;
      replyLength?: number;
      sessionContinued?: boolean;
      tipFollowed?: boolean;
    }
  ): Promise<void> {
    // Queue update for batch processing
    this.pendingUpdates.set(botMessageId, {
      userReplied: engagement.userReplied,
      replyDelaySeconds: engagement.replyDelaySeconds,
      replyLength: engagement.replyLength,
      sessionContinued: engagement.sessionContinued,
      tipFollowed: engagement.tipFollowed,
    });
  }

  // ===========================================
  // BATCH UPDATE FLUSH
  // ===========================================

  private async flushPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    for (const [messageId, engagement] of updates) {
      await this.supabase
        .from('message_analytics')
        .update({
          user_replied: engagement.userReplied,
          reply_delay_seconds: engagement.replyDelaySeconds,
          reply_length: engagement.replyLength,
          session_continued: engagement.sessionContinued,
          tip_followed: engagement.tipFollowed,
        })
        .eq('message_id', messageId);
    }
  }

  // ===========================================
  // CLEANUP
  // ===========================================

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// ===========================================
// HELPER: COUNT EMOJIS
// ===========================================

export function countEmojis(text: string): number {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
}

// ===========================================
// HELPER: GET FIRST WORD
// ===========================================

export function getFirstWord(content: string): string {
  const cleaned = content.trim().toLowerCase();
  const firstWord = cleaned.split(/[\s,!?.]+/)[0] || '';
  return firstWord;
}

// ===========================================
// HELPER: ENDS WITH QUESTION
// ===========================================

export function endsWithQuestion(content: string): boolean {
  return content.trim().endsWith('?');
}
