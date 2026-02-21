// ===========================================
// DEEPGRAM STREAMING STT
// Real-time speech-to-text using Deepgram Nova-2
// ===========================================

import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import type { DeepgramConfig } from './types';
import { DEFAULT_DEEPGRAM_CONFIG } from './types';

export interface DeepgramCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onUtteranceEnd: (fullText: string) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class DeepgramStream {
  private client: ReturnType<typeof createClient>;
  private connection: LiveClient | null = null;
  private isConnected: boolean = false;
  private config: DeepgramConfig;
  private callbacks: DeepgramCallbacks;
  private currentUtterance: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor(callbacks: DeepgramCallbacks, config?: Partial<DeepgramConfig>) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY not configured');
    }

    this.client = createClient(apiKey);
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_DEEPGRAM_CONFIG, ...config };
  }

  async connect(): Promise<void> {
    try {
      console.log('[Deepgram] Connecting to live transcription...');

      this.connection = this.client.listen.live({
        model: this.config.model,
        language: this.config.language,
        encoding: this.config.encoding,
        sample_rate: this.config.sampleRate,
        channels: this.config.channels,
        interim_results: this.config.interimResults,
        endpointing: this.config.endpointing,
        utterance_end_ms: this.config.utteranceEndMs,
        vad_events: this.config.vadEvents,
        smart_format: this.config.smartFormat,
        punctuate: this.config.punctuate,
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Deepgram connection timeout'));
        }, 10000);

        this.connection!.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('[Deepgram] Connected successfully');
          resolve();
        });

        this.connection!.on(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Start keep-alive ping
      this.startKeepAlive();
    } catch (error) {
      console.error('[Deepgram] Connection error:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Transcript event - both interim and final results
    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final ?? false;

      if (transcript) {
        if (isFinal) {
          // Append to current utterance
          this.currentUtterance += (this.currentUtterance ? ' ' : '') + transcript;
        }
        this.callbacks.onTranscript(transcript, isFinal);
      }
    });

    // Utterance end - complete thought detected
    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      if (this.currentUtterance.trim()) {
        console.log('[Deepgram] Utterance complete:', this.currentUtterance);
        this.callbacks.onUtteranceEnd(this.currentUtterance.trim());
        this.currentUtterance = '';
      }
    });

    // VAD speech started
    this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      console.log('[Deepgram] Speech started');
    });

    // Error handling
    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('[Deepgram] Stream error:', error);
      this.callbacks.onError(new Error(String(error)));
    });

    // Connection closed
    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('[Deepgram] Connection closed');
      this.isConnected = false;
      this.stopKeepAlive();
      this.callbacks.onClose();
    });

    // Metadata (for debugging)
    this.connection.on(LiveTranscriptionEvents.Metadata, (metadata) => {
      console.log('[Deepgram] Metadata:', metadata);
    });
  }

  sendAudio(audioBuffer: Buffer): void {
    if (!this.isConnected || !this.connection) {
      console.warn('[Deepgram] Cannot send audio - not connected');
      return;
    }

    try {
      this.connection.send(audioBuffer);
    } catch (error) {
      console.error('[Deepgram] Error sending audio:', error);
    }
  }

  /**
   * Keep connection alive during AI speaking phases
   */
  keepAlive(): void {
    if (!this.isConnected || !this.connection) return;

    try {
      this.connection.keepAlive();
    } catch (error) {
      console.error('[Deepgram] Keep-alive error:', error);
    }
  }

  private startKeepAlive(): void {
    // Send keep-alive every 8 seconds to prevent timeout
    this.keepAliveInterval = setInterval(() => {
      this.keepAlive();
    }, 8000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Reset the current utterance (e.g., after barge-in)
   */
  resetUtterance(): void {
    this.currentUtterance = '';
  }

  /**
   * Get current partial utterance
   */
  getCurrentUtterance(): string {
    return this.currentUtterance;
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Attempt to reconnect after disconnection
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Deepgram] Max reconnect attempts reached');
      throw new Error('Max reconnect attempts reached');
    }

    this.reconnectAttempts++;
    console.log(`[Deepgram] Reconnecting... attempt ${this.reconnectAttempts}`);

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    await this.connect();
  }

  /**
   * Gracefully disconnect
   */
  async disconnect(): Promise<void> {
    console.log('[Deepgram] Disconnecting...');
    this.stopKeepAlive();

    if (this.connection && this.isConnected) {
      try {
        this.connection.finish();
      } catch (error) {
        console.error('[Deepgram] Error during disconnect:', error);
      }
    }

    this.isConnected = false;
    this.connection = null;
    this.currentUtterance = '';
  }
}
