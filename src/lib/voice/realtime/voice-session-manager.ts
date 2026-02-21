// ===========================================
// VOICE SESSION MANAGER
// Orchestrates the full voice pipeline:
// Deepgram STT -> Claude -> ElevenLabs TTS
// ===========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ServerWSMessage,
  VoicePipelineState,
  SessionConfig,
  ConversationMessage,
  ElevenLabsStreamConfig,
} from './types';
import type { AIPersonalityFull } from '@/lib/ai/personality/prompt-builder';
import { DeepgramStream } from './deepgram-stream';
import { ClaudeStream } from './claude-stream';
import { ElevenLabsStream } from './elevenlabs-stream';
import { BargeInHandler } from './barge-in-handler';
import { UsageTracker } from './usage-tracker';

export interface VoiceSessionConfig {
  sessionId: string;
  userId: string;
  creatorId: string;
  personality: AIPersonalityFull;
  voiceId: string;
  voiceSettings: Partial<ElevenLabsStreamConfig>;
  sessionConfig: SessionConfig;
  onMessage: (message: ServerWSMessage) => void;
}

export class VoiceSessionManager {
  private config: VoiceSessionConfig;
  private supabase: SupabaseClient;

  // Pipeline components
  private deepgram: DeepgramStream;
  private claude: ClaudeStream;
  private elevenlabs: ElevenLabsStream;
  private bargeIn: BargeInHandler;
  private usageTracker: UsageTracker;

  // Pipeline state
  private state: VoicePipelineState = {
    isProcessing: false,
    currentUtterance: '',
    partialResponse: '',
    abortController: null,
    aiSpeakingStartTime: null,
    audioQueue: [],
    sequenceNumber: 0,
  };

  private isActive = false;
  private conversationHistory: ConversationMessage[] = [];

  constructor(supabase: SupabaseClient, config: VoiceSessionConfig) {
    this.supabase = supabase;
    this.config = config;

    // Initialize components
    this.deepgram = new DeepgramStream({
      onTranscript: this.handleTranscript.bind(this),
      onUtteranceEnd: this.handleUtteranceEnd.bind(this),
      onVADStart: this.handleVADStart.bind(this),
      onVADEnd: this.handleVADEnd.bind(this),
      onError: this.handleDeepgramError.bind(this),
      onClose: this.handleDeepgramClose.bind(this),
    });

    this.claude = new ClaudeStream(config.personality);

    this.elevenlabs = new ElevenLabsStream(config.voiceId, config.voiceSettings);

    this.bargeIn = new BargeInHandler({
      enabled: config.sessionConfig.bargeInEnabled,
    });
    this.bargeIn.setBargeInCallback(this.handleBargeIn.bind(this));

    this.usageTracker = new UsageTracker(
      supabase,
      config.userId,
      config.creatorId,
      {
        maxSessionMinutes: config.sessionConfig.maxSessionMinutes,
      }
    );

    console.log('[VoiceSession] Manager initialized:', config.sessionId);
  }

  /**
   * Start the voice session
   */
  async start(): Promise<void> {
    console.log('[VoiceSession] Starting session...');

    this.isActive = true;
    this.usageTracker.startSession(this.config.sessionId);

    // Connect to Deepgram
    await this.deepgram.connect();

    // Send session ready message
    this.sendMessage({
      type: 'SESSION_READY',
      sessionId: this.config.sessionId,
      config: this.config.sessionConfig,
    });

    console.log('[VoiceSession] Session active');
  }

  /**
   * Process incoming audio from client
   */
  processAudio(audioBase64: string): void {
    if (!this.isActive) return;

    // Convert base64 to buffer and send to Deepgram
    const buffer = Buffer.from(audioBase64, 'base64');
    this.deepgram.sendAudio(buffer);

    // Update STT metrics
    // Assuming 16kHz 16-bit mono = 32000 bytes/second
    const secondsOfAudio = buffer.length / 32000;
    this.usageTracker.updateMetrics({ sttSeconds: secondsOfAudio });
  }

  /**
   * Handle transcript from Deepgram
   */
  private handleTranscript(text: string, isFinal: boolean): void {
    // Send transcript to client
    this.sendMessage({
      type: 'TRANSCRIPT_USER',
      text,
      isFinal,
    });

    if (isFinal) {
      this.state.currentUtterance = text;
    } else {
      // Check for barge-in during AI speaking
      if (this.state.aiSpeakingStartTime) {
        if (this.bargeIn.shouldTriggerBargeIn(this.state)) {
          this.bargeIn.executeBargeIn(this.state);
        }
      }
    }
  }

