// ===========================================
// TOKEN WALLET SERVICE
// Server-side operations for token management
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  TokenWallet,
  TokenLedgerEntry,
  TokenPack,
  TokenPackPurchase,
  Tip,
  TokenConfig,
  SpendTokensResponse,
  DEFAULT_TOKEN_CONFIG,
  tokensToGbpMinor,
} from './types';

// ===========================================
// STRIPE CLIENT
// ===========================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// ===========================================
// CONFIG
// ===========================================

let cachedConfig: TokenConfig | null = null;

export async function getTokenConfig(supabase: SupabaseClient): Promise<TokenConfig> {
  if (cachedConfig) return cachedConfig;

  const { data } = await supabase
    .from('platform_config')
    .select('key, value')
    .in('key', [
      'extra_message_cost_tokens',
      'platform_fee_tips_pct',
      'tokens_per_gbp_100',
      'tip_presets_tokens',
      'min_tip_tokens',
      'max_tip_tokens',
    ]);

  if (!data || data.length === 0) {
    return DEFAULT_TOKEN_CONFIG;
  }

  const config: TokenConfig = { ...DEFAULT_TOKEN_CONFIG };
  
  for (const row of data) {
    const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    (config as any)[row.key] = value;
  }

  cachedConfig = config;
  return config;
}

// ===========================================
// WALLET OPERATIONS
// ===========================================

/**
 * Get user's wallet (creates if doesn't exist)
 */
export async function getWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<TokenWallet> {
  // Try to get existing wallet
  const { data: wallet, error } = await supabase
    .from('token_wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (wallet) return wallet;

  // Create new wallet
  const { data: newWallet, error: createError } = await supabase
    .from('token_wallets')
    .insert({ user_id: userId, balance_tokens: 0 })
    .select()
    .single();

  if (createError) throw createError;
  return newWallet;
}

/**
 * Get user's token balance
 */
export async function getBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const wallet = await getWallet(supabase, userId);
  return wallet.balance_tokens;
}

/**
 * Spend tokens (atomic, concurrency-safe)
 * Uses database function for atomicity
 */
export async function spendTokens(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  creatorId?: string,
  threadId?: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<SpendTokensResponse> {
  const { data, error } = await supabase.rpc('spend_tokens', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_creator_id: creatorId || null,
    p_thread_id: threadId || null,
    p_description: description || null,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('Spend tokens error:', error);
    return {
      success: false,
      new_balance: 0,
      error_message: error.message,
    };
  }

  const result = data?.[0];
  return {
    success: result?.success || false,
    new_balance: result?.new_balance || 0,
    ledger_id: result?.ledger_id,
    error_message: result?.error_message,
  };
}

/**
 * Credit tokens (atomic)
 * Uses database function for atomicity
 */
export async function creditTokens(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  paymentId?: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; new_balance: number; ledger_id?: string }> {
  const { data, error } = await supabase.rpc('credit_tokens', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_payment_id: paymentId || null,
    p_description: description || null,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('Credit tokens error:', error);
    return { success: false, new_balance: 0 };
  }

  const result = data?.[0];
  return {
    success: result?.success || false,
    new_balance: result?.new_balance || 0,
    ledger_id: result?.ledger_id,
  };
}

// ===========================================
// TOKEN PACKS
// ===========================================

/**
 * Get all active token packs
 */
export async function getTokenPacks(
  supabase: SupabaseClient
): Promise<TokenPack[]> {
  const { data, error } = await supabase
    .from('token_packs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get single token pack by SKU
 */
export async function getTokenPack(
  supabase: SupabaseClient,
  sku: string
): Promise<TokenPack | null> {
  const { data, error } = await supabase
    .from('token_packs')
    .select('*')
    .eq('sku', sku)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

// ===========================================
// STRIPE CHECKOUT
// ===========================================

/**
 * Create Stripe Checkout session for token pack purchase
 */
export async function createCheckoutSession(
  supabase: SupabaseClient,
  userId: string,
  packSku: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string; session_id: string }> {
  // Get pack details
  const pack = await getTokenPack(supabase, packSku);
  if (!pack) {
    throw new Error('Token pack not found');
  }

  // Create purchase record (PENDING)
  const { data: purchase, error: purchaseError } = await supabase
    .from('token_pack_purchases')
    .insert({
      user_id: userId,
      pack_sku: packSku,
      tokens_awarded: pack.tokens,
      currency: pack.currency,
      amount_paid_minor: pack.price_minor,
      status: 'PENDING',
    })
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: pack.currency.toLowerCase(),
          product_data: {
            name: pack.name,
            description: pack.description || `${pack.tokens} tokens for LYRA`,
          },
          unit_amount: pack.price_minor,
        },
        quantity: 1,
      },
    ],
    metadata: {
      purchase_id: purchase.id,
      user_id: userId,
      pack_sku: packSku,
      tokens: pack.tokens.toString(),
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  });

  // Update purchase with session ID
  await supabase
    .from('token_pack_purchases')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', purchase.id);

  return {
    checkout_url: session.url!,
    session_id: session.id,
  };
}

/**
 * Handle Stripe webhook: checkout.session.completed
 */
