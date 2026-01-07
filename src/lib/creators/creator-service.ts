import { SupabaseClient } from '@supabase/supabase-js';
import {
  Creator,
  CreatorStatus,
  CreatorModel,
  ModelStatus,
  CreatorDeclaration,
  OnboardingStep,
  OnboardingFormData,
  ModelFormData,
  CreatorWithProfile,
  ModelWithCreator,
  PaginatedResponse,
  AdminStats,
  AuditLogEntry,
} from './types';

// ===========================================
// CREATOR SERVICE
// ===========================================

export class CreatorService {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================
  // CREATOR CRUD
  // ===========================================

  async getCreator(userId: string): Promise<Creator | null> {
    // First check the creators table
    const { data, error } = await this.supabase
      .from('creators')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching creator:', error);
      throw error;
    }

    if (data) {
      return data;
    }

    // If not in creators table, check creator_profiles and auto-create if found
    const { data: creatorProfile, error: profileError } = await this.supabase
      .from('creator_profiles')
      .select('*, profiles!inner(display_name, username)')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching creator profile:', profileError);
      return null;
    }

    if (!creatorProfile) {
      return null;
    }

    // Auto-create a creators record from creator_profiles
    // Handle profiles which may be an array or object
    const profileData = Array.isArray(creatorProfile.profiles)
      ? creatorProfile.profiles[0]
      : creatorProfile.profiles;

    const displayName = profileData?.display_name || profileData?.username || 'Creator';

    const { data: newCreator, error: createError } = await this.supabase
      .from('creators')
      .insert({
        user_id: userId,
        business_type: 'individual',
        country: 'GB',
        display_name: displayName,
        bio: creatorProfile.bio,
        status: creatorProfile.is_verified ? 'approved' : 'pending',
        onboarding_step: 'complete',
        onboarding_complete: true,
        kyc_status: creatorProfile.is_verified ? 'approved' : 'not_started',
        id_verified: creatorProfile.is_verified || false,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        max_models: 3,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error auto-creating creator record:', createError);
      return null;
    }

    return newCreator;
  }

  async getCreatorById(creatorId: string): Promise<Creator | null> {
    const { data, error } = await this.supabase
      .from('creators')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async createCreator(userId: string, data: Partial<OnboardingFormData>): Promise<Creator> {
    const { data: creator, error } = await this.supabase
      .from('creators')
      .insert({
        user_id: userId,
        business_type: data.business_type || 'individual',
        business_name: data.business_name,
        country: data.country || 'GB',
        display_name: data.display_name || 'New Creator',
        bio: data.bio,
        status: 'pending' as CreatorStatus,
        onboarding_step: 'account_type' as OnboardingStep,
        onboarding_complete: false,
        kyc_status: 'not_started',
        id_verified: false,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        max_models: 3,
      })
      .select()
      .single();

    if (error) throw error;
    return creator;
  }

  async updateCreator(creatorId: string, updates: Partial<Creator>): Promise<Creator> {
    const { data, error } = await this.supabase
      .from('creators')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creatorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ===========================================
  // ONBOARDING
  // ===========================================

  async getOnboardingStatus(userId: string): Promise<{
    creator: Creator | null;
    currentStep: OnboardingStep;
    stepsCompleted: OnboardingStep[];
    canSubmit: boolean;
  }> {
    const creator = await this.getCreator(userId);

    if (!creator) {
      return {
        creator: null,
        currentStep: 'account_type',
        stepsCompleted: [],
        canSubmit: false,
      };
    }

    const stepsCompleted: OnboardingStep[] = [];

    // Check which steps are complete
    if (creator.business_type && creator.country) {
      stepsCompleted.push('account_type');
    }
    // Identity step requires display name, DOB, and KYC documents
    if (creator.display_name && creator.date_of_birth && creator.id_document_url && creator.selfie_url) {
      stepsCompleted.push('identity');
    }
    if (creator.stripe_onboarding_complete) {
      stepsCompleted.push('stripe_connect');
    }

    // Check declarations
    const { data: declarations } = await this.supabase
      .from('creator_declarations')
      .select('declaration_type')
      .eq('creator_id', creator.id);

    const requiredDeclarations = [
      'age_verification',
      'content_ownership',
      'no_real_person',
      'terms_acceptance',
      'payout_terms',
      'compliance_agreement',
    ];

    const declaredTypes = declarations?.map(d => d.declaration_type) || [];
    const allDeclared = requiredDeclarations.every(d => declaredTypes.includes(d));

    if (allDeclared) {
      stepsCompleted.push('declarations');
    }

    // Can submit if all previous steps done
    const canSubmit = stepsCompleted.length >= 4;

    return {
      creator,
      currentStep: creator.onboarding_step,
      stepsCompleted,
      canSubmit,
    };
  }

  async updateOnboardingStep(
    creatorId: string,
    step: OnboardingStep,
    data: Partial<OnboardingFormData>
  ): Promise<Creator> {
    const updates: Partial<Creator> = {
      onboarding_step: step,
    };

    // Apply step-specific updates
    switch (step) {
      case 'account_type':
        updates.business_type = data.business_type;
        updates.business_name = data.business_name;
        updates.country = data.country;
        break;
      case 'identity':
        updates.display_name = data.display_name;
        updates.bio = data.bio;
        // KYC fields
        if (data.date_of_birth) {
          updates.date_of_birth = data.date_of_birth;
        }
        if (data.id_document_url) {
          updates.id_document_url = data.id_document_url;
        }
        if (data.selfie_url) {
          updates.selfie_url = data.selfie_url;
        }
        // Mark KYC as submitted if all documents provided
        if (data.id_document_url && data.selfie_url && data.date_of_birth) {
          updates.kyc_status = 'submitted';
        }
        break;
      case 'declarations':
        // Declarations are saved separately
        break;
      case 'submit':
        updates.onboarding_complete = true;
        updates.status = 'pending';
        break;
    }

    return this.updateCreator(creatorId, updates);
  }

  // ===========================================
  // DECLARATIONS
  // ===========================================

  async addDeclaration(
    creatorId: string,
    declarationType: CreatorDeclaration['declaration_type'],
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreatorDeclaration> {
    const { data, error } = await this.supabase
      .from('creator_declarations')
      .insert({
        creator_id: creatorId,
        declaration_type: declarationType,
        declared_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDeclarations(creatorId: string): Promise<CreatorDeclaration[]> {
    const { data, error } = await this.supabase
      .from('creator_declarations')
      .select('*')
      .eq('creator_id', creatorId)
      .order('declared_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ===========================================
  // MODEL MANAGEMENT
  // ===========================================

  async getModels(creatorId: string): Promise<CreatorModel[]> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getModelById(modelId: string): Promise<CreatorModel | null> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createModel(creatorId: string, data: ModelFormData): Promise<CreatorModel> {
    // Check model limit
    const creator = await this.getCreatorById(creatorId);
    if (!creator) throw new Error('Creator not found');

    const existingModels = await this.getModels(creatorId);
    if (existingModels.length >= creator.max_models) {
      throw new Error(`Maximum models limit reached (${creator.max_models})`);
    }

    const { data: model, error } = await this.supabase
      .from('creator_models')
      .insert({
        creator_id: creatorId,
        name: data.name,
        age: data.age,
        bio: data.bio,
        avatar_url: data.avatar_url,
        banner_url: data.banner_url,
        personality_traits: data.personality_traits || [],
        interests: data.interests || [],
        backstory: data.backstory,
        speaking_style: data.speaking_style,
        physical_traits: data.physical_traits,
        turn_ons: data.turn_ons || [],
        turn_offs: data.turn_offs || [],
        emoji_usage: data.emoji_usage || 'moderate',
        response_length: data.response_length || 'medium',
        subscription_price: data.subscription_price,
        price_per_message: data.price_per_message,
        nsfw_enabled: data.nsfw_enabled,
        sfw_enabled: data.sfw_enabled,
        default_chat_mode: data.default_chat_mode || 'sfw',
        status: 'draft' as ModelStatus,
        is_active: false,
        subscriber_count: 0,
        total_messages: 0,
        total_earnings: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Add tags if provided
    if (data.primary_tag_id) {
      await this.addModelTag(model.id, data.primary_tag_id, true);
    }
    if (data.secondary_tag_ids?.length) {
      for (const tagId of data.secondary_tag_ids) {
        await this.addModelTag(model.id, tagId, false);
      }
    }

    return model;
  }

  async updateModel(modelId: string, data: Partial<ModelFormData>): Promise<CreatorModel> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Map form data to model fields
    const fields = [
      'name', 'age', 'bio', 'avatar_url', 'banner_url',
      'personality_traits', 'interests', 'backstory', 'speaking_style',
      'physical_traits', 'turn_ons', 'turn_offs', 'emoji_usage',
      'response_length', 'subscription_price', 'price_per_message',
      'nsfw_enabled', 'sfw_enabled', 'default_chat_mode',
    ];

    for (const field of fields) {
      if (data[field as keyof ModelFormData] !== undefined) {
        updateData[field] = data[field as keyof ModelFormData];
      }
    }

    const { data: model, error } = await this.supabase
      .from('creator_models')
      .update(updateData)
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;
    return model;
  }

  async submitModelForReview(modelId: string): Promise<CreatorModel> {
    return this.updateModel(modelId, {} as ModelFormData).then(async () => {
      const { data, error } = await this.supabase
        .from('creator_models')
        .update({
          status: 'pending_review' as ModelStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', modelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  }

  async deleteModel(modelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('creator_models')
      .delete()
      .eq('id', modelId);

    if (error) throw error;
  }

  // ===========================================
  // TAGS
  // ===========================================

  async addModelTag(modelId: string, tagId: string, isPrimary: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('model_tags')
      .insert({
        model_id: modelId,
        tag_id: tagId,
        is_primary: isPrimary,
      });

    if (error) throw error;
  }

  async removeModelTag(modelId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('model_tags')
      .delete()
      .eq('model_id', modelId)
      .eq('tag_id', tagId);

    if (error) throw error;
  }

  async getModelTags(modelId: string): Promise<Array<{ tag_id: string; is_primary: boolean }>> {
    const { data, error } = await this.supabase
      .from('model_tags')
      .select('tag_id, is_primary')
      .eq('model_id', modelId);

    if (error) throw error;
    return data || [];
  }
}

// ===========================================
// ADMIN SERVICE
// ===========================================

export class AdminService {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================
  // ADMIN ACCESS CHECK
  // ===========================================

  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  }

  async requireAdmin(userId: string): Promise<void> {
    const isAdmin = await this.isAdmin(userId);
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
  }

  // ===========================================
  // DASHBOARD STATS
  // ===========================================

  async getStats(): Promise<AdminStats> {
    // Get queue counts
    const [
      { count: pendingCreators },
      { count: pendingModels },
      { count: pendingReports },
      { count: totalCreators },
      { count: totalModels },
    ] = await Promise.all([
      this.supabase.from('creators').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      this.supabase.from('creator_models').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
      this.supabase.from('content_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      this.supabase.from('creators').select('*', { count: 'exact', head: true }),
      this.supabase.from('creator_models').select('*', { count: 'exact', head: true }),
    ]);

    // Get subscriber count
    const { count: totalSubscribers } = await this.supabase
      .from('model_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get revenue (simplified)
    const { data: revenueData } = await this.supabase
      .from('token_ledger')
      .select('amount_tokens')
      .eq('type', 'spend');

    const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.amount_tokens || 0), 0) || 0;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: newCreatorsToday } = await this.supabase
      .from('creators')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    const { count: newSubscribersToday } = await this.supabase
      .from('model_subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    const { data: todayRevenue } = await this.supabase
      .from('token_ledger')
      .select('amount_tokens')
      .eq('type', 'spend')
      .gte('created_at', todayISO);

    return {
      pending_creators: pendingCreators || 0,
      pending_models: pendingModels || 0,
      pending_reports: pendingReports || 0,
      total_creators: totalCreators || 0,
      total_models: totalModels || 0,
      total_subscribers: totalSubscribers || 0,
      total_revenue: totalRevenue,
      new_creators_today: newCreatorsToday || 0,
      new_subscribers_today: newSubscribersToday || 0,
      revenue_today: todayRevenue?.reduce((sum, r) => sum + (r.amount_tokens || 0), 0) || 0,
    };
  }

  // ===========================================
  // CREATOR APPROVAL
  // ===========================================

  async getPendingCreators(
    page: number = 1,
    perPage: number = 20
  ): Promise<PaginatedResponse<CreatorWithProfile>> {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count, error } = await this.supabase
      .from('creators')
      .select(`
        *,
        profile:profiles!user_id(username, email)
      `, { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  }

  async approveCreator(
    creatorId: string,
    adminId: string,
    notes?: string
  ): Promise<Creator> {
    const { data, error } = await this.supabase
      .from('creators')
      .update({
        status: 'approved' as CreatorStatus,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', creatorId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await this.logAction(adminId, 'approve_creator', 'creator', creatorId, { notes });

    return data;
  }

  async rejectCreator(
    creatorId: string,
    adminId: string,
    reason: string
  ): Promise<Creator> {
    const { data, error } = await this.supabase
      .from('creators')
      .update({
        status: 'rejected' as CreatorStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creatorId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await this.logAction(adminId, 'reject_creator', 'creator', creatorId, { reason });

    return data;
  }

  // ===========================================
  // MODEL APPROVAL
  // ===========================================

  async getPendingModels(
    page: number = 1,
    perPage: number = 20
  ): Promise<PaginatedResponse<ModelWithCreator>> {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count, error } = await this.supabase
      .from('creator_models')
      .select(`
        *,
        creator:creators!creator_id(display_name, avatar_url)
      `, { count: 'exact' })
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  }

  async approveModel(
    modelId: string,
    adminId: string,
    notes?: string
  ): Promise<CreatorModel> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .update({
        status: 'approved' as ModelStatus,
        is_active: true,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await this.logAction(adminId, 'approve_model', 'model', modelId, { notes });

    return data;
  }

  async rejectModel(
    modelId: string,
    adminId: string,
    reason: string
  ): Promise<CreatorModel> {
    const { data, error } = await this.supabase
      .from('creator_models')
      .update({
        status: 'rejected' as ModelStatus,
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await this.logAction(adminId, 'reject_model', 'model', modelId, { reason });

    return data;
  }

  // ===========================================
  // AUDIT LOG
  // ===========================================

  async logAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLogEntry> {
    const { data, error } = await this.supabase
      .from('audit_log')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log audit action:', error);
      throw error;
    }

    return data;
  }

  async getAuditLog(
    page: number = 1,
    perPage: number = 50,
    filters?: {
      adminId?: string;
      action?: string;
      targetType?: string;
    }
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = this.supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  }
}

// ===========================================
// FACTORY FUNCTIONS
// ===========================================

export function createCreatorService(supabase: SupabaseClient): CreatorService {
  return new CreatorService(supabase);
}

export function createAdminService(supabase: SupabaseClient): AdminService {
  return new AdminService(supabase);
}