  /**
   * Handle utterance end (user finished speaking)
   */
  private async handleUtteranceEnd(finalText: string): Promise<void> {
    if (!finalText.trim()) {
      console.log('[VoiceSession] Empty utterance, ignoring');
      return;
    }

    if (this.state.isProcessing) {
      console.log('[VoiceSession] Already processing, queuing utterance');
      return;
    }

    console.log('[VoiceSession] Processing utterance:', finalText);
    await this.processUtterance(finalText);
  }

  /**
   * Handle VAD start (user started speaking)
   */
  private handleVADStart(): void {
    this.bargeIn.onVADStart(Date.now());
  }

  /**
   * Handle VAD end (user stopped speaking)
   */
  private handleVADEnd(): void {
    this.bargeIn.onVADEnd();
  }

  /**
   * Handle Deepgram error
   */
  private handleDeepgramError(error: Error): void {
    console.error('[VoiceSession] Deepgram error:', error);
    this.sendMessage({
      type: 'ERROR',
      message: 'Speech recognition error',
      code: 'STT_ERROR',
    });
  }

  /**
   * Handle Deepgram connection close
   */
  private handleDeepgramClose(): void {
    console.log('[VoiceSession] Deepgram connection closed');
    // Attempt reconnect if session is still active
    if (this.isActive) {
      console.log('[VoiceSession] Attempting to reconnect Deepgram...');
      this.deepgram.reconnect().catch((err) => {
        console.error('[VoiceSession] Reconnect failed:', err);
        this.end('stt_connection_lost');
      });
    }
  }

  /**
   * Handle barge-in event
   */
  private handleBargeIn(): void {
    console.log('[VoiceSession] Barge-in triggered');

    // Abort current AI generation
    if (this.state.abortController) {
      this.state.abortController.abort();
    }

    // Stop TTS
    this.elevenlabs.abort();

    // Mark last AI message as interrupted
    this.claude.markLastAsInterrupted();

    // Clear audio queue
    this.state.audioQueue = [];

    // Reset state
    this.state.aiSpeakingStartTime = null;
    this.state.isProcessing = false;
    this.state.partialResponse = '';

    // Send barge-in acknowledgment
    this.sendMessage({ type: 'BARGE_IN_ACK' });
    this.sendMessage({ type: 'AI_SPEAKING_END' });

    // Update metrics
    this.usageTracker.updateMetrics({ bargeInCount: 1 });
  }

