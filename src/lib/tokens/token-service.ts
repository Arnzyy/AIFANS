// ===========================================
// TOKEN WALLET SERVICE
// Server-side operations for token management
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TokenWallet,
  TokenLedgerEntry,
  TokenPack,
  Tip,
  TokenConfig,
  SpendTokensResponse,
  DEFAULT_TOKEN_CONFIG,
  tokensToGbpMinor,
} from './types';

// ===========================================
// CONFIG
// ===========================================

let cachedConfig: TokenConfig | null = null;

export async function getTokenConfig(supabase: SupabaseClient): Promise<TokenConfig> {
  if (cachedConfig) return cachedConfig;

  const { data } = await supabase
    .from('token_config')
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
 * Get all active token packs
 */
export async function getTokenPacks(
  supabase: SupabaseClient
): Promise<TokenPack[]> {
  const { data, error } = await supabase
    .from('token_packs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true});

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
 * Create Stripe checkout session for token purchase
 */
export async function createTokenCheckout(
  supabase: SupabaseClient,
  userId: string,
  packSku: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string; session_id: string }> {
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: pack.currency.toLowerCase(),
          product_data: {
            name: pack.name,
            description: pack.description || `${pack.tokens} tokens`,
          },
          unit_amount: pack.price_minor,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'token_purchase',
      purchase_id: purchase.id,
      user_id: userId,
      pack_sku: packSku,
      tokens: pack.tokens.toString(),
    },
    success_url: successUrl,
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

// ===========================================
// TIPPING
// ===========================================

/**
 * Send a tip to a creator (uses database function for atomicity)
 */
export async function sendTip(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  amountTokens: number,
  threadId?: string,
  chatMode: 'nsfw' | 'sfw' = 'nsfw'
): Promise<{ success: boolean; tip_id?: string; new_balance?: number; error_message?: string }> {
  // Get config for validation
  const config = await getTokenConfig(supabase);

  // Validate amount
  if (amountTokens < config.min_tip_tokens) {
    return { success: false, error_message: `Minimum tip is ${config.min_tip_tokens} tokens` };
  }
  if (amountTokens > config.max_tip_tokens) {
    return { success: false, error_message: `Maximum tip is ${config.max_tip_tokens} tokens` };
  }

  try {
    // Call database function for atomic tip send
    const { data, error } = await supabase.rpc('send_tip', {
      p_user_id: userId,
      p_creator_id: creatorId,
      p_amount_tokens: amountTokens,
      p_thread_id: threadId || null,
      p_chat_mode: chatMode,
    });

    if (error) {
      console.error('Send tip error:', error);
      return {
        success: false,
        error_message: error.message.includes('Insufficient')
          ? 'Insufficient tokens'
          : 'Tip failed',
      };
    }

    // Get new balance
    const wallet = await getWallet(supabase, userId);

    return {
      success: true,
      tip_id: data,
      new_balance: wallet.balance_tokens,
    };
  } catch (error: any) {
    console.error('Tip error:', error);
    return {
      success: false,
      error_message: error.message || 'Tip failed',
    };
  }
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