export async function handleCheckoutComplete(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const purchaseId = session.metadata?.purchase_id;
  const userId = session.metadata?.user_id;
  const tokens = parseInt(session.metadata?.tokens || '0');

  if (!purchaseId || !userId || !tokens) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Get purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('token_pack_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    console.error('Purchase not found:', purchaseId);
    return;
  }

  // Skip if already processed
  if (purchase.status === 'SUCCEEDED') {
    console.log('Purchase already processed:', purchaseId);
    return;
  }

  // Update purchase status
  await supabase
    .from('token_pack_purchases')
    .update({
      status: 'SUCCEEDED',
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq('id', purchaseId);

  // Credit tokens to user
  await creditTokens(
    supabase,
    userId,
    tokens,
    'PACK_PURCHASE',
    purchaseId,
    `Purchased ${tokens} tokens`
  );

  console.log(`Credited ${tokens} tokens to user ${userId}`);
}

/**
 * Handle Stripe webhook: charge.refunded
 */
export async function handleRefund(
  supabase: SupabaseClient,
  charge: Stripe.Charge
): Promise<void> {
  const paymentIntentId = charge.payment_intent as string;

  // Find purchase by payment intent
  const { data: purchase } = await supabase
    .from('token_pack_purchases')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!purchase) {
    console.error('Purchase not found for refund:', paymentIntentId);
    return;
  }

  // Update purchase status
  await supabase
    .from('token_pack_purchases')
    .update({ status: 'REFUNDED' })
    .eq('id', purchase.id);

  // Debit tokens (adjustment)
  await spendTokens(
    supabase,
    purchase.user_id,
    purchase.tokens_awarded,
    'REFUND',
    undefined,
    undefined,
    `Refund for purchase ${purchase.id}`
  );

  console.log(`Refunded ${purchase.tokens_awarded} tokens from user ${purchase.user_id}`);
}

// ===========================================
// TIPPING
// ===========================================

/**
 * Send a tip to a creator
 */
export async function sendTip(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  amountTokens: number,
  threadId?: string,
  chatMode: 'nsfw' | 'sfw' = 'nsfw'
): Promise<{ success: boolean; tip_id?: string; new_balance?: number; error_message?: string }> {
  // Get config
  const config = await getTokenConfig(supabase);

  // Validate amount
  if (amountTokens < config.min_tip_tokens) {
    return { success: false, error_message: `Minimum tip is ${config.min_tip_tokens} tokens` };
  }
  if (amountTokens > config.max_tip_tokens) {
    return { success: false, error_message: `Maximum tip is ${config.max_tip_tokens} tokens` };
  }

  // Calculate split
  const platformFeeTokens = Math.floor((amountTokens * config.platform_fee_tips_pct) / 100);
  const creatorShareTokens = amountTokens - platformFeeTokens;
  const amountGbpMinor = tokensToGbpMinor(amountTokens, config.tokens_per_gbp_100);

  // Spend tokens from user
  const spendResult = await spendTokens(
    supabase,
    userId,
    amountTokens,
    'TIP',
    creatorId,
    threadId,
    `Tip to creator`
  );

  if (!spendResult.success) {
    return {
      success: false,
      error_message: spendResult.error_message || 'Insufficient balance',
    };
  }

  // Create tip record
  const { data: tip, error: tipError } = await supabase
    .from('tips')
    .insert({
      user_id: userId,
      creator_id: creatorId,
      thread_id: threadId,
      chat_mode: chatMode,
      amount_tokens: amountTokens,
      amount_gbp_minor: amountGbpMinor,
      platform_fee_pct: config.platform_fee_tips_pct,
      platform_fee_tokens: platformFeeTokens,
      creator_share_tokens: creatorShareTokens,
      ledger_entry_id: spendResult.ledger_id,
    })
    .select()
    .single();

  if (tipError) {
    console.error('Failed to create tip record:', tipError);
    // Note: Tokens already spent - would need compensation logic
    return { success: false, error_message: 'Failed to record tip' };
  }

  // Create payout ledger entry for creator
  const creatorShareGbpMinor = tokensToGbpMinor(creatorShareTokens, config.tokens_per_gbp_100);
  
  await supabase
    .from('creator_payout_ledger')
    .insert({
      creator_id: creatorId,
      type: 'TIP_SHARE',
      amount_tokens: creatorShareTokens,
      amount_gbp_minor: creatorShareGbpMinor,
      related_tip_id: tip.id,
      related_user_id: userId,
      status: 'PENDING',
      description: `Tip from subscriber`,
    });

  return {
    success: true,
    tip_id: tip.id,
    new_balance: spendResult.new_balance,
  };
}

// ===========================================
// LEDGER QUERIES
// ===========================================

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<TokenLedgerEntry[]> {
  const { data, error } = await supabase
    .from('token_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

/**
 * Get creator's tip history
 */
export async function getCreatorTips(
  supabase: SupabaseClient,
  creatorId: string,
  limit: number = 20
): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('status', 'SUCCEEDED')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ===========================================
// EXTRA MESSAGE CHARGING
// ===========================================

/**
 * Charge for extra message (if needed)
 * Returns whether message can proceed
 */
export async function chargeExtraMessage(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  threadId: string,
  chatMode: 'nsfw' | 'sfw'
): Promise<{ allowed: boolean; cost?: number; new_balance?: number; error_message?: string }> {
  const config = await getTokenConfig(supabase);
  const cost = config.extra_message_cost_tokens;

  const result = await spendTokens(
    supabase,
    userId,
    cost,
    'EXTRA_MESSAGE',
    creatorId,
    threadId,
    `Extra ${chatMode.toUpperCase()} message`
  );

  if (!result.success) {
    return {
      allowed: false,
      cost,
      error_message: result.error_message || 'Insufficient tokens',
    };
  }

  return {
    allowed: true,
    cost,
    new_balance: result.new_balance,
  };
}
