// ===========================================
// VOICE USAGE TRACKER
// Tracks voice minutes and enforces limits
// ===========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionMetrics } from './types';

export interface UsageTrackerConfig {
  monthlyLimitMinutes: number;
  maxSessionMinutes: number;
  warningThresholdPercent: number;
}

export const DEFAULT_USAGE_CONFIG: UsageTrackerConfig = {
  monthlyLimitMinutes: 60,
  maxSessionMinutes: 30,
  warningThresholdPercent: 80,
};

export interface UsageStatus {
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  percentUsed: number;
  isWarning: boolean;
  isExhausted: boolean;
}

export interface SessionUsage {
  sessionId: string;
  startTime: number;
  elapsedSeconds: number;
  estimatedCostCents: number;
}

// Cost estimates per unit
const COSTS = {
  DEEPGRAM_PER_MINUTE: 0.0043,      // $0.0043/min for Nova-2
  ELEVENLABS_PER_CHAR: 0.00003,     // ~$0.30/1000 chars
  CLAUDE_INPUT_PER_TOKEN: 0.000003, // $3/1M tokens
  CLAUDE_OUTPUT_PER_TOKEN: 0.000015, // $15/1M tokens
};

export class UsageTracker {
  private config: UsageTrackerConfig;
  private supabase: SupabaseClient;
  private userId: string;
  private creatorId: string;

  // Current session tracking
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private lastUpdateTime: number | null = null;
  private sessionMinutes: number = 0;
  private metrics: SessionMetrics = {
    sttSeconds: 0,
    ttsCharacters: 0,
    llmInputTokens: 0,
    llmOutputTokens: 0,
    estimatedCostCents: 0,
    avgLatencyMs: 0,
    bargeInCount: 0,
    latencyMeasurements: [],
  };

  constructor(
    supabase: SupabaseClient,
    userId: string,
    creatorId: string,
    config?: Partial<UsageTrackerConfig>
  ) {
    this.supabase = supabase;
    this.userId = userId;
    this.creatorId = creatorId;
    this.config = { ...DEFAULT_USAGE_CONFIG, ...config };
  }

  /**
   * Check if user has available voice minutes
   */
  async checkUsageAvailable(): Promise<UsageStatus> {
    const { data, error } = await this.supabase
      .rpc('get_or_create_voice_usage', { p_user_id: this.userId });

    if (error) {
      console.error('[UsageTracker] Error checking usage:', error);
      throw new Error('Failed to check voice usage');
    }

    const usage = data[0] || { minutes_used: 0, minutes_limit: this.config.monthlyLimitMinutes };
    const minutesUsed = usage.minutes_used || 0;
    const minutesLimit = usage.minutes_limit || this.config.monthlyLimitMinutes;
    const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
    const percentUsed = minutesLimit > 0 ? (minutesUsed / minutesLimit) * 100 : 0;

    return {
      minutesUsed,
      minutesLimit,
      minutesRemaining,
      percentUsed: Math.round(percentUsed),
      isWarning: percentUsed >= this.config.warningThresholdPercent,
      isExhausted: minutesRemaining <= 0,
    };
  }

  /**
   * Start tracking a new session
   */
  startSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.sessionStartTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.sessionMinutes = 0;
    this.resetMetrics();

