// ===========================================
// SFW / COMPANION CHAT - LIBRARY EXPORTS
// Completely separate from NSFW system
// ===========================================

// Types
export * from './types';

// Prompt Builder
export { buildSFWSystemPrompt, SFW_PLATFORM_RULES_SUMMARY } from './sfw-prompt-builder';

// Chat Service
export {
  handleSFWChat,
  calculateSFWMessageCost,
  type SFWChatMessage,
  type SFWChatRequest,
  type SFWChatResponse,
} from './sfw-chat-service';
