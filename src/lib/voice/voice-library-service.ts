// ===========================================
// VOICE LIBRARY SERVICE
// CRUD operations for voice_library table
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  VoiceLibraryEntry,
  VoiceLibraryFilters,
  VoicePreviewResponse
} from './types';

// ===========================================
// CACHE
// ===========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let voiceListCache: CacheEntry<VoiceLibraryEntry[]> | null = null;
const voiceByIdCache = new Map<string, CacheEntry<VoiceLibraryEntry>>();

function isCacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// ===========================================
// GET FUNCTIONS
// ===========================================

/**
 * Get all active voices from the library
 * Cached for 5 minutes
 */
export async function getAvailableVoices(
  supabase: SupabaseClient,
  filters?: VoiceLibraryFilters
): Promise<VoiceLibraryEntry[]> {
  // Check cache first (only for unfiltered requests)
  if (!filters && isCacheValid(voiceListCache)) {
    return voiceListCache.data;
  }

  let query = supabase
    .from('voice_library')
    .select('*')
    .eq('is_active', true)
    .order('name');

  // Apply filters
  if (filters?.gender) {
    query = query.eq('gender', filters.gender);
  }
  if (filters?.age_range) {
    query = query.eq('age_range', filters.age_range);
  }
  if (filters?.accent) {
    query = query.eq('accent', filters.accent);
  }
  if (filters?.is_premium !== undefined) {
    query = query.eq('is_premium', filters.is_premium);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[VoiceLibrary] Error fetching voices:', error);
    throw new Error('Failed to fetch voice library');
  }

  const voices = (data || []) as VoiceLibraryEntry[];

  // Cache unfiltered results
  if (!filters) {
    voiceListCache = {
      data: voices,
      timestamp: Date.now(),
    };
  }

  return voices;
}

/**
 * Get a single voice by ID
 */
export async function getVoiceById(
  supabase: SupabaseClient,
  voiceId: string
): Promise<VoiceLibraryEntry | null> {
  // Check cache
  const cached = voiceByIdCache.get(voiceId);
  if (isCacheValid(cached)) {
    return cached.data;
  }

  const { data, error } = await supabase
    .from('voice_library')
    .select('*')
    .eq('id', voiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('[VoiceLibrary] Error fetching voice:', error);
    throw new Error('Failed to fetch voice');
  }

  const voice = data as VoiceLibraryEntry;

  // Cache result
  voiceByIdCache.set(voiceId, {
    data: voice,
    timestamp: Date.now(),
  });

  return voice;
}

/**
 * Get voice by provider voice ID (e.g., ElevenLabs voice ID)
 */
export async function getVoiceByProviderId(
  supabase: SupabaseClient,
  provider: string,
  providerVoiceId: string
): Promise<VoiceLibraryEntry | null> {
  const { data, error } = await supabase
    .from('voice_library')
    .select('*')
    .eq('provider', provider)
    .eq('provider_voice_id', providerVoiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[VoiceLibrary] Error fetching voice by provider ID:', error);
    throw new Error('Failed to fetch voice');
  }

  return data as VoiceLibraryEntry;
}

// ===========================================
// PREVIEW FUNCTIONS
// ===========================================

const DEFAULT_PREVIEW_TEXT = "Hey there! I'm so happy to hear your voice. How are you doing today?";

/**
 * Generate a voice preview using ElevenLabs
 */
export async function generateVoicePreview(
  voiceId: string,
  text: string = DEFAULT_PREVIEW_TEXT
): Promise<VoicePreviewResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VoiceLibrary] ElevenLabs preview error:', response.status, errorText);
    throw new Error('Failed to generate voice preview');
  }

  // Get the audio as a blob
  const audioBlob = await response.blob();

  // Convert to base64 data URL
  const buffer = await audioBlob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const audioUrl = `data:audio/mpeg;base64,${base64}`;

  // Estimate duration (rough calculation based on text length)
  const estimatedDurationMs = Math.max(1000, text.length * 50);

  return {
    audio_url: audioUrl,
    duration_ms: estimatedDurationMs,
  };
}

// ===========================================
// ADMIN FUNCTIONS
// ===========================================

/**
 * Add a new voice to the library (admin only)
 */
export async function addVoice(
  supabase: SupabaseClient,
  voice: Omit<VoiceLibraryEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<VoiceLibraryEntry> {
  const { data, error } = await supabase
    .from('voice_library')
    .insert(voice)
    .select()
    .single();

  if (error) {
    console.error('[VoiceLibrary] Error adding voice:', error);
    throw new Error('Failed to add voice');
  }

  // Invalidate cache
  voiceListCache = null;

  return data as VoiceLibraryEntry;
}

/**
 * Update a voice in the library (admin only)
 */
export async function updateVoice(
  supabase: SupabaseClient,
  voiceId: string,
  updates: Partial<VoiceLibraryEntry>
): Promise<VoiceLibraryEntry> {
  const { data, error } = await supabase
    .from('voice_library')
    .update(updates)
    .eq('id', voiceId)
    .select()
    .single();

  if (error) {
    console.error('[VoiceLibrary] Error updating voice:', error);
    throw new Error('Failed to update voice');
  }

  // Invalidate caches
  voiceListCache = null;
  voiceByIdCache.delete(voiceId);

  return data as VoiceLibraryEntry;
}

/**
 * Deactivate a voice (soft delete)
 */
export async function deactivateVoice(
  supabase: SupabaseClient,
  voiceId: string
): Promise<void> {
  const { error } = await supabase
    .from('voice_library')
    .update({ is_active: false })
    .eq('id', voiceId);

  if (error) {
    console.error('[VoiceLibrary] Error deactivating voice:', error);
    throw new Error('Failed to deactivate voice');
  }

  // Invalidate caches
  voiceListCache = null;
  voiceByIdCache.delete(voiceId);
}

// ===========================================
// CACHE MANAGEMENT
// ===========================================

/**
 * Clear all voice library caches
 */
export function clearVoiceCache(): void {
  voiceListCache = null;
  voiceByIdCache.clear();
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get unique accents from the voice library
 */
export async function getAvailableAccents(
  supabase: SupabaseClient
): Promise<string[]> {
  const voices = await getAvailableVoices(supabase);
  const accents = new Set(voices.map(v => v.accent).filter(Boolean));
  return Array.from(accents).sort();
}

/**
 * Group voices by gender
 */
export function groupVoicesByGender(
  voices: VoiceLibraryEntry[]
): Record<string, VoiceLibraryEntry[]> {
  return voices.reduce((acc, voice) => {
    const gender = voice.gender || 'neutral';
    if (!acc[gender]) {
      acc[gender] = [];
    }
    acc[gender].push(voice);
    return acc;
  }, {} as Record<string, VoiceLibraryEntry[]>);
}
