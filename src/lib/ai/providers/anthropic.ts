// ===========================================
// ANTHROPIC PROVIDER
// Claude API implementation
// ===========================================

import {
  ChatMessage,
  ProviderResponse,
  CallOptions,
  MODEL_MAPPINGS,
  PROVIDER_ENDPOINTS,
} from './types';

/**
 * Call Anthropic Claude API
 */
export async function callAnthropic(
  model: string,
  options: CallOptions
): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const { systemPrompt, messages, maxTokens = 250, temperature = 1.0 } = options;

  // Anthropic uses separate system field, not in messages array
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const response = await fetch(PROVIDER_ENDPOINTS.anthropic, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Anthropic] API error:', response.status, errorText);
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.content?.[0]?.text) {
    console.error('[Anthropic] Empty response:', JSON.stringify(data));
    throw new Error('Anthropic returned empty response');
  }

  return {
    content: data.content[0].text,
    model,
    provider: 'anthropic',
    tokensUsed: data.usage?.output_tokens,
  };
}

/**
 * Call Anthropic fast model (Haiku)
 */
export async function callAnthropicFast(options: CallOptions): Promise<ProviderResponse> {
  return callAnthropic(MODEL_MAPPINGS.anthropic.fast, options);
}

/**
 * Call Anthropic quality model (Sonnet)
 */
export async function callAnthropicQuality(options: CallOptions): Promise<ProviderResponse> {
  return callAnthropic(MODEL_MAPPINGS.anthropic.quality, options);
}
