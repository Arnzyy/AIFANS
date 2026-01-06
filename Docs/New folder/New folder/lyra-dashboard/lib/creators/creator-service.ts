// ===========================================
// LYRA — CREATOR SERVICE
// Business logic for creator operations
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  Creator,
  CreatorModel,
  ContentItem,
  Post,
  PPVOffer,
  PPVEntitlement,
  CreatorEarning,
  CreatorPayout,
  CreatorStrike,
  ContentReport,
  CreatorDashboardStats,
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingStep4Data,
  ModelStep1Data,
  ModelStep2Data,
  ModelStep3Data,
  ModelStep4Data,
  DECLARATION_TEXTS,
} from './types';

// ===========================================
// STRIPE CLIENT
// ===========================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// ===========================================
// CREATOR SERVICE CLASS
// ===========================================

export class CreatorService {
  constructor(private supabase: SupabaseClient) {}

  // =====================
  // CREATOR OPERATIONS
  // =====================

  /**
   * Get or create creator profile for user
   */
  async getOrCreateCreator(userId: string): Promise<Creator> {
    const { data: existing } = await this.supabase
      .from('creators')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) return existing;

    const { data: created, error } = await this.supabase
      .from('creators')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Get creator by user ID
   */
  async getCreatorByUserId(userId: string): Promise<Creator | null> {
    const { data, error } = await this.supabase
      .from('creators')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get creator by ID
   */
  async getCreatorById(creatorId: string): Promise<Creator | null> {
    const { data, error } = await this.supabase
      .from('creators')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Update onboarding step 1
   */
  async updateOnboardingStep1(
    userId: string,
    data: OnboardingStep1Data
  ): Promise<Creator> {
    const { data: updated, error } = await this.supabase
      .from('creators')
      .update({
        account_type: data.account_type,
        country_code: data.country_code,
        onboarding_step: 2,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Update onboarding step 2
   */
  async updateOnboardingStep2(
    userId: string,
    data: OnboardingStep2Data
  ): Promise<Creator> {
    const { data: updated, error } = await this.supabase
      .from('creators')
      .update({
        legal_name: data.legal_name,
        business_name: data.business_name,
        date_of_birth: data.date_of_birth,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        address_line1: data.address_line1,
        address_line2: data.address_line2,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        onboarding_step: 3,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Create Stripe Connect account and return onboarding link
   */
  async createStripeConnectAccount(
    userId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<{ url: string; accountId: string }> {
    const creator = await this.getCreatorByUserId(userId);
    if (!creator) throw new Error('Creator not found');

    let accountId = creator.stripe_connect_account_id;

    // Create Stripe account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: creator.country_code || 'GB',
        email: creator.contact_email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: creator.account_type === 'BUSINESS' ? 'company' : 'individual',
      });

      accountId = account.id;

      // Save account ID
      await this.supabase
        .from('creators')
        .update({ stripe_connect_account_id: accountId })
        .eq('user_id', userId);
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: accountLink.url, accountId };
  }

  /**
   * Check Stripe Connect status and update creator
   */
  async syncStripeConnectStatus(userId: string): Promise<Creator> {
    const creator = await this.getCreatorByUserId(userId);
    if (!creator || !creator.stripe_connect_account_id) {
      throw new Error('No Stripe Connect account');
    }

    const account = await stripe.accounts.retrieve(creator.stripe_connect_account_id);

    const { data: updated, error } = await this.supabase
      .from('creators')
      .update({
        stripe_connect_onboarding_complete: account.details_submitted,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_charges_enabled: account.charges_enabled,
        stripe_requirements_due: account.requirements?.currently_due || [],
        onboarding_step: account.details_submitted ? 4 : 3,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Accept declarations and complete step 4
   */
  async acceptDeclarations(
    userId: string,
    declarations: OnboardingStep4Data['declarations'],
    ipAddress?: string,
    userAgent?: string
  ): Promise<Creator> {
    const creator = await this.getCreatorByUserId(userId);
    if (!creator) throw new Error('Creator not found');

    // Verify all declarations accepted
    const allAccepted = Object.values(declarations).every((v) => v === true);
    if (!allAccepted) {
      throw new Error('All declarations must be accepted');
    }

    // Store each declaration
    const declarationRecords = Object.entries(declarations).map(([key, accepted]) => ({
      creator_id: creator.id,
      declaration_type: key,
      declaration_text: DECLARATION_TEXTS[key as keyof typeof DECLARATION_TEXTS],
      accepted,
      ip_address: ipAddress,
      user_agent: userAgent,
    }));

    await this.supabase.from('creator_declarations').insert(declarationRecords);

    // Update creator
    const { data: updated, error } = await this.supabase
      .from('creators')
      .update({
        declarations_accepted_at: new Date().toISOString(),
        declarations_version: '1.0',
        onboarding_step: 5,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await this.logAudit(userId, 'CREATOR', 'DECLARATION_ACCEPTED', creator.id, undefined, undefined, {
      declarations,
    });

    return updated;
  }

  /**
   * Submit creator for review
   */
  async submitForReview(userId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.rpc('submit_creator_for_review', {
      p_user_id: userId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    return {
      success: result?.success || false,
      error: result?.error_message,
    };
  }

  // =====================
  // MODEL OPERATIONS
  // =====================

  /**
   * Get all models for creator
   */
  async getCreatorModels(creatorId: string): Promise<CreatorModel[]> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .select(`
        *,
        primary_tag:tags!primary_tag_id(*),
        model_tags(tag:tags(*))
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get single model by ID
   */
  async getModelById(modelId: string): Promise<CreatorModel | null> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .select(`
        *,
        primary_tag:tags!primary_tag_id(*),
        model_tags(tag:tags(*))
      `)
      .eq('id', modelId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Create new model (draft)
   */
  async createModel(
    userId: string,
    data: ModelStep1Data
  ): Promise<CreatorModel> {
    const creator = await this.getCreatorByUserId(userId);
    if (!creator) throw new Error('Creator not found');

    // Check model limit
    const existingModels = await this.getCreatorModels(creator.id);
    const activeModels = existingModels.filter(
      (m) => m.status !== 'REJECTED' && m.status !== 'SUSPENDED'
    );

    if (activeModels.length >= creator.max_models_allowed) {
      throw new Error('Maximum model limit reached');
    }

    const { data: model, error } = await this.supabase
      .from('creator_models')
      .insert({
        creator_id: creator.id,
        display_name: data.display_name,
        age: data.age,
        primary_language: data.primary_language,
        primary_tag_id: data.primary_tag_id,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) throw error;

    // Set tags if provided
    if (data.primary_tag_id || data.secondary_tag_ids?.length) {
      await this.supabase.rpc('set_model_tags', {
        p_model_id: model.id,
        p_primary_tag_id: data.primary_tag_id,
        p_secondary_tag_ids: data.secondary_tag_ids || [],
        p_actor_id: userId,
      });
    }

    return model;
  }

  /**
   * Update model step 2 (visuals)
   */
  async updateModelVisuals(
    modelId: string,
    data: ModelStep2Data
  ): Promise<CreatorModel> {
    const { data: updated, error } = await this.supabase
      .from('creator_models')
      .update({
        avatar_url: data.avatar_url,
        cover_url: data.cover_url,
        gallery_urls: data.gallery_urls || [],
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Update model step 3 (persona)
   */
  async updateModelPersona(
    modelId: string,
    data: ModelStep3Data
  ): Promise<CreatorModel> {
    const { data: updated, error } = await this.supabase
      .from('creator_models')
      .update({
        bio: data.bio,
        tagline: data.tagline,
        persona_traits: data.persona_traits || [],
        interests: data.interests || [],
        style_preferences: data.style_preferences || {},
        personal_details: data.personal_details || {},
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Update model step 4 (monetization)
   */
  async updateModelMonetization(
    modelId: string,
    data: ModelStep4Data
  ): Promise<CreatorModel> {
    const { data: updated, error } = await this.supabase
      .from('creator_models')
      .update({
        subscription_price_monthly: data.subscription_price_monthly,
        nsfw_enabled: data.nsfw_enabled,
        sfw_enabled: data.sfw_enabled,
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Submit model for review
   */
  async submitModelForReview(
    modelId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.rpc('submit_model_for_review', {
      p_model_id: modelId,
      p_user_id: userId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    return {
      success: result?.success || false,
      error: result?.error_message,
    };
  }

  // =====================
  // CONTENT OPERATIONS
  // =====================

  /**
   * Upload content item
   */
  async createContentItem(
    creatorId: string,
    modelId: string,
    data: Partial<ContentItem>
  ): Promise<ContentItem> {
    const { data: item, error } = await this.supabase
      .from('content_items')
      .insert({
        creator_id: creatorId,
        model_id: modelId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return item;
  }

  /**
   * Get content library for model
   */
  async getModelContent(
    modelId: string,
    visibility?: ContentItem['visibility']
  ): Promise<ContentItem[]> {
    let query = this.supabase
      .from('content_items')
      .select('*')
      .eq('model_id', modelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (visibility) {
      query = query.eq('visibility', visibility);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Create post
   */
  async createPost(
    creatorId: string,
    modelId: string,
    data: Partial<Post>
  ): Promise<Post> {
    const { data: post, error } = await this.supabase
      .from('posts')
      .insert({
        creator_id: creatorId,
        model_id: modelId,
        ...data,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return post;
  }

  /**
   * Get posts for model
   */
  async getModelPosts(modelId: string): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('model_id', modelId)
      .eq('is_deleted', false)
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // =====================
  // PPV OPERATIONS
  // =====================

  /**
   * Create PPV offer
   */
  async createPPVOffer(
    creatorId: string,
    modelId: string,
    data: Partial<PPVOffer>
  ): Promise<PPVOffer> {
    // Calculate GBP equivalent (250 tokens = £1)
    const priceGbpMinor = Math.round((data.price_tokens! / 250) * 100);

    const { data: ppv, error } = await this.supabase
      .from('ppv_offers')
      .insert({
        creator_id: creatorId,
        model_id: modelId,
        ...data,
        price_gbp_minor: priceGbpMinor,
        status: 'ACTIVE',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return ppv;
  }

  /**
   * Get PPV offers for model
   */
  async getModelPPVOffers(modelId: string): Promise<PPVOffer[]> {
    const { data, error } = await this.supabase
      .from('ppv_offers')
      .select('*')
      .eq('model_id', modelId)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Purchase PPV
   */
  async purchasePPV(
    userId: string,
    ppvId: string
  ): Promise<{ success: boolean; entitlement?: PPVEntitlement; error?: string }> {
    // Get PPV
    const { data: ppv, error: ppvError } = await this.supabase
      .from('ppv_offers')
      .select('*')
      .eq('id', ppvId)
      .eq('status', 'ACTIVE')
      .single();

    if (ppvError || !ppv) {
      return { success: false, error: 'PPV offer not found' };
    }

    // Check if already purchased
    const { data: existing } = await this.supabase
      .from('ppv_entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('ppv_id', ppvId)
      .single();

    if (existing) {
      return { success: false, error: 'Already purchased' };
    }

    // Spend tokens
    const platformFeePct = 20;
    const platformFeeTokens = Math.floor((ppv.price_tokens * platformFeePct) / 100);
    const creatorShareTokens = ppv.price_tokens - platformFeeTokens;

    const { data: spendResult, error: spendError } = await this.supabase.rpc('spend_tokens', {
      p_user_id: userId,
      p_amount: ppv.price_tokens,
      p_reason: 'PPV_UNLOCK',
      p_creator_id: ppv.creator_id,
      p_description: `PPV: ${ppv.title}`,
    });

    if (spendError || !spendResult?.[0]?.success) {
      return { success: false, error: 'Insufficient tokens' };
    }

    // Create entitlement
    const { data: entitlement, error: entError } = await this.supabase
      .from('ppv_entitlements')
      .insert({
        user_id: userId,
        ppv_id: ppvId,
        model_id: ppv.model_id,
        creator_id: ppv.creator_id,
        price_tokens: ppv.price_tokens,
        price_gbp_minor: ppv.price_gbp_minor,
        platform_fee_tokens: platformFeeTokens,
        creator_share_tokens: creatorShareTokens,
      })
      .select()
      .single();

    if (entError) {
      // Should refund tokens here in production
      return { success: false, error: 'Failed to create entitlement' };
    }

    // Update PPV stats
    await this.supabase
      .from('ppv_offers')
      .update({
        purchase_count: ppv.purchase_count + 1,
        total_revenue_tokens: ppv.total_revenue_tokens + ppv.price_tokens,
      })
      .eq('id', ppvId);

    // Record earning
    await this.recordEarning(
      ppv.creator_id,
      ppv.model_id,
      'PPV_SALE',
      ppv.price_tokens,
      platformFeeTokens,
      userId,
      { ppv_id: ppvId }
    );

    return { success: true, entitlement };
  }

  /**
   * Check if user has PPV access
   */
  async hasPPVAccess(userId: string, ppvId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('ppv_entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('ppv_id', ppvId)
      .single();

    return !!data;
  }

  // =====================
  // EARNINGS & PAYOUTS
  // =====================

  /**
   * Record an earning
   */
  async recordEarning(
    creatorId: string,
    modelId: string | null,
    type: CreatorEarning['type'],
    grossTokens: number,
    platformFeeTokens: number,
    relatedUserId?: string,
    extras?: { subscription_id?: string; tip_id?: string; ppv_id?: string }
  ): Promise<void> {
    const netTokens = grossTokens - platformFeeTokens;
    const tokensPerGbp = 250;

    await this.supabase.from('creator_earnings').insert({
      creator_id: creatorId,
      model_id: modelId,
      type,
      gross_amount_tokens: grossTokens,
      platform_fee_tokens: platformFeeTokens,
      net_amount_tokens: netTokens,
      gross_amount_gbp: Math.round((grossTokens / tokensPerGbp) * 100),
      platform_fee_gbp: Math.round((platformFeeTokens / tokensPerGbp) * 100),
      net_amount_gbp: Math.round((netTokens / tokensPerGbp) * 100),
      related_user_id: relatedUserId,
      related_subscription_id: extras?.subscription_id,
      related_tip_id: extras?.tip_id,
      related_ppv_id: extras?.ppv_id,
      status: 'pending',
      // Available after hold period (14 days)
      available_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  /**
   * Get creator dashboard stats
   */
  async getDashboardStats(creatorId: string): Promise<CreatorDashboardStats> {
    // Get subscriber count
    const { count: subscriberCount } = await this.supabase
      .from('model_subscriptions')
      .select('id', { count: 'exact' })
      .eq('creator_id', creatorId)
      .eq('status', 'active');

    // Get earnings
    const { data: earnings } = await this.supabase
      .from('creator_earnings')
      .select('net_amount_gbp, status')
      .eq('creator_id', creatorId);

    const totalEarnings = earnings?.reduce((sum, e) => sum + e.net_amount_gbp, 0) || 0;
    const availableBalance = earnings?.filter((e) => e.status === 'available')
      .reduce((sum, e) => sum + e.net_amount_gbp, 0) || 0;
    const pendingBalance = earnings?.filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + e.net_amount_gbp, 0) || 0;

    // Get counts
    const { count: modelCount } = await this.supabase
      .from('creator_models')
      .select('id', { count: 'exact' })
      .eq('creator_id', creatorId);

    const { count: postCount } = await this.supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('creator_id', creatorId)
      .eq('is_deleted', false);

    const { count: ppvSales } = await this.supabase
      .from('ppv_entitlements')
      .select('id', { count: 'exact' })
      .eq('creator_id', creatorId);

    return {
      total_subscribers: subscriberCount || 0,
      total_earnings_gbp: totalEarnings,
      available_balance_gbp: availableBalance,
      pending_balance_gbp: pendingBalance,
      total_models: modelCount || 0,
      total_posts: postCount || 0,
      total_ppv_sales: ppvSales || 0,
      monthly_earnings: [], // TODO: Calculate monthly breakdown
    };
  }

  // =====================
  // AUDIT LOGGING
  // =====================

  async logAudit(
    actorId: string,
    actorType: string,
    action: string,
    targetCreatorId?: string,
    targetModelId?: string,
    targetContentId?: string,
    newValue?: any,
    oldValue?: any,
    notes?: string
  ): Promise<void> {
    await this.supabase.from('audit_log').insert({
      actor_id: actorId,
      actor_type: actorType,
      action,
      target_creator_id: targetCreatorId,
      target_model_id: targetModelId,
      target_content_id: targetContentId,
      old_value: oldValue,
      new_value: newValue,
      notes,
    });
  }
}

// ===========================================
// ADMIN SERVICE
// ===========================================

export class AdminService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    return !!data && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(data.role);
  }

  /**
   * Get pending creator approvals
   */
  async getPendingCreators(): Promise<Creator[]> {
    const { data, error } = await this.supabase
      .from('creators')
      .select('*')
      .eq('status', 'PENDING_REVIEW')
      .order('onboarding_completed_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get pending model approvals
   */
  async getPendingModels(): Promise<CreatorModel[]> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .select(`
        *,
        creator:creators(*)
      `)
      .eq('status', 'PENDING_REVIEW')
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Approve creator
   */
  async approveCreator(
    creatorId: string,
    adminId: string,
    notes?: string
  ): Promise<void> {
    await this.supabase
      .from('creators')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        admin_notes: notes,
      })
      .eq('id', creatorId);

    await this.logAdminAction(adminId, 'CREATOR_APPROVED', creatorId, undefined, notes);
  }

  /**
   * Reject creator
   */
  async rejectCreator(
    creatorId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    await this.supabase
      .from('creators')
      .update({
        status: 'REJECTED',
        rejection_reason: reason,
      })
      .eq('id', creatorId);

    await this.logAdminAction(adminId, 'CREATOR_REJECTED', creatorId, undefined, reason);
  }

  /**
   * Approve model
   */
  async approveModel(
    modelId: string,
    adminId: string,
    notes?: string
  ): Promise<void> {
    await this.supabase
      .from('creator_models')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        admin_notes: notes,
      })
      .eq('id', modelId);

    await this.logAdminAction(adminId, 'MODEL_APPROVED', undefined, modelId, notes);
  }

  /**
   * Reject model
   */
  async rejectModel(
    modelId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    await this.supabase
      .from('creator_models')
      .update({
        status: 'REJECTED',
        rejection_reason: reason,
      })
      .eq('id', modelId);

    await this.logAdminAction(adminId, 'MODEL_REJECTED', undefined, modelId, reason);
  }

  /**
   * Suspend creator
   */
  async suspendCreator(
    creatorId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    await this.supabase
      .from('creators')
      .update({
        status: 'SUSPENDED',
        suspended_at: new Date().toISOString(),
        admin_notes: reason,
      })
      .eq('id', creatorId);

    // Also suspend all their models
    await this.supabase
      .from('creator_models')
      .update({
        status: 'SUSPENDED',
        suspended_at: new Date().toISOString(),
      })
      .eq('creator_id', creatorId);

    await this.logAdminAction(adminId, 'CREATOR_SUSPENDED', creatorId, undefined, reason);
  }

  /**
   * Issue strike
   */
  async issueStrike(
    creatorId: string,
    adminId: string,
    severity: CreatorStrike['severity'],
    reason: string,
    modelId?: string
  ): Promise<CreatorStrike> {
    const { data: strike, error } = await this.supabase
      .from('creator_strikes')
      .insert({
        creator_id: creatorId,
        model_id: modelId,
        severity,
        reason,
        issued_by: adminId,
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAdminAction(adminId, 'STRIKE_ISSUED', creatorId, modelId, reason);

    // Check if should auto-suspend
    const { count } = await this.supabase
      .from('creator_strikes')
      .select('id', { count: 'exact' })
      .eq('creator_id', creatorId)
      .eq('is_active', true);

    if (count && count >= 3) {
      await this.suspendCreator(creatorId, adminId, 'Auto-suspended after 3 strikes');
    }

    return strike;
  }

  /**
   * Get pending reports
   */
  async getPendingReports(): Promise<ContentReport[]> {
    const { data, error } = await this.supabase
      .from('content_reports')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Resolve report
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    resolution: string,
    actionTaken?: string
  ): Promise<void> {
    await this.supabase
      .from('content_reports')
      .update({
        status: 'RESOLVED',
        resolved_by: adminId,
        resolution_notes: resolution,
        action_taken: actionTaken,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);
  }

  /**
   * Log admin action
   */
  private async logAdminAction(
    adminId: string,
    action: string,
    creatorId?: string,
    modelId?: string,
    notes?: string
  ): Promise<void> {
    await this.supabase.from('audit_log').insert({
      actor_id: adminId,
      actor_type: 'ADMIN',
      action,
      target_creator_id: creatorId,
      target_model_id: modelId,
      notes,
    });
  }
}
