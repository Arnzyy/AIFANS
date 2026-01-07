// ===========================================
// CHAT ACCESS CONTROL SERVICE
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';
import { CHAT_CONFIG, calculateExtensionCost, formatTokensAsGbp } from './config';

// ===========================================
// TYPES
// ===========================================

export type ChatAccessType = 'none' | 'subscription' | 'paid_session' | 'preview';

export interface UnlockOption {
  type: 'subscribe' | 'paid_session' | 'extend_messages';
  label: string;
  cost?: number; // tokens
  costDisplay?: string; // £X.XX
  messages?: number;
  recommended?: boolean;
}

export interface ChatAccess {
  hasAccess: boolean;
  accessType: ChatAccessType;
  messagesRemaining: number | null; // null = unlimited (or not tracked)
  canSendMessage: boolean;
  requiresUnlock: boolean;
  unlockOptions: UnlockOption[];
  subscriptionId?: string;
  sessionId?: string;
  isLowMessages: boolean;
  warningMessage?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  creator_id: string;
  model_id?: string;
  messages_purchased: number;
  messages_remaining: number;
  cost_tokens: number;
  status: 'active' | 'expired' | 'exhausted';
  created_at: string;
  last_message_at?: string;
}

export interface PurchaseSessionResult {
  success: boolean;
  session_id?: string;
  new_balance?: number;
  error_message?: string;
}

export interface DecrementResult {
  success: boolean;
  messages_remaining: number;
  session_exhausted: boolean;
  error_message?: string;
}

// ===========================================
// MAIN ACCESS CHECK FUNCTION
// ===========================================

/**
 * Check user's chat access for a specific creator
 */
export async function checkChatAccess(
  supabase: SupabaseClient,
  userId: string | null,
  creatorId: string
): Promise<ChatAccess> {
  // Not logged in = preview only
  if (!userId) {
    return {
      hasAccess: false,
      accessType: 'preview',
      messagesRemaining: null,
      canSendMessage: false,
      requiresUnlock: true,
      unlockOptions: getUnlockOptions(false, null),
      isLowMessages: false,
    };
  }

  // Check for active subscription first
  const subscriptionAccess = await checkSubscriptionAccess(supabase, userId, creatorId);
  if (subscriptionAccess.hasAccess) {
    return subscriptionAccess;
  }

  // Check for active paid session
  const sessionAccess = await checkPaidSessionAccess(supabase, userId, creatorId);
  if (sessionAccess.hasAccess) {
    return sessionAccess;
  }

  // No access - return unlock options
  return {
    hasAccess: false,
    accessType: 'none',
    messagesRemaining: null,
    canSendMessage: false,
    requiresUnlock: true,
    unlockOptions: getUnlockOptions(false, null),
    isLowMessages: false,
  };
}

// ===========================================
// SUBSCRIPTION ACCESS CHECK
// ===========================================