    console.log('[UsageTracker] Session started:', sessionId);
  }

  /**
   * Get current session duration in seconds
   */
  getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Get current session duration in minutes (for billing)
   */
  getSessionMinutes(): number {
    const seconds = this.getSessionDuration();
    return Math.ceil(seconds / 60); // Round up for billing
  }

  /**
   * Check if session should end due to time limit
   */
  isSessionLimitReached(): boolean {
    const minutes = this.getSessionMinutes();
    return minutes >= this.config.maxSessionMinutes;
  }

  /**
   * Update metrics during session
   */
  updateMetrics(update: Partial<SessionMetrics>): void {
    if (update.sttSeconds !== undefined) {
      this.metrics.sttSeconds += update.sttSeconds;
    }
    if (update.ttsCharacters !== undefined) {
      this.metrics.ttsCharacters += update.ttsCharacters;
    }
    if (update.llmInputTokens !== undefined) {
      this.metrics.llmInputTokens += update.llmInputTokens;
    }
    if (update.llmOutputTokens !== undefined) {
      this.metrics.llmOutputTokens += update.llmOutputTokens;
    }
    if (update.bargeInCount !== undefined) {
      this.metrics.bargeInCount += update.bargeInCount;
    }

    // Update latency tracking
    if (update.latencyMeasurements?.length) {
      this.metrics.latencyMeasurements.push(...update.latencyMeasurements);
      // Keep last 100 measurements
      if (this.metrics.latencyMeasurements.length > 100) {
        this.metrics.latencyMeasurements = this.metrics.latencyMeasurements.slice(-100);
      }
      // Recalculate average
      this.metrics.avgLatencyMs = Math.round(
        this.metrics.latencyMeasurements.reduce((a, b) => a + b, 0) /
        this.metrics.latencyMeasurements.length
      );
    }

    // Recalculate estimated cost
    this.metrics.estimatedCostCents = this.calculateEstimatedCost();
  }

  /**
   * Calculate estimated cost in cents
   */
  private calculateEstimatedCost(): number {
    const sttMinutes = this.metrics.sttSeconds / 60;
    const deepgramCost = sttMinutes * COSTS.DEEPGRAM_PER_MINUTE;
    const elevenLabsCost = this.metrics.ttsCharacters * COSTS.ELEVENLABS_PER_CHAR;
    const claudeInputCost = this.metrics.llmInputTokens * COSTS.CLAUDE_INPUT_PER_TOKEN;
    const claudeOutputCost = this.metrics.llmOutputTokens * COSTS.CLAUDE_OUTPUT_PER_TOKEN;

    const totalDollars = deepgramCost + elevenLabsCost + claudeInputCost + claudeOutputCost;
    return Math.ceil(totalDollars * 100); // Convert to cents
  }

  /**
   * Get current metrics
   */
  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  /**
   * End session and update database
   */
  async endSession(): Promise<{
    durationMinutes: number;
    metrics: SessionMetrics;
  }> {
    if (!this.sessionId || !this.sessionStartTime) {
      return { durationMinutes: 0, metrics: this.metrics };
    }

    const durationMinutes = this.getSessionMinutes();

    // Update voice usage in database
    try {
      const { error } = await this.supabase.rpc('increment_voice_usage', {
        p_user_id: this.userId,
        p_minutes: durationMinutes,
      });

      if (error) {
        console.error('[UsageTracker] Error updating usage:', error);
      }

      // Update session record
      await this.supabase
        .from('voice_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: this.getSessionDuration(),
          total_input_tokens: this.metrics.llmInputTokens,
          total_output_tokens: this.metrics.llmOutputTokens,
          total_audio_seconds: this.metrics.sttSeconds,
          estimated_cost_cents: this.metrics.estimatedCostCents,
        })
        .eq('id', this.sessionId);

    } catch (err) {
      console.error('[UsageTracker] Error ending session:', err);
    }

    console.log('[UsageTracker] Session ended:', {
      sessionId: this.sessionId,
      durationMinutes,
      metrics: this.metrics,
    });

    const result = {
      durationMinutes,
      metrics: { ...this.metrics },
    };

    // Reset session state
    this.sessionId = null;
    this.sessionStartTime = null;
    this.lastUpdateTime = null;
    this.sessionMinutes = 0;
    this.resetMetrics();

    return result;
  }

  /**
   * Reset metrics to initial state
   */
  private resetMetrics(): void {
    this.metrics = {
      sttSeconds: 0,
      ttsCharacters: 0,
      llmInputTokens: 0,
      llmOutputTokens: 0,
      estimatedCostCents: 0,
      avgLatencyMs: 0,
      bargeInCount: 0,
      latencyMeasurements: [],
    };
  }

  /**
   * Get session info
   */
  getSessionInfo(): SessionUsage | null {
    if (!this.sessionId || !this.sessionStartTime) return null;

    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      elapsedSeconds: this.getSessionDuration(),
      estimatedCostCents: this.metrics.estimatedCostCents,
    };
  }
}

/**
 * Load usage limits from feature flags
 */
export async function loadUsageLimits(
  supabase: SupabaseClient
): Promise<UsageTrackerConfig> {
  const config = { ...DEFAULT_USAGE_CONFIG };

  try {
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('flag_name, is_enabled')
      .in('flag_name', ['VOICE_MAX_SESSION_MINUTES', 'VOICE_MONTHLY_LIMIT_MINUTES']);

    if (flags) {
      for (const flag of flags) {
        // These flags store numeric values in a way that needs parsing
        // For now use defaults, but this can be extended
      }
    }
  } catch (err) {
    console.error('[UsageTracker] Error loading limits:', err);
  }

  return config;
}
