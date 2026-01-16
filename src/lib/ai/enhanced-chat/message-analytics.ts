// ===========================================
// MESSAGE ANALYTICS SERVICE
// Logs message data for ML training and analysis
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  private supabase: SupabaseClient;
  private pendingUpdates: Map<string, Partial<MessageAnalytics>> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Flush pending updates periodically
    setInterval(() => this.flushPendingUpdates(), 5000);
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
  // ANALYTICS QUERIES
  // ===========================================

  async getResponsePatternAnalysis(
    personaId: string,
    options: {
      daysBack?: number;
      minMessages?: number;
    } = {}
  ): Promise<{
    avgResponseLength: number;
    questionEndRate: number;
    avgEngagementRate: number;
    bestPerformingOpeners: string[];
    optimalResponseLength: number;
  }> {
    const daysBack = options.daysBack || 30;
    const minMessages = options.minMessages || 100;

    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const { data, error } = await this.supabase
      .from('message_analytics')
      .select('*')
      .eq('persona_id', personaId)
      .eq('is_user_message', false)
      .gte('created_at', since.toISOString())
      .not('user_replied', 'is', null);

    if (error || !data || data.length < minMessages) {
      return {
        avgResponseLength: 50,
        questionEndRate: 0.4,
        avgEngagementRate: 0.7,
        bestPerformingOpeners: ['Bold', 'Mm', 'Keep going'],
        optimalResponseLength: 40,
      };
    }

    // Calculate metrics
    const totalMessages = data.length;
    const messagesWithReplies = data.filter(m => m.user_replied).length;

    const avgResponseLength = data.reduce((sum, m) => sum + m.message_length, 0) / totalMessages;
    const questionEndRate = data.filter(m => m.ended_with_question).length / totalMessages;
    const avgEngagementRate = messagesWithReplies / totalMessages;

    // Find best performing openers
    const openerEngagement: Record<string, { total: number; replied: number }> = {};

    for (const msg of data) {
      const opener = msg.started_with || 'unknown';
      if (!openerEngagement[opener]) {
        openerEngagement[opener] = { total: 0, replied: 0 };
      }
      openerEngagement[opener].total++;
      if (msg.user_replied) {
        openerEngagement[opener].replied++;
      }
    }

    const bestPerformingOpeners = Object.entries(openerEngagement)
      .filter(([_, stats]) => stats.total >= 10)
      .map(([opener, stats]) => ({ opener, rate: stats.replied / stats.total }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5)
      .map(item => item.opener);

    // Find optimal response length
    const lengthBuckets: Record<string, { total: number; replied: number }> = {
      'very_short': { total: 0, replied: 0 },  // < 20
      'short': { total: 0, replied: 0 },       // 20-50
      'medium': { total: 0, replied: 0 },      // 50-100
      'long': { total: 0, replied: 0 },        // > 100
    };

    for (const msg of data) {
      let bucket: string;
      if (msg.message_length < 20) bucket = 'very_short';
      else if (msg.message_length < 50) bucket = 'short';
      else if (msg.message_length < 100) bucket = 'medium';
      else bucket = 'long';

      lengthBuckets[bucket].total++;
      if (msg.user_replied) {
        lengthBuckets[bucket].replied++;
      }
    }

    const bestLengthBucket = Object.entries(lengthBuckets)
      .filter(([_, stats]) => stats.total >= 20)
      .map(([bucket, stats]) => ({ bucket, rate: stats.replied / stats.total }))
      .sort((a, b) => b.rate - a.rate)[0];

    const lengthMap: Record<string, number> = {
      'very_short': 15,
      'short': 35,
      'medium': 75,
      'long': 120,
    };

    const optimalResponseLength = bestLengthBucket
      ? lengthMap[bestLengthBucket.bucket]
      : 40;

    return {
      avgResponseLength,
      questionEndRate,
      avgEngagementRate,
      bestPerformingOpeners,
      optimalResponseLength,
    };
  }

  // ===========================================
  // HEAT LEVEL ANALYSIS
  // ===========================================

  async getHeatLevelPatterns(
    personaId: string,
    daysBack: number = 30
  ): Promise<{
    avgPeakHeat: number;
    avgMessagesToHeat: number;
    heatRetention: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const { data, error } = await this.supabase
      .from('message_analytics')
      .select('conversation_id, heat_level, session_message_number')
      .eq('persona_id', personaId)
      .gte('created_at', since.toISOString())
      .order('conversation_id')
      .order('session_message_number');

    if (error || !data || data.length < 50) {
      return {
        avgPeakHeat: 5,
        avgMessagesToHeat: 10,
        heatRetention: 0.6,
      };
    }

    // Group by conversation
    const conversations: Record<string, typeof data> = {};
    for (const msg of data) {
      if (!conversations[msg.conversation_id]) {
        conversations[msg.conversation_id] = [];
      }
      conversations[msg.conversation_id].push(msg);
    }

    let totalPeakHeat = 0;
    let totalMessagesToHeat = 0;
    let conversationsAnalyzed = 0;

    for (const messages of Object.values(conversations)) {
      if (messages.length < 5) continue;

      const peakHeat = Math.max(...messages.map(m => m.heat_level));
      totalPeakHeat += peakHeat;

      // Find message number where heat first reached 5+
      const heatMessage = messages.find(m => m.heat_level >= 5);
      if (heatMessage) {
        totalMessagesToHeat += heatMessage.session_message_number;
      }

      conversationsAnalyzed++;
    }

    return {
      avgPeakHeat: conversationsAnalyzed > 0 ? totalPeakHeat / conversationsAnalyzed : 5,
      avgMessagesToHeat: conversationsAnalyzed > 0 ? totalMessagesToHeat / conversationsAnalyzed : 10,
      heatRetention: 0.6, // Would need more complex calculation
    };
  }
}

// ===========================================
// HELPER: COUNT EMOJIS
// ===========================================

export function countEmojis(text: string): number {
  // Simple emoji detection without unicode flag for ES5 compatibility
  // Matches common emoji patterns using surrogate pairs
  const emojiRegex = /(?:[\u2600-\u27BF]|(?:\uD83C[\uDF00-\uDFFF])|(?:\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF])|(?:\uD83E[\uDD00-\uDDFF]))/g;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
}

// ===========================================
// SINGLETON EXPORT
// ===========================================

let analyticsService: MessageAnalyticsService | null = null;

export function getMessageAnalyticsService(
  supabaseUrl?: string,
  supabaseKey?: string
): MessageAnalyticsService {
  if (!analyticsService) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required for first initialization');
    }
    analyticsService = new MessageAnalyticsService(supabaseUrl, supabaseKey);
  }
  return analyticsService;
}
