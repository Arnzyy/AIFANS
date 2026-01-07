// ===========================================
// CHAT ACCESS & TOKENIZED SESSIONS CONFIG
// ===========================================

export interface MessagePack {
  messages: number;
  tokens: number;
  label: string;
}

export interface ChatConfig {
  // Subscriber message allowance per billing period
  default_monthly_allowance: number;

  // Paid session message packs (for non-subscribers)
  session_message_packs: MessagePack[];

  // Extension pricing (per message) for buying more
  extra_message_cost_tokens: number;

  // Warning thresholds
  low_message_warning_threshold: number;

  // Session limits
  max_session_messages: number;
  session_expiry_hours: number | null; // null = no time limit

  // Guest access
  allow_guest_opening_message: boolean;

  // Tokens per GBP for display purposes
  tokens_per_gbp: number;
}

export const CHAT_CONFIG: ChatConfig = {
  // Subscribers get 500 messages per month included
  default_monthly_allowance: 500,

  // Non-subscribers can buy message packs
  session_message_packs: [
    { messages: 5, tokens: 125, label: 'Quick Trial' },    // £0.50
    { messages: 15, tokens: 300, label: 'Standard' },      // £1.20
    { messages: 30, tokens: 500, label: 'Extended' },      // £2.00
  ],

  // £0.10 per additional message (25 tokens)
  extra_message_cost_tokens: 25,

  // Show warning when 3 or fewer messages remaining
  low_message_warning_threshold: 3,

  // Max messages per session (prevent abuse)
  max_session_messages: 50,

  // No time expiry - purely message-based
  session_expiry_hours: null,

  // Show opening message to everyone, even logged out users
  allow_guest_opening_message: true,

  // For price display calculations
  tokens_per_gbp: 250,
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get session pack by message count
 */
export function getSessionPack(messages: number): MessagePack | undefined {
  return CHAT_CONFIG.session_message_packs.find(p => p.messages === messages);
}

/**
 * Calculate cost for extending messages
 */
export function calculateExtensionCost(messages: number): number {
  return messages * CHAT_CONFIG.extra_message_cost_tokens;
}

/**
 * Format tokens as GBP string
 */
export function formatTokensAsGbp(tokens: number): string {
  const pounds = tokens / CHAT_CONFIG.tokens_per_gbp;
  return `£${pounds.toFixed(2)}`;
}

/**
 * Check if messages are low (should show warning)
 */
export function isLowMessages(remaining: number | null): boolean {
  if (remaining === null) return false; // unlimited
  return remaining <= CHAT_CONFIG.low_message_warning_threshold;
}

/**
 * Get appropriate warning message
 */
export function getLowMessageWarning(remaining: number): string {
  if (remaining === 0) {
    return "You've used all your messages. Purchase more to continue chatting.";
  }
  if (remaining === 1) {
    return "This is your last message! Purchase more to keep chatting.";
  }
  return `Only ${remaining} messages remaining. Purchase more soon!`;
}
