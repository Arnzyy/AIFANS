// ===========================================
// OPTIMIZED CHAT ACCESS CONTROL
// Reduces 4+ queries to 1-2 with parallelization
// ===========================================

import { SupabaseClient, User } from '@supabase/supabase-js';
import { CHAT_CONFIG, calculateExtensionCost, formatTokensAsGbp } from './config';
import { isAdminUser } from '@/lib/auth/admin';

// ===========================================
// TYPES (re-export from main module)
// ===========================================

export type ChatAccessType = 'none' | 'subscription' | 'paid_session' | 'preview' | 'guest';

export interface UnlockOption {
  type: 'login' | 'subscribe' | 'paid_session' | 'extend_messages';
  label: string;
  cost?: number;
  costDisplay?: string;
  messages?: number;
  recommended?: boolean;
}

export interface ChatAccess {
  hasAccess: boolean;
  accessType: ChatAccessType;
  messagesRemaining: number | null;
  canSendMessage: boolean;
  requiresUnlock: boolean;
  unlockOptions: UnlockOption[];
  subscriptionId?: string;
  sessionId?: string;
  isLowMessages: boolean;
  warningMessage?: string;
}

// ===========================================
// OPTIMIZED ACCESS CHECK
// ===========================================

/**
 * Optimized chat access check - accepts user to avoid redundant auth call
 * Runs subscription and session checks in parallel
 *
 * Before: 4 sequential queries (auth, model, subscription, session)
 * After: 1-2 parallel queries (subscription + session in parallel)
 */
export async function checkChatAccessOptimized(
  supabase: SupabaseClient,
  user: User | null,
  creatorId: string
): Promise<ChatAccess> {
  // Not logged in = guest preview
  if (!user) {
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

  // Admin bypass (no DB call needed - uses email from passed user)
  if (isAdminUser(user.email)) {
    return {
      hasAccess: true,
      accessType: 'subscription',
      messagesRemaining: null,
      canSendMessage: true,
      requiresUnlock: false,
      unlockOptions: [],
      isLowMessages: false,
    };
  }

  // Run subscription and session checks IN PARALLEL
  // This cuts query time in half when both need to be checked
  const [subscriptionResult, sessionResult] = await Promise.all([
    checkSubscriptionParallel(supabase, user.id, creatorId),
    checkSessionParallel(supabase, user.id, creatorId),
  ]);

  // Prefer subscription access over session
  if (subscriptionResult.hasAccess) {
    return subscriptionResult;
  }

  if (sessionResult.hasAccess) {
    return sessionResult;
  }

  // No access
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
// PARALLEL SUBSCRIPTION CHECK
// ===========================================

async function checkSubscriptionParallel(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string
): Promise<ChatAccess> {
  // Single query with OR to check both direct creatorId and via model
  // This combines the model lookup + subscription check into one query
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      subscription_type,
      creator_id
    `)
    .eq('subscriber_id', userId)
    .eq('status', 'active')
    .in('subscription_type', ['chat', 'bundle'])
    .or(`creator_id.eq.${creatorId}`)
    .limit(1)
    .maybeSingle();

  // If no direct match, check if creatorId is a model and look up via model's creator_id
  if (!subscription) {
    // Try to find subscription via model's creator_id
    const { data: modelSub } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        subscription_type,
        creator:creator_models!inner(id, creator_id)
      `)
      .eq('subscriber_id', userId)
      .eq('status', 'active')
      .in('subscription_type', ['chat', 'bundle'])
      .eq('creator_models.id', creatorId)
      .limit(1)
      .maybeSingle();

    if (!modelSub) {
      return {
        hasAccess: false,
        accessType: 'none',
        messagesRemaining: null,
        canSendMessage: false,
        requiresUnlock: true,
        unlockOptions: [],
        isLowMessages: false,
      };
    }

    return {
      hasAccess: true,
      accessType: 'subscription',
      messagesRemaining: null,
      canSendMessage: true,
      requiresUnlock: false,
      unlockOptions: [],
      subscriptionId: modelSub.id,
      isLowMessages: false,
    };
  }

  return {
    hasAccess: true,
    accessType: 'subscription',
    messagesRemaining: null,
    canSendMessage: true,
    requiresUnlock: false,
    unlockOptions: [],
    subscriptionId: subscription.id,
    isLowMessages: false,
  };
}

// ===========================================
// PARALLEL SESSION CHECK
// ===========================================

async function checkSessionParallel(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string
): Promise<ChatAccess> {
  const { data: session, error } = await supabase
    .from('chat_sessions')
    .select('id, messages_remaining')
    .eq('user_id', userId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) {
    return {
      hasAccess: false,
      accessType: 'none',
      messagesRemaining: null,
      canSendMessage: false,
      requiresUnlock: true,
      unlockOptions: [],
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
// HELPERS (same as original)
// ===========================================

function getGuestUnlockOptions(): UnlockOption[] {
  const options: UnlockOption[] = [];

  options.push({
    type: 'login',
    label: 'Log in to chat',
    recommended: true,
  });

  options.push({
    type: 'subscribe',
    label: 'Subscribe',
  });

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

  if (!isSubscriber) {
    options.push({
      type: 'subscribe',
      label: 'Subscribe (100 messages/month)',
      recommended: true,
    });

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