  /**
   * Process a complete utterance through Claude and TTS
   */
  private async processUtterance(utterance: string): Promise<void> {
    this.state.isProcessing = true;
    this.state.partialResponse = '';
    this.state.abortController = new AbortController();

    const startTime = Date.now();

    try {
      // Keep Deepgram connection alive while we're generating
      this.deepgram.keepAlive();

      // Stream response from Claude
      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const result of this.claude.stream(
        utterance,
        this.state.abortController.signal
      )) {
        if (result.type === 'token') {
          fullResponse += result.text;
          this.state.partialResponse = fullResponse;

          // Send partial AI transcript
          this.sendMessage({
            type: 'TRANSCRIPT_AI',
            text: fullResponse,
            isFinal: false,
          });

          // Check if we have a speakable chunk
          // Stream TTS for each sentence/clause
          if (this.shouldStreamTTS(fullResponse)) {
            const chunk = this.extractSpeakableChunk(fullResponse);
            if (chunk) {
              await this.streamTTSChunk(chunk);
            }
          }
        } else if (result.type === 'done') {
          inputTokens = result.inputTokens || 0;
          outputTokens = result.outputTokens || 0;
        }
      }

      // Stream any remaining text
      const remaining = this.extractRemainingText(fullResponse);
      if (remaining) {
        await this.streamTTSChunk(remaining);
      }

      // Send final AI transcript
      this.sendMessage({
        type: 'TRANSCRIPT_AI',
        text: fullResponse,
        isFinal: true,
      });

      // Update metrics
      const latency = Date.now() - startTime;
      this.usageTracker.updateMetrics({
        llmInputTokens: inputTokens,
        llmOutputTokens: outputTokens,
        ttsCharacters: fullResponse.length,
        latencyMeasurements: [latency],
      });

      // Save message to database
      await this.saveMessage('user', utterance);
      await this.saveMessage('assistant', fullResponse);

    } catch (error) {
      if (this.state.abortController?.signal.aborted) {
        console.log('[VoiceSession] Processing aborted (barge-in)');
      } else {
        console.error('[VoiceSession] Processing error:', error);
        this.sendMessage({
          type: 'ERROR',
          message: 'Failed to process message',
          code: 'PIPELINE_ERROR',
        });
      }
    } finally {
      this.state.isProcessing = false;
      this.state.abortController = null;
      this.state.aiSpeakingStartTime = null;
      this.sendMessage({ type: 'AI_SPEAKING_END' });

      // Reset Deepgram for next utterance
      this.deepgram.resetUtterance();
    }
  }

  /**
   * Check if we should start streaming TTS
   */
  private shouldStreamTTS(text: string): boolean {
    // Start TTS after first sentence or after 50+ chars
    const hasSentence = /[.!?]/.test(text);
    return hasSentence || text.length >= 50;
  }

  /**
   * Extract a speakable chunk from the response
   */
  private extractSpeakableChunk(text: string): string | null {
    // Find last complete sentence
    const matches = text.match(/[^.!?]*[.!?]/g);
    if (matches && matches.length > 0) {
      // Get the last complete sentence we haven't spoken yet
      const lastSpoken = this.state.audioQueue.join('').length;
      const fullSentences = matches.join('');
      if (fullSentences.length > lastSpoken) {
        const newChunk = fullSentences.slice(lastSpoken);
        this.state.audioQueue.push(newChunk);
        return newChunk;
      }
    }
    return null;
  }

  /**
   * Extract remaining text that wasn't in a complete sentence
   */
  private extractRemainingText(text: string): string | null {
    const spoken = this.state.audioQueue.join('');
    const remaining = text.slice(spoken.length).trim();
    if (remaining) {
      this.state.audioQueue.push(remaining);
      return remaining;
    }
    return null;
  }

  /**
   * Stream TTS for a text chunk
   */
  private async streamTTSChunk(text: string): Promise<void> {
    if (!this.state.aiSpeakingStartTime) {
      this.state.aiSpeakingStartTime = Date.now();
      this.sendMessage({ type: 'AI_SPEAKING_START' });
    }

    try {
      for await (const result of this.elevenlabs.stream(text)) {
        if (result.type === 'audio' && result.data) {
          this.sendMessage({
            type: 'AUDIO_CHUNK',
            data: result.data,
            sequence: this.state.sequenceNumber++,
          });
        } else if (result.type === 'error') {
          console.error('[VoiceSession] TTS error:', result.error);
        }
      }
    } catch (error) {
      console.error('[VoiceSession] TTS streaming error:', error);
    }
  }

  /**
   * Handle explicit barge-in from client
   */
  handleClientBargeIn(): void {
    const event = this.bargeIn.handleClientBargeIn(this.state);
    if (event) {
      this.handleBargeIn();
    }
  }

  /**
   * Send usage update to client
   */
  async sendUsageUpdate(): Promise<void> {
    const status = await this.usageTracker.checkUsageAvailable();
    this.sendMessage({
      type: 'USAGE_UPDATE',
      minutesUsed: status.minutesUsed,
      minutesLimit: status.minutesLimit,
    });
  }

  /**
   * Check if session should end due to limits
   */
  checkLimits(): { shouldEnd: boolean; reason: string | null } {
    if (this.usageTracker.isSessionLimitReached()) {
      return { shouldEnd: true, reason: 'max_session_duration' };
    }
    return { shouldEnd: false, reason: null };
  }

  /**
   * End the voice session
   */
  async end(reason: string): Promise<void> {
    if (!this.isActive) return;

    console.log('[VoiceSession] Ending session:', reason);
    this.isActive = false;

    // Stop all components
    await this.deepgram.disconnect();
    this.elevenlabs.abort();
    if (this.state.abortController) {
      this.state.abortController.abort();
    }

    // Finalize usage tracking
    const { durationMinutes, metrics } = await this.usageTracker.endSession();

    // Send session ended message
    this.sendMessage({
      type: 'SESSION_ENDED',
      reason,
      duration: this.usageTracker.getSessionDuration(),
    });

    console.log('[VoiceSession] Session ended:', {
      sessionId: this.config.sessionId,
      durationMinutes,
      metrics,
    });
  }

  /**
   * Save message to database
   */
  private async saveMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      await this.supabase.from('voice_session_messages').insert({
        session_id: this.config.sessionId,
        role,
        content,
        audio_url: null, // Could store audio URLs if needed
      });
    } catch (error) {
      console.error('[VoiceSession] Failed to save message:', error);
    }
  }

  /**
   * Send message to client via callback
   */
  private sendMessage(message: ServerWSMessage): void {
    this.config.onMessage(message);
  }

  /**
   * Get current session state
   */
  getState(): {
    isActive: boolean;
    isProcessing: boolean;
    sessionDuration: number;
    metrics: ReturnType<UsageTracker['getMetrics']>;
  } {
    return {
      isActive: this.isActive,
      isProcessing: this.state.isProcessing,
      sessionDuration: this.usageTracker.getSessionDuration(),
      metrics: this.usageTracker.getMetrics(),
    };
  }
}
