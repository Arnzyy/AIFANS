// ===========================================
// STRIPE TOKEN WALLET SYSTEM - TYPES
// ===========================================

// ===========================================
// ENUMS
// ===========================================

export type TokenLedgerType = 'CREDIT' | 'DEBIT';

export type TokenLedgerReason =
  | 'PACK_PURCHASE'
  | 'EXTRA_MESSAGE'
  | 'TIP'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'PROMO_CREDIT'
  | 'PPV_UNLOCK'
  | 'CHAT_SESSION';

export type PurchaseStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export type TipStatus = 'SUCCEEDED' | 'REFUNDED';

// ===========================================
// TOKEN PACK
// ===========================================

export interface TokenPack {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price_minor: number;      // Price in pence
  currency: string;
  tokens: number;
  stripe_price_id?: string;
  is_active: boolean;
  is_best_value: boolean;
  sort_order: number;
}

// ===========================================
// USER WALLET
// ===========================================

export interface TokenWallet {
  id: string;
  user_id: string;
  balance_tokens: number;
  lifetime_purchased: number;
  lifetime_spent: number;
  created_at: string;
  updated_at: string;
}

// ===========================================
// LEDGER ENTRY
// ===========================================

export interface TokenLedgerEntry {
  id: string;
  user_id: string;
  type: TokenLedgerType;
  reason: TokenLedgerReason;
  amount_tokens: number;
  balance_after: number;
  related_creator_id?: string;
  related_thread_id?: string;
  related_payment_id?: string;
  related_tip_id?: string;
  metadata?: Record<string, any>;
  description?: string;
  created_at: string;
}

// ===========================================
// PURCHASE
// ===========================================

export interface TokenPackPurchase {
  id: string;
  user_id: string;
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
  pack_sku: string;
  tokens_awarded: number;
  currency: string;
  amount_paid_minor: number;
  status: PurchaseStatus;
  metadata?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// ===========================================
// TIP
// ===========================================

export interface Tip {
  id: string;
  user_id: string;
  creator_id: string;
  thread_id?: string;
  chat_mode: 'nsfw' | 'sfw';
  amount_tokens: number;
  amount_gbp_minor: number;
  platform_fee_pct: number;
  platform_fee_tokens: number;
  creator_share_tokens: number;
  status: TipStatus;
  ledger_entry_id?: string;
  created_at: string;
}

// ===========================================
// CONFIG
// ===========================================

export interface TokenConfig {
  extra_message_cost_tokens: number;
  platform_fee_tips_pct: number;
  tokens_per_gbp_100: number;        // Tokens per £1
  tip_presets_tokens: number[];
  min_tip_tokens: number;
  max_tip_tokens: number;
}

export const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  extra_message_cost_tokens: 100,    // ~£0.40 per extra message
  platform_fee_tips_pct: 30,
  tokens_per_gbp_100: 250,           // 250 tokens = £1
  tip_presets_tokens: [250, 500, 1250],  // £1, £2, £5 equiv
  min_tip_tokens: 50,
  max_tip_tokens: 25000,
};

// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

export interface SpendTokensRequest {
  amount: number;
  reason: TokenLedgerReason;
  creator_id?: string;
  thread_id?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface SpendTokensResponse {
  success: boolean;
  new_balance: number;
  ledger_id?: string;
  error_message?: string;
}

export interface CreateCheckoutRequest {
  pack_sku: string;
  success_url: string;
  cancel_url: string;
}

export interface CreateCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface SendTipRequest {
  creator_id: string;
  amount_tokens: number;
  thread_id?: string;
  chat_mode?: 'nsfw' | 'sfw';
}

export interface SendTipResponse {
  success: boolean;
  tip_id?: string;
  new_balance?: number;
  error_message?: string;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Convert tokens to GBP (pence)
 * Based on: 250 tokens = £1 (100 pence)
 */
export function tokensToGbpMinor(tokens: number, tokensPerGbp: number = 250): number {
  return Math.round((tokens / tokensPerGbp) * 100);
}

/**
 * Convert GBP (pence) to tokens
 */
export function gbpMinorToTokens(pence: number, tokensPerGbp: number = 250): number {
  return Math.round((pence / 100) * tokensPerGbp);
}

/**
 * Format tokens as £ string
 */
export function formatTokensAsGbp(tokens: number, tokensPerGbp: number = 250): string {
  const pounds = tokens / tokensPerGbp;
  return `£${pounds.toFixed(2)}`;
}

/**
 * Format pence as £ string
 */
export function formatPenceAsGbp(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Get tip presets with £ equivalents
 */
export function getTipPresets(
  presetTokens: number[] = DEFAULT_TOKEN_CONFIG.tip_presets_tokens,
  tokensPerGbp: number = 250
): { tokens: number; label: string; gbp: string }[] {
  return presetTokens.map((tokens) => ({
    tokens,
    label: `${tokens} tokens`,
    gbp: formatTokensAsGbp(tokens, tokensPerGbp),
  }));
}
