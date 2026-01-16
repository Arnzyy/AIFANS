// ===========================================
// FEATURE FLAG SERVICE
// Allows toggling features with rollout percentage
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service client for bypassing RLS when checking flags
let serviceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return serviceClient;
}

// ===========================================
// TYPES
// ===========================================

export interface FeatureFlag {
  flag_name: string;
  is_enabled: boolean;
  rollout_percentage: number;
  description?: string;
}

// ===========================================
// FEATURE FLAG SERVICE
// ===========================================

export class FeatureFlagService {
  private cache: Map<string, FeatureFlag> = new Map();
  private cacheTime: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor(private supabase: SupabaseClient) {}

  // ===========================================
  // CHECK IF FLAG IS ENABLED
  // ===========================================

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const flag = await this.getFlag(flagName);

    if (!flag) {
      return false;
    }

    if (!flag.is_enabled) {
      return false;
    }

    // If rollout is 100%, everyone gets it
    if (flag.rollout_percentage >= 100) {
      return true;
    }

    // If rollout is 0%, no one gets it
    if (flag.rollout_percentage <= 0) {
      return false;
    }

    // Percentage rollout based on user ID hash
    if (userId) {
      const hash = this.hashUserId(userId);
      const bucket = hash % 100;
      return bucket < flag.rollout_percentage;
    }

    // Random rollout if no user ID
    return Math.random() * 100 < flag.rollout_percentage;
  }

  // ===========================================
  // GET FLAG DETAILS
  // ===========================================

  async getFlag(flagName: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = this.cache.get(flagName);
    const cacheAge = Date.now() - (this.cacheTime.get(flagName) || 0);

    if (cached && cacheAge < this.CACHE_TTL_MS) {
      return cached;
    }

    // Fetch from database
    const { data, error } = await this.supabase
      .from('feature_flags')
      .select('*')
      .eq('flag_name', flagName)
      .single();

    if (error || !data) {
      return null;
    }

    // Update cache
    this.cache.set(flagName, data);
    this.cacheTime.set(flagName, Date.now());

    return data;
  }

  // ===========================================
  // SET FLAG (Admin only)
  // ===========================================

  async setFlag(
    flagName: string,
    isEnabled: boolean,
    rolloutPercentage: number = 100
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('feature_flags')
      .upsert({
        flag_name: flagName,
        is_enabled: isEnabled,
        rollout_percentage: Math.min(100, Math.max(0, rolloutPercentage)),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'flag_name' });

    if (!error) {
      // Clear cache
      this.cache.delete(flagName);
      this.cacheTime.delete(flagName);
    }

    return !error;
  }

  // ===========================================
  // HELPERS
  // ===========================================

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// ===========================================
// KNOWN FLAGS
// ===========================================

export const FEATURE_FLAGS = {
  ENHANCED_CHAT_V2: 'enhanced_chat_v2',
  // Add more flags here as needed
} as const;

// ===========================================
// CONVENIENCE FUNCTIONS
// ===========================================

/**
 * Quick check for enhanced chat v2 flag
 * Uses service client to bypass RLS
 */
export async function useEnhancedChatV2(
  supabase: SupabaseClient,
  userId?: string
): Promise<boolean> {
  // Use service client to bypass RLS when checking flags
  const service = new FeatureFlagService(getServiceClient());
  return service.isEnabled(FEATURE_FLAGS.ENHANCED_CHAT_V2, userId);
}

/**
 * Get all feature flags (for admin panel)
 */
export async function getAllFeatureFlags(
  supabase: SupabaseClient
): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('flag_name');

  if (error) {
    console.error('Failed to get feature flags:', error);
    return [];
  }

  return data || [];
}

/**
 * Update a feature flag (for admin panel)
 */
export async function updateFeatureFlag(
  supabase: SupabaseClient,
  flagName: string,
  isEnabled: boolean,
  rolloutPercentage?: number
): Promise<boolean> {
  const service = new FeatureFlagService(supabase);
  return service.setFlag(flagName, isEnabled, rolloutPercentage);
}
