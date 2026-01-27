// ===========================================
// CREATOR CONFIG CACHE
// In-memory cache with TTL for creator settings
// Reduces DB queries for frequently accessed data
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

export interface CachedCreatorConfig {
  // Creator model info
  id: string;
  name: string;
  age?: number;
  creator_id: string; // profile ID

  // AI personality
  personality_traits?: string[];
  interests?: string[];
  emoji_usage?: string;
  response_length?: string;
  speaking_style?: string;

  // Settings
  ai_chat_enabled: boolean;
  status: string;

  // Cache metadata
  cached_at: number;
}

export interface CachedPersonality {
  id: string;
  creator_id: string;
  model_id?: string;
  persona_name: string;
  is_active: boolean;
  // Full personality data
  data: any;
  cached_at: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ===========================================
// CACHE CONFIGURATION
// ===========================================

const CACHE_CONFIG = {
  // Time-to-live in milliseconds
  CREATOR_TTL: 5 * 60 * 1000, // 5 minutes
  PERSONALITY_TTL: 5 * 60 * 1000, // 5 minutes

  // Max cache size (prevent memory bloat)
  MAX_ENTRIES: 1000,

  // Enable logging for debugging
  DEBUG: process.env.NODE_ENV === 'development',
};

// ===========================================
// CACHE STORAGE
// ===========================================

const creatorCache = new Map<string, CacheEntry<CachedCreatorConfig>>();
const personalityCache = new Map<string, CacheEntry<CachedPersonality>>();

// Cache stats for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
};

// ===========================================
// CACHE OPERATIONS
// ===========================================

/**
 * Get creator config from cache or fetch from DB
 */
export async function getCreatorConfig(
  supabase: SupabaseClient,
  creatorId: string
): Promise<CachedCreatorConfig | null> {
  const cacheKey = creatorId;

  // Check cache
  const cached = creatorCache.get(cacheKey);
  if (cached && !isExpired(cached.timestamp, CACHE_CONFIG.CREATOR_TTL)) {
    cacheStats.hits++;
    if (CACHE_CONFIG.DEBUG) {
      console.log(`[CreatorCache] HIT for ${creatorId}`);
    }
    return cached.data;
  }

  cacheStats.misses++;
  if (CACHE_CONFIG.DEBUG) {
    console.log(`[CreatorCache] MISS for ${creatorId}`);
  }

  // Fetch from database
  const { data, error } = await supabase
    .from('creator_models')
    .select(`
      id,
      name,
      age,
      creator_id,
      personality_traits,
      interests,
      emoji_usage,
      response_length,
      speaking_style,
      ai_chat_enabled,
      status
    `)
    .eq('id', creatorId)
    .single();

  if (error || !data) {
    return null;
  }

  const config: CachedCreatorConfig = {
    ...data,
    cached_at: Date.now(),
  };

  // Store in cache
  setWithEviction(creatorCache, cacheKey, {
    data: config,
    timestamp: Date.now(),
  });

  return config;
}

/**
 * Get AI personality from cache or fetch from DB
 */
export async function getPersonality(
  supabase: SupabaseClient,
  creatorId: string
): Promise<CachedPersonality | null> {
  const cacheKey = `personality:${creatorId}`;

  // Check cache
  const cached = personalityCache.get(cacheKey);
  if (cached && !isExpired(cached.timestamp, CACHE_CONFIG.PERSONALITY_TTL)) {
    cacheStats.hits++;
    if (CACHE_CONFIG.DEBUG) {
      console.log(`[PersonalityCache] HIT for ${creatorId}`);
    }
    return cached.data;
  }

  cacheStats.misses++;
  if (CACHE_CONFIG.DEBUG) {
    console.log(`[PersonalityCache] MISS for ${creatorId}`);
  }

  // Fetch from database - check both creator_id and model_id
  const { data, error } = await supabase
    .from('ai_personalities')
    .select('*')
    .or(`creator_id.eq.${creatorId},model_id.eq.${creatorId}`)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const personality: CachedPersonality = {
    id: data.id,
    creator_id: data.creator_id,
    model_id: data.model_id,
    persona_name: data.persona_name,
    is_active: data.is_active,
    data: data,
    cached_at: Date.now(),
  };

  // Store in cache
  setWithEviction(personalityCache, cacheKey, {
    data: personality,
    timestamp: Date.now(),
  });

  return personality;
}

/**
 * Get both creator config and personality in one call
 * Uses parallel fetching for efficiency
 */
export async function getCreatorWithPersonality(
  supabase: SupabaseClient,
  creatorId: string
): Promise<{
  creator: CachedCreatorConfig | null;
  personality: CachedPersonality | null;
}> {
  const [creator, personality] = await Promise.all([
    getCreatorConfig(supabase, creatorId),
    getPersonality(supabase, creatorId),
  ]);

  return { creator, personality };
}

// ===========================================
// CACHE INVALIDATION
// ===========================================

/**
 * Invalidate cache for a specific creator
 * Call this when creator updates their settings
 */
export function invalidateCreator(creatorId: string): void {
  creatorCache.delete(creatorId);
  personalityCache.delete(`personality:${creatorId}`);

  if (CACHE_CONFIG.DEBUG) {
    console.log(`[Cache] Invalidated ${creatorId}`);
  }
}

/**
 * Clear all caches (useful for server restart or testing)
 */
export function clearAllCaches(): void {
  creatorCache.clear();
  personalityCache.clear();
  cacheStats = { hits: 0, misses: 0, evictions: 0 };

  if (CACHE_CONFIG.DEBUG) {
    console.log('[Cache] All caches cleared');
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  creatorCacheSize: number;
  personalityCacheSize: number;
} {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    ...cacheStats,
    hitRate: total > 0 ? cacheStats.hits / total : 0,
    creatorCacheSize: creatorCache.size,
    personalityCacheSize: personalityCache.size,
  };
}

// ===========================================
// HELPERS
// ===========================================

function isExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl;
}

function setWithEviction<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  entry: CacheEntry<T>
): void {
  // Evict old entries if cache is full
  if (cache.size >= CACHE_CONFIG.MAX_ENTRIES) {
    // Simple LRU-like eviction: delete oldest entries
    const entriesToDelete = Math.floor(CACHE_CONFIG.MAX_ENTRIES * 0.1); // Delete 10%
    const keys = Array.from(cache.keys());

    for (let i = 0; i < entriesToDelete && i < keys.length; i++) {
      cache.delete(keys[i]);
      cacheStats.evictions++;
    }
  }

  cache.set(key, entry);
}
