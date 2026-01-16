// ===========================================
// FEATURE FLAGS
// Toggle new features safely
// ===========================================

export const FEATURE_FLAGS = {
  // ===========================================
  // ENHANCED CHAT SYSTEM
  // ===========================================
  
  /**
   * Enable the enhanced chat system with:
   * - Conversation state tracking (prevents repetitive patterns)
   * - Smart memory injection (contextual memory)
   * - User preference learning (adapts to user behavior)
   * - Dynamic few-shot examples (heat-aware)
   * 
   * Set to true to enable, false to use existing system
   */
  ENHANCED_CHAT_ENABLED: false,
  
  /**
   * Enable analytics logging even if enhanced chat is disabled
   * This lets you collect data without changing chat behavior
   */
  ANALYTICS_LOGGING_ENABLED: true,
  
  /**
   * Enable for specific creator IDs only (for testing)
   * If empty array, flag applies to all creators
   * Example: ['creator-uuid-1', 'creator-uuid-2']
   */
  ENHANCED_CHAT_CREATOR_WHITELIST: [] as string[],
  
  /**
   * Enable for specific user IDs only (for testing)
   * If empty array, flag applies to all users
   */
  ENHANCED_CHAT_USER_WHITELIST: [] as string[],
  
  /**
   * Percentage of traffic to send to enhanced system (0-100)
   * Only used if whitelists are empty
   * Set to 100 to enable for everyone, 10 for 10% rollout
   */
  ENHANCED_CHAT_ROLLOUT_PERCENT: 0,
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if enhanced chat should be used for this request
 */
export function shouldUseEnhancedChat(
  userId: string,
  creatorId: string
): boolean {
  // Master kill switch
  if (!FEATURE_FLAGS.ENHANCED_CHAT_ENABLED) {
    return false;
  }
  
  // Check creator whitelist
  if (FEATURE_FLAGS.ENHANCED_CHAT_CREATOR_WHITELIST.length > 0) {
    if (!FEATURE_FLAGS.ENHANCED_CHAT_CREATOR_WHITELIST.includes(creatorId)) {
      return false;
    }
  }
  
  // Check user whitelist
  if (FEATURE_FLAGS.ENHANCED_CHAT_USER_WHITELIST.length > 0) {
    if (!FEATURE_FLAGS.ENHANCED_CHAT_USER_WHITELIST.includes(userId)) {
      return false;
    }
  }
  
  // If whitelists are empty, use percentage rollout
  if (
    FEATURE_FLAGS.ENHANCED_CHAT_CREATOR_WHITELIST.length === 0 &&
    FEATURE_FLAGS.ENHANCED_CHAT_USER_WHITELIST.length === 0
  ) {
    // Consistent assignment based on user ID (same user always gets same experience)
    const hash = simpleHash(userId);
    const bucket = hash % 100;
    return bucket < FEATURE_FLAGS.ENHANCED_CHAT_ROLLOUT_PERCENT;
  }
  
  return true;
}

/**
 * Check if analytics should be logged
 */
export function shouldLogAnalytics(): boolean {
  return FEATURE_FLAGS.ANALYTICS_LOGGING_ENABLED;
}

/**
 * Simple hash function for consistent user bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
