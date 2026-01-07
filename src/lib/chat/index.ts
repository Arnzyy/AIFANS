// ===========================================
// CHAT LIBRARY - EXPORTS
// ===========================================

// Chat access control
export {
  checkChatAccess,
  purchaseChatSession,
  extendMessages,
  decrementMessage,
  type ChatAccessType,
  type ChatAccess,
  type ChatSession,
  type UnlockOption,
  type PurchaseSessionResult,
  type DecrementResult,
} from './chat-access';

// Opening message system
export {
  generateOpeningMessage,
  saveCustomOpeningMessage,
  getOpeningMessages,
  type OpeningMessageType,
  type OpeningMessageContext,
  type GeneratedOpeningMessage,
} from './opening-message';

// Configuration
export {
  CHAT_CONFIG,
  getSessionPack,
  calculateExtensionCost,
  formatTokensAsGbp,
  isLowMessages,
  getLowMessageWarning,
  type ChatConfig,
  type MessagePack,
} from './config';
