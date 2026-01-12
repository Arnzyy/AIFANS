// ===========================================
// CHAT ACCESS CONTROL SERVICE
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';
import { CHAT_CONFIG, calculateExtensionCost, formatTokensAsGbp } from './config';
import { isAdminUser } from '@/lib/auth/admin';

// ===========================================
// TYPES
// ===========================================

export type ChatAccessType = 'none' | 'subscription' | 'paid_session' | 'preview' | 'guest';

export interface UnlockOption {
  type: 'login' | 'subscribe' | 'paid_session' | 'extend_messages';
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
  // Not logged in = guest preview
  if (!userId) {
    return {
      hasAccess: false,
      accessType: 'guest',
      messagesRemaining: null,
      canSendMessage: false,
      requiresUnlock: true,
      unlockOptions: getGuestUnlockOptions(),
      isLowMessages: false,
    };
  }

  // Check if user is admin (bypass all access checks)
  const { data: { user } } = await supabase.auth.getUser();
  if (user && isAdminUser(user.email)) {
    return {
      hasAccess: true,
      accessType: 'subscription',
      messagesRemaining: null, // unlimited for admin
      canSendMessage: true,
      requiresUnlock: false,
      unlockOptions: [],
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
  // The creatorId might be a model ID, creator ID, or profile ID
  // We need to find the profile ID (user_id) that subscriptions reference
  let profileIdToCheck: string | null = null;

  console.log('[checkSubscriptionAccess] Input creatorId:', creatorId, 'userId:', userId);

  // First, check if creatorId is a model ID
  const { data: model, error: modelError } = await supabase
    .from('creator_models')
    .select('id, creator_id')
    .eq('id', creatorId)
    .single();

  console.log('[checkSubscriptionAccess] Model lookup:', model ? `Found model, creator_id: ${model.creator_id}` : 'Not a model', modelError?.message || '');

  if (model) {
    // It's a model - get the creator's profile ID
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', model.creator_id)
      .single();

    console.log('[checkSubscriptionAccess] Creator lookup:', creator ? `Found creator, user_id: ${creator.user_id}` : 'Creator not found', creatorError?.message || '');
    profileIdToCheck = creator?.user_id || null;
  } else {
    // Check if it's a creator ID
    const { data: creator } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', creatorId)
      .single();

    if (creator) {
      profileIdToCheck = creator.user_id;
      console.log('[checkSubscriptionAccess] Found creator directly, user_id:', creator.user_id);
    } else {
      // Maybe it's already a profile ID - check profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', creatorId)
        .single();
      if (profile) {
        profileIdToCheck = profile.id;
        console.log('[checkSubscriptionAccess] Found profile directly:', profile.id);
      }
    }
  }

  // If we couldn't resolve to a profile ID, try direct lookup as fallback
  if (!profileIdToCheck) {
    console.log('[checkSubscriptionAccess] Could not resolve profile ID, using creatorId as fallback');
    profileIdToCheck = creatorId;
  }

  console.log('[checkSubscriptionAccess] Checking subscription for subscriber:', userId, 'creator:', profileIdToCheck);

  // Simple subscription check - just see if an active subscription exists
  // Only select columns that exist in the table
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('id, status, subscription_type')
    .eq('subscriber_id', userId)
    .eq('creator_id', profileIdToCheck)
    .eq('status', 'active')
    .in('subscription_type', ['chat', 'bundle'])
    .maybeSingle();

  console.log('[checkSubscriptionAccess] Subscription result:', subscription ? `Found: ${subscription.id}, type: ${subscription.subscription_type}` : 'Not found', error?.message || '');

  if (error || !subscription) {
    console.log('[checkSubscriptionAccess] No subscription - returning no access');
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

  console.log('[checkSubscriptionAccess] Found subscription! Returning access');

  // Subscribers get unlimited messages for now
  const remaining: number | null = null; // null = unlimited
  const canSend = true;
  const isLow = false;

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

/**
 * Get unlock options for guest (not logged in) users
 */
function getGuestUnlockOptions(): UnlockOption[] {
  const options: UnlockOption[] = [];

  // Login is primary CTA for guests
  options.push({
    type: 'login',
    label: 'Log in to chat',
    recommended: true,
  });

  // Also show subscribe option (will need to log in first)
  options.push({
    type: 'subscribe',
    label: 'Subscribe',
  });

  // Show one session pack option to tease the pricing
  const smallPack = CHAT_CONFIG.session_message_packs[0];
  if (smallPack) {
    options.push({
      type: 'paid_session',
      label: `Try ${smallPack.messages} messages`,
      cost: smallPack.tokens,
      costDisplay: formatTokensAsGbp(smallPack.tokens),
      messages: smallPack.messages,
    });
  }

  return options;
}

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