async function checkSubscriptionAccess(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string
): Promise<ChatAccess> {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      messages_used_this_period,
      period_messages_reset_at,
      current_period_start,
      tier:subscription_tiers(monthly_message_allowance)
    `)
    .eq('subscriber_id', userId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single();

  if (error || !subscription) {
    return {
      hasAccess: false,
      accessType: 'none',
      messagesRemaining: null,
      canSendMessage: false,
      requiresUnlock: true,
      unlockOptions: getUnlockOptions(false, null),
      isLowMessages: false,
    };
  }

  // Handle tier - can be array or object from Supabase join
  const tierData = subscription.tier;
  const tier = Array.isArray(tierData) ? tierData[0] : tierData;
  const allowance = (tier as { monthly_message_allowance: number | null } | null)?.monthly_message_allowance ?? CHAT_CONFIG.default_monthly_allowance;
  const used = subscription.messages_used_this_period ?? 0;

  // Check if we're in a new billing period (messages should reset)
  const resetAt = subscription.period_messages_reset_at
    ? new Date(subscription.period_messages_reset_at)
    : null;
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start)
    : new Date();

  const needsReset = !resetAt || resetAt < periodStart;
  const effectiveUsed = needsReset ? 0 : used;

  // null allowance means unlimited
  const remaining = allowance === null ? null : Math.max(0, allowance - effectiveUsed);
  const canSend = remaining === null || remaining > 0;
  const isLow = remaining !== null && remaining <= CHAT_CONFIG.low_message_warning_threshold;

  return {
    hasAccess: true,
    accessType: 'subscription',
    messagesRemaining: remaining,
    canSendMessage: canSend,
    requiresUnlock: !canSend,
    unlockOptions: canSend ? [] : getUnlockOptions(true, remaining),
    subscriptionId: subscription.id,
    isLowMessages: isLow,
    warningMessage: isLow && remaining !== null ? getWarningMessage(remaining) : undefined,
  };
}

// ===========================================
// PAID SESSION ACCESS CHECK
// ===========================================

async function checkPaidSessionAccess(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string
): Promise<ChatAccess> {
  const { data: session, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single();

  if (error || !session) {
    return {
      hasAccess: false,
      accessType: 'none',
      messagesRemaining: null,
      canSendMessage: false,
      requiresUnlock: true,
      unlockOptions: getUnlockOptions(false, null),
      isLowMessages: false,
    };
  }

  const remaining = session.messages_remaining;
  const canSend = remaining > 0;
  const isLow = remaining <= CHAT_CONFIG.low_message_warning_threshold;

  return {
    hasAccess: true,
    accessType: 'paid_session',
    messagesRemaining: remaining,
    canSendMessage: canSend,
    requiresUnlock: !canSend,
    unlockOptions: canSend ? [] : getUnlockOptions(false, remaining),
    sessionId: session.id,
    isLowMessages: isLow,
    warningMessage: isLow ? getWarningMessage(remaining) : undefined,
  };
}

// ===========================================
// PURCHASE SESSION
// ===========================================

/**
 * Purchase a new chat session with tokens
 */
export async function purchaseChatSession(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  messages: number,
  costTokens: number,
  modelId?: string
): Promise<PurchaseSessionResult> {
  const { data, error } = await supabase.rpc('purchase_chat_session', {
    p_user_id: userId,
    p_creator_id: creatorId,
    p_model_id: modelId || null,
    p_messages: messages,
    p_cost_tokens: costTokens,
  });

  if (error) {
    console.error('Purchase chat session error:', error);
    return {
      success: false,
      error_message: error.message,
    };
  }

  const result = data?.[0];
  return {
    success: result?.success ?? false,
    session_id: result?.session_id,
    new_balance: result?.new_balance,
    error_message: result?.error_message,
  };
}

// ===========================================
// EXTEND SESSION
// ===========================================

/**
 * Extend a session or subscription with additional messages
 */
export async function extendMessages(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  messages: number
): Promise<{ success: boolean; new_remaining?: number; new_balance?: number; error_message?: string }> {
  const cost = calculateExtensionCost(messages);

  const { data, error } = await supabase.rpc('extend_chat_session', {
    p_user_id: userId,
    p_creator_id: creatorId,
    p_messages: messages,
    p_cost_tokens: cost,
  });

  if (error) {
    console.error('Extend session error:', error);
    return {
      success: false,
      error_message: error.message,
    };
  }

  const result = data?.[0];
  return {
    success: result?.success ?? false,
    new_remaining: result?.new_remaining,
    new_balance: result?.new_balance,
    error_message: result?.error_message,
  };
}

// ===========================================
// DECREMENT MESSAGE
// ===========================================

/**
 * Decrement message count after sending (call this after successful message send)
 */
export async function decrementMessage(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  accessType: ChatAccessType
): Promise<DecrementResult> {
  if (accessType === 'subscription') {
    const { data, error } = await supabase.rpc('decrement_subscription_message', {
      p_user_id: userId,
      p_creator_id: creatorId,
    });

    if (error) {
      return { success: false, messages_remaining: 0, session_exhausted: false, error_message: error.message };
    }

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      messages_remaining: result?.messages_remaining ?? 0,
      session_exhausted: false,
      error_message: result?.error_message,
    };
  }

  if (accessType === 'paid_session') {
    const { data, error } = await supabase.rpc('decrement_chat_session_message', {
      p_user_id: userId,
      p_creator_id: creatorId,
    });

    if (error) {
      return { success: false, messages_remaining: 0, session_exhausted: true, error_message: error.message };
    }

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      messages_remaining: result?.messages_remaining ?? 0,
      session_exhausted: result?.session_exhausted ?? false,
      error_message: result?.error_message,
    };
  }

  return { success: false, messages_remaining: 0, session_exhausted: false, error_message: 'Invalid access type' };
}

// ===========================================
// HELPERS
// ===========================================

function getUnlockOptions(isSubscriber: boolean, remaining: number | null): UnlockOption[] {
  const options: UnlockOption[] = [];

  // Always offer subscribe option for non-subscribers
  if (!isSubscriber) {
    options.push({
      type: 'subscribe',
      label: 'Subscribe for unlimited chat',
      recommended: true,
    });

    // Offer paid session packs
    for (const pack of CHAT_CONFIG.session_message_packs) {
      options.push({
        type: 'paid_session',
        label: `${pack.messages} messages`,
        cost: pack.tokens,
        costDisplay: formatTokensAsGbp(pack.tokens),
        messages: pack.messages,
      });
    }
  } else {
    // Subscriber ran out of messages - offer extensions
    const extendAmounts = [10, 25, 50];
    for (const amount of extendAmounts) {
      const cost = calculateExtensionCost(amount);
      options.push({
        type: 'extend_messages',
        label: `${amount} more messages`,
        cost,
        costDisplay: formatTokensAsGbp(cost),
        messages: amount,
      });
    }
  }

  return options;
}

function getWarningMessage(remaining: number): string {
  if (remaining === 0) {
    return "You've used all your messages. Purchase more to continue.";
  }
  if (remaining === 1) {
    return 'This is your last message!';
  }
  return `${remaining} messages remaining`;
}
