// ===========================================
// TOGETHER AI PROVIDER
// Together AI API implementation
// ===========================================

import {
  ChatMessage,
  ProviderResponse,
  CallOptions,
  MODEL_MAPPINGS,
  PROVIDER_ENDPOINTS,
} from './types';

/**
 * Call Together AI API
 */
export async function callTogether(
  model: string,
  options: CallOptions
): Promise<ProviderResponse> {
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error('TOGETHER_API_KEY not configured');
  }

  const { systemPrompt, messages, maxTokens = 250, temperature = 1.0 } = options;

  // Together AI uses OpenAI-compatible format with system message in array
  const togetherMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: m.content,
      })),
  ];

  const response = await fetch(PROVIDER_ENDPOINTS.together, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: togetherMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Together] API error:', response.status, errorText);
    throw new Error(`Together API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    console.error('[Together] Empty response:', JSON.stringify(data));
    throw new Error('Together returned empty response');
  }

  return {
    content: data.choices[0].message.content,
    model,
    provider: 'together',
    tokensUsed: data.usage?.completion_tokens,
  };
}

/**
 * Call Together fast model (Qwen 8B)
 */
export async function callTogetherFast(options: CallOptions): Promise<ProviderResponse> {
  return callTogether(MODEL_MAPPINGS.together.fast, options);
}

/**
 * Call Together quality model (Qwen 30B)
 */
export async function callTogetherQuality(options: CallOptions): Promise<ProviderResponse> {
  return callTogether(MODEL_MAPPINGS.together.quality, options);
}
