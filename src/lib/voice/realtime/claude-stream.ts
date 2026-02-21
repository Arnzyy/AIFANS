// ===========================================
// CLAUDE STREAMING FOR VOICE
// Streaming responses optimized for spoken output
// ===========================================

import { buildPersonalityPrompt } from '@/lib/ai/personality/prompt-builder';
import type { AIPersonalityFull } from '@/lib/ai/personality/prompt-builder';
import type { ConversationMessage } from './types';

// Voice-specific system prompt addition
const VOICE_SYSTEM_ADDITION = `

═══════════════════════════════════════════════════════════════════
VOICE CONVERSATION MODE
═══════════════════════════════════════════════════════════════════

You are in a LIVE VOICE CALL. Your responses will be spoken aloud via text-to-speech.

CRITICAL VOICE RULES:
- Keep responses SHORT: 1-3 sentences for casual chat, up to 5 for complex topics
- Use natural SPOKEN language — contractions, conversational tone
- NO markdown, NO bullet points, NO asterisks, NO emojis, NO special formatting
- NO "As an AI" or breaking character
- Use "..." for natural pauses if needed
- React naturally if interrupted (barge-in occurs)
- Sound like a real person on a phone call, not a text message
- Match the energy of the conversation — if they're excited, be excited back

NATURAL SPEECH PATTERNS:
- Use filler words sparingly: "um", "like", "you know"
- Use contractions: "I'm", "don't", "that's"
- Use casual expressions: "Oh!", "Mmm", "Right"
- End with questions to keep conversation flowing

AVOID:
- Long explanations
- Lists or bullet points
- Technical jargon unless asked
- Stiff or formal language
- Starting with "Certainly" or "Of course"
`;

export interface ClaudeStreamConfig {
  model: string;
  maxTokens: number;
}

export interface ClaudeStreamResult {
  type: 'token' | 'done';
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

const DEFAULT_CONFIG: ClaudeStreamConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 300, // Short responses for voice
};

export class ClaudeStream {
  private personality: AIPersonalityFull;
  private conversationHistory: ConversationMessage[];
  private systemPrompt: string;
  private config: ClaudeStreamConfig;
  private apiKey: string;

  constructor(
    personality: AIPersonalityFull,
    initialHistory: ConversationMessage[] = [],
    config?: Partial<ClaudeStreamConfig>
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    this.apiKey = apiKey;
    this.personality = personality;
    this.conversationHistory = [...initialHistory];
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Build system prompt with voice additions
    const personalityPrompt = buildPersonalityPrompt(personality);
    this.systemPrompt = personalityPrompt + VOICE_SYSTEM_ADDITION;
  }

  /**
   * Add a message to conversation history
   */
  addMessage(role: 'user' | 'assistant', content: string, wasInterrupted = false): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
      wasInterrupted,
    });

    // Keep history manageable (last 20 messages)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Stream a response to the user's message
   */
  async *stream(
    userMessage: string,
    abortSignal?: AbortSignal
  ): AsyncGenerator<ClaudeStreamResult> {
    // Add user message to history
    this.addMessage('user', userMessage);

    // Format messages for API
    const messages = this.conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    }));

    console.log('[Claude] Starting voice stream...');
    console.log('[Claude] Message count:', messages.length);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: this.systemPrompt,
          messages,
          stream: true,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Claude] API error:', response.status, errorText);
        throw new Error(`Claude API error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              // Handle different event types
              if (event.type === 'content_block_delta') {
                const text = event.delta?.text || '';
                if (text) {
                  fullResponse += text;
                  yield { type: 'token', text };
                }
              } else if (event.type === 'message_delta') {
                // Final usage stats
                if (event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
              } else if (event.type === 'message_start') {
                // Input tokens from message start
                if (event.message?.usage) {
                  inputTokens = event.message.usage.input_tokens || 0;
                }
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Add assistant response to history
      if (fullResponse) {
        this.addMessage('assistant', fullResponse);
      }

      console.log('[Claude] Stream complete. Response length:', fullResponse.length);

      yield {
        type: 'done',
        text: fullResponse,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      if (abortSignal?.aborted) {
        console.log('[Claude] Stream aborted (barge-in)');
        throw new Error('Stream aborted');
      }
      console.error('[Claude] Stream error:', error);
      throw error;
    }
  }

  /**
   * Get partial response for interrupted sessions
   */
  getPartialResponse(): string {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastMessage?.role === 'assistant') {
      return lastMessage.content;
    }
    return '';
  }

  /**
   * Mark the last assistant message as interrupted
   */
  markLastAsInterrupted(): void {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastMessage?.role === 'assistant') {
      lastMessage.wasInterrupted = true;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Update personality (for dynamic changes)
   */
  updatePersonality(personality: AIPersonalityFull): void {
    this.personality = personality;
    const personalityPrompt = buildPersonalityPrompt(personality);
    this.systemPrompt = personalityPrompt + VOICE_SYSTEM_ADDITION;
  }
}
