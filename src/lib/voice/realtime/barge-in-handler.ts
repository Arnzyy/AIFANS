// ===========================================
// BARGE-IN HANDLER
// Manages AI speech interruption when user speaks
// ===========================================

import type { VoicePipelineState } from './types';

export interface BargeInConfig {
  enabled: boolean;
  minAISpeakingMs: number;     // Minimum time AI must speak before barge-in allowed
  minUserSpeechMs: number;     // Minimum user speech duration to trigger barge-in
  cooldownMs: number;          // Cooldown between barge-ins
}

export const DEFAULT_BARGE_IN_CONFIG: BargeInConfig = {
  enabled: true,
  minAISpeakingMs: 500,        // AI must speak for 500ms before allowing interrupt
  minUserSpeechMs: 150,        // User must speak for 150ms to trigger
  cooldownMs: 1000,            // 1 second between barge-ins
};

export interface BargeInEvent {
  timestamp: number;
  aiSpeakingDurationMs: number;
  partialResponse: string;
  wasProcessed: boolean;
}

export class BargeInHandler {
  private config: BargeInConfig;
  private lastBargeInTime: number = 0;
  private bargeInHistory: BargeInEvent[] = [];
  private vadStartTime: number | null = null;

  // Callbacks for pipeline coordination
  private onBargeIn: (() => void) | null = null;

  constructor(config?: Partial<BargeInConfig>) {
    this.config = { ...DEFAULT_BARGE_IN_CONFIG, ...config };
  }

  /**
   * Set callback for when barge-in is triggered
   */
  setBargeInCallback(callback: () => void): void {
    this.onBargeIn = callback;
  }

  /**
   * Handle VAD (Voice Activity Detection) start event
   */
  onVADStart(timestamp: number): void {
    this.vadStartTime = timestamp;
  }

  /**
   * Handle VAD end event
   */
  onVADEnd(): void {
    this.vadStartTime = null;
  }

  /**
   * Check if barge-in should be triggered
   * Called when user speech is detected while AI is speaking
   */
  shouldTriggerBargeIn(pipelineState: VoicePipelineState): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if AI is actually speaking
    if (!pipelineState.aiSpeakingStartTime) {
      return false;
    }

    const now = Date.now();

    // Check cooldown
    if (now - this.lastBargeInTime < this.config.cooldownMs) {
      console.log('[BargeIn] Cooldown active, ignoring');
      return false;
    }

    // Check minimum AI speaking time
    const aiSpeakingDuration = now - pipelineState.aiSpeakingStartTime;
    if (aiSpeakingDuration < this.config.minAISpeakingMs) {
      console.log('[BargeIn] AI speaking too briefly:', aiSpeakingDuration, 'ms');
      return false;
    }

    // Check minimum user speech duration (if VAD tracking)
    if (this.vadStartTime) {
      const userSpeechDuration = now - this.vadStartTime;
      if (userSpeechDuration < this.config.minUserSpeechMs) {
        return false;
      }
    }

    console.log('[BargeIn] Triggering barge-in');
    return true;
  }

  /**
   * Execute barge-in
   * Returns the event for logging
   */
  executeBargeIn(pipelineState: VoicePipelineState): BargeInEvent {
    const now = Date.now();
    const aiSpeakingDuration = pipelineState.aiSpeakingStartTime
      ? now - pipelineState.aiSpeakingStartTime
      : 0;

    const event: BargeInEvent = {
      timestamp: now,
      aiSpeakingDurationMs: aiSpeakingDuration,
      partialResponse: pipelineState.partialResponse,
      wasProcessed: true,
    };

    this.lastBargeInTime = now;
    this.bargeInHistory.push(event);
    this.vadStartTime = null;

    // Keep history manageable
    if (this.bargeInHistory.length > 20) {
      this.bargeInHistory = this.bargeInHistory.slice(-20);
    }

    // Execute callback
    if (this.onBargeIn) {
      this.onBargeIn();
    }

    console.log('[BargeIn] Executed:', {
      aiSpeakingDuration,
      partialResponseLength: pipelineState.partialResponse.length,
    });

    return event;
  }

  /**
   * Handle explicit barge-in message from client
   */
  handleClientBargeIn(pipelineState: VoicePipelineState): BargeInEvent | null {
    if (!this.config.enabled) {
      console.log('[BargeIn] Disabled, ignoring client barge-in');
      return null;
    }

    // For explicit client barge-in, skip some checks but still check cooldown
    const now = Date.now();
    if (now - this.lastBargeInTime < this.config.cooldownMs) {
      console.log('[BargeIn] Cooldown active for client barge-in');
      return null;
    }

    return this.executeBargeIn(pipelineState);
  }

  /**
   * Get barge-in statistics
   */
  getStats(): {
    totalBargeIns: number;
    avgAISpeakingDuration: number;
    avgPartialResponseLength: number;
  } {
    const total = this.bargeInHistory.length;
    if (total === 0) {
      return {
        totalBargeIns: 0,
        avgAISpeakingDuration: 0,
        avgPartialResponseLength: 0,
      };
    }

    const avgDuration = this.bargeInHistory.reduce(
      (sum, e) => sum + e.aiSpeakingDurationMs, 0
    ) / total;

    const avgLength = this.bargeInHistory.reduce(
      (sum, e) => sum + e.partialResponse.length, 0
    ) / total;

    return {
      totalBargeIns: total,
      avgAISpeakingDuration: Math.round(avgDuration),
      avgPartialResponseLength: Math.round(avgLength),
    };
  }

  /**
   * Get recent barge-in history
   */
  getHistory(): BargeInEvent[] {
    return [...this.bargeInHistory];
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.lastBargeInTime = 0;
    this.vadStartTime = null;
    this.bargeInHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BargeInConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if barge-in is enabled
   */
  get isEnabled(): boolean {
    return this.config.enabled;
  }
}
