// ===========================================
// AI PROVIDER ABSTRACTION
// Factory for calling AI models across providers
// ===========================================

import {
  AIProvider,
  ModelTier,
  ChatMessage,
  ProviderResponse,
  CallOptions,
  MODEL_MAPPINGS,
} from './types';
import { callAnthropic, callAnthropicFast, callAnthropicQuality } from './anthropic';
import { callTogether, callTogetherFast, callTogetherQuality } from './together';

// Re-export types
export type { AIProvider, ModelTier, ChatMessage, ProviderResponse, CallOptions };
export { MODEL_MAPPINGS };

// ===========================================
// PROVIDER DETECTION
// ===========================================

/**
 * Get the current AI provider from environment
 * Defaults to 'anthropic' if not set
 */
export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'together') {
    return 'together';
  }
  return 'anthropic'; // Default
}

/**
 * Check if the current provider is configured
 */
export function isProviderConfigured(): boolean {
  const provider = getProvider();
  if (provider === 'anthropic') {
    return !!process.env.ANTHROPIC_API_KEY;
  }
  if (provider === 'together') {
    return !!process.env.TOGETHER_API_KEY;
  }
  return false;
}

// ===========================================
// MODEL TIER FUNCTIONS
// ===========================================

/**
 * Call the fast model for the current provider
 * Use for: simple messages, memory extraction, welcome-back generation
 * Cost-optimized, still good quality for straightforward tasks
 */
export async function callFastModel(options: CallOptions): Promise<ProviderResponse> {
  const provider = getProvider();

  console.log('[Provider] Calling fast model:', {
    provider,
    model: MODEL_MAPPINGS[provider].fast,
    promptLength: options.systemPrompt.length,
    messageCount: options.messages.length,
  });

  if (provider === 'together') {
    return callTogetherFast(options);
  }
  return callAnthropicFast(options);
}

/**
 * Call the quality model for the current provider
 * Use for: complex messages, emotional content, explicit handling, compliance retries
 * Higher cost, maximum instruction following
 */
export async function callQualityModel(options: CallOptions): Promise<ProviderResponse> {
  const provider = getProvider();

  console.log('[Provider] Calling quality model:', {
    provider,
    model: MODEL_MAPPINGS[provider].quality,
    promptLength: options.systemPrompt.length,
    messageCount: options.messages.length,
  });

  if (provider === 'together') {
    return callTogetherQuality(options);
  }
  return callAnthropicQuality(options);
}

/**
 * Call a specific model by tier
 * Useful when routing logic determines the tier externally
 */
export async function callModelByTier(
  tier: ModelTier,
  options: CallOptions
): Promise<ProviderResponse> {
  if (tier === 'fast') {
    return callFastModel(options);
  }
  return callQualityModel(options);
}

/**
 * Call a specific model by name (for backwards compatibility with existing routing)
 * Maps Anthropic model names to the appropriate tier
 */
export async function callModelByName(
  modelName: string,
  options: CallOptions
): Promise<ProviderResponse> {
  const provider = getProvider();

  // Determine tier from model name
  const isHaiku = modelName.includes('haiku');
  const tier: ModelTier = isHaiku ? 'fast' : 'quality';

  console.log('[Provider] Routing model by name:', {
    requestedModel: modelName,
    provider,
    resolvedTier: tier,
    actualModel: MODEL_MAPPINGS[provider][tier],
  });

  return callModelByTier(tier, options);
}

// ===========================================
// DIRECT PROVIDER CALLS (for specific use cases)
// ===========================================

/**
 * Call Anthropic directly with a specific model
 * Use only when you need provider-specific behavior
 */
export { callAnthropic } from './anthropic';

/**
 * Call Together directly with a specific model
 * Use only when you need provider-specific behavior
 */
export { callTogether } from './together';

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get model name for current provider and tier
 */
export function getModelName(tier: ModelTier): string {
  const provider = getProvider();
  return MODEL_MAPPINGS[provider][tier];
}

/**
 * Format messages for logging (truncated)
 */
export function formatMessagesForLog(messages: ChatMessage[]): string {
  return messages
    .slice(-3)
    .map(m => `${m.role}: ${m.content.slice(0, 50)}...`)
    .join(' | ');
}
