// ===========================================
// AI PROVIDER TYPES
// Shared types for provider abstraction layer
// ===========================================

export type AIProvider = 'anthropic' | 'together';

export type ModelTier = 'fast' | 'quality';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderResponse {
  content: string;
  model: string;
  provider: AIProvider;
  tokensUsed?: number;
}

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  models: {
    fast: string;
    quality: string;
  };
  endpoint: string;
}

export interface CallOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

// Model mappings per provider
export const MODEL_MAPPINGS: Record<AIProvider, { fast: string; quality: string }> = {
  anthropic: {
    fast: 'claude-3-5-haiku-20241022',
    quality: 'claude-sonnet-4-20250514',
  },
  together: {
    fast: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
    quality: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
  },
};

// Provider endpoints
export const PROVIDER_ENDPOINTS: Record<AIProvider, string> = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  together: 'https://api.together.xyz/v1/chat/completions',
};
