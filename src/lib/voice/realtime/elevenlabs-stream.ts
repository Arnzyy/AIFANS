// ===========================================
// ELEVENLABS STREAMING TTS
// Streaming text-to-speech for voice output
// ===========================================

import type { ElevenLabsStreamConfig } from './types';
import { DEFAULT_ELEVENLABS_CONFIG } from './types';

export interface ElevenLabsStreamResult {
  type: 'audio' | 'done' | 'error';
  data?: string; // Base64 encoded audio chunk
  error?: string;
}

export class ElevenLabsStream {
  private config: ElevenLabsStreamConfig;
  private apiKey: string;
  private abortController: AbortController | null = null;
  private isStreaming = false;
  private totalCharacters = 0;

  constructor(
    voiceId: string,
    config?: Partial<ElevenLabsStreamConfig>
  ) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    this.apiKey = apiKey;
    this.config = {
      voiceId,
      ...DEFAULT_ELEVENLABS_CONFIG,
      ...config,
    } as ElevenLabsStreamConfig;
  }

  /**
   * Stream text to speech, yielding audio chunks
   */
  async *stream(text: string): AsyncGenerator<ElevenLabsStreamResult> {
    if (this.isStreaming) {
      console.warn('[ElevenLabs] Already streaming, aborting previous');
      this.abort();
    }

    this.isStreaming = true;
    this.abortController = new AbortController();
    this.totalCharacters += text.length;

    console.log('[ElevenLabs] Starting TTS stream...');
    console.log('[ElevenLabs] Text length:', text.length);
    console.log('[ElevenLabs] Voice:', this.config.voiceId);

    try {
      // Use streaming endpoint with websocket-like chunking
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.config.modelId,
            voice_settings: {
              stability: this.config.stability,
              similarity_boost: this.config.similarityBoost,
              style: this.config.style,
              speed: this.config.speed,
            },
            output_format: this.config.outputFormat,
          }),
          signal: this.abortController.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ElevenLabs] API error:', response.status, errorText);
        yield { type: 'error', error: `ElevenLabs API error: ${response.status}` };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const reader = response.body.getReader();
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert to base64 for WebSocket transmission
        const base64Chunk = this.arrayBufferToBase64(value);
        totalBytes += value.byteLength;

        yield { type: 'audio', data: base64Chunk };
      }

      console.log('[ElevenLabs] Stream complete. Total bytes:', totalBytes);
      yield { type: 'done' };

    } catch (error) {
      if (this.abortController?.signal.aborted) {
        console.log('[ElevenLabs] Stream aborted');
        yield { type: 'done' };
        return;
      }
      console.error('[ElevenLabs] Stream error:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  /**
   * Abort current stream (for barge-in)
   */
  abort(): void {
    if (this.abortController) {
      console.log('[ElevenLabs] Aborting stream');
      this.abortController.abort();
      this.abortController = null;
    }
    this.isStreaming = false;
  }

  /**
   * Check if currently streaming
   */
  get streaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get total characters processed (for usage tracking)
   */
  get charactersProcessed(): number {
    return this.totalCharacters;
  }

  /**
   * Reset character counter
   */
  resetCharacterCount(): void {
    this.totalCharacters = 0;
  }

  /**
   * Update voice settings
   */
  updateConfig(config: Partial<ElevenLabsStreamConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, 'binary').toString('base64');
  }

  /**
   * Estimate audio duration from text
   * Rough estimate: ~150 words per minute = ~2.5 words per second
   * Average word length: 5 characters
   */
  static estimateAudioDuration(text: string): number {
    const words = text.length / 5;
    const seconds = words / 2.5;
    return Math.ceil(seconds);
  }
}

/**
 * Generate a one-off TTS audio file (for previews)
 */
export async function generateTTSPreview(
  voiceId: string,
  text: string,
  config?: Partial<ElevenLabsStreamConfig>
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const settings = { ...DEFAULT_ELEVENLABS_CONFIG, ...config };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: settings.modelId,
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarityBoost,
          style: settings.style,
          speed: settings.speed,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
