// ===========================================
// VOICE SETTINGS SERVICE
// CRUD operations for model_voice_settings
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  ModelVoiceSettings,
  ModelVoiceSettingsInput,
  VoiceLibraryEntry,
  VoiceSettingsResponse,
} from './types';
import { getVoiceById } from './voice-library-service';

// ===========================================
// GET FUNCTIONS
// ===========================================

/**
 * Get voice settings for a personality
 */
export async function getVoiceSettings(
  supabase: SupabaseClient,
  personalityId: string
): Promise<ModelVoiceSettings | null> {
  const { data, error } = await supabase
    .from('model_voice_settings')
    .select('*')
    .eq('personality_id', personalityId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - this is normal for personalities without voice config
      return null;
    }
    console.error('[VoiceSettings] Error fetching settings:', error);
    throw new Error('Failed to fetch voice settings');
  }

  return data as ModelVoiceSettings;
}

/**
 * Get voice settings with the associated voice details
 */
export async function getVoiceSettingsWithVoice(
  supabase: SupabaseClient,
  personalityId: string
): Promise<VoiceSettingsResponse> {
  const settings = await getVoiceSettings(supabase, personalityId);

  if (!settings) {
    return { settings: null, voice: null };
  }

  let voice: VoiceLibraryEntry | null = null;
  if (settings.voice_id) {
    voice = await getVoiceById(supabase, settings.voice_id);
  }

  return { settings, voice };
}

/**
 * Get all voice settings for a creator
 */
export async function getCreatorVoiceSettings(
  supabase: SupabaseClient,
  creatorId: string
): Promise<ModelVoiceSettings[]> {
  const { data, error } = await supabase
    .from('model_voice_settings')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[VoiceSettings] Error fetching creator settings:', error);
    throw new Error('Failed to fetch voice settings');
  }

  return (data || []) as ModelVoiceSettings[];
}

// ===========================================
// SAVE/UPDATE FUNCTIONS
// ===========================================

/**
 * Save or update voice settings for a personality
 */
export async function saveVoiceSettings(
  supabase: SupabaseClient,
  creatorId: string,
  personalityId: string,
  input: ModelVoiceSettingsInput
): Promise<ModelVoiceSettings> {
  // Validate input
  if (input.stability !== undefined && (input.stability < 0 || input.stability > 1)) {
    throw new Error('Stability must be between 0 and 1');
  }
  if (input.similarity_boost !== undefined && (input.similarity_boost < 0 || input.similarity_boost > 1)) {
    throw new Error('Similarity boost must be between 0 and 1');
  }
  if (input.speed !== undefined && (input.speed < 0.5 || input.speed > 2.0)) {
    throw new Error('Speed must be between 0.5 and 2.0');
  }

  // Check if settings already exist
  const existing = await getVoiceSettings(supabase, personalityId);

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('model_voice_settings')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[VoiceSettings] Error updating settings:', error);
      throw new Error('Failed to update voice settings');
    }

    return data as ModelVoiceSettings;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('model_voice_settings')
      .insert({
        creator_id: creatorId,
        personality_id: personalityId,
        ...input,
      })
      .select()
      .single();

    if (error) {
      console.error('[VoiceSettings] Error creating settings:', error);
      throw new Error('Failed to create voice settings');
    }

    return data as ModelVoiceSettings;
  }
}

/**
 * Enable or disable voice for a personality
 */
export async function setVoiceEnabled(
  supabase: SupabaseClient,
  creatorId: string,
  personalityId: string,
  enabled: boolean
): Promise<ModelVoiceSettings> {
  return saveVoiceSettings(supabase, creatorId, personalityId, {
    voice_enabled: enabled,
  });
}

/**
 * Enable or disable realtime voice for a personality
 */
export async function setRealtimeEnabled(
  supabase: SupabaseClient,
  creatorId: string,
  personalityId: string,
  enabled: boolean
): Promise<ModelVoiceSettings> {
  return saveVoiceSettings(supabase, creatorId, personalityId, {
    realtime_enabled: enabled,
  });
}

// ===========================================
// DELETE FUNCTIONS
// ===========================================

/**
 * Delete voice settings for a personality
 */
export async function deleteVoiceSettings(
  supabase: SupabaseClient,
  personalityId: string
): Promise<void> {
  const { error } = await supabase
    .from('model_voice_settings')
    .delete()
    .eq('personality_id', personalityId);

  if (error) {
    console.error('[VoiceSettings] Error deleting settings:', error);
    throw new Error('Failed to delete voice settings');
  }
}

// ===========================================
// QUERY FUNCTIONS
// ===========================================

/**
 * Check if voice is enabled for a personality
 */
export async function isVoiceEnabled(
  supabase: SupabaseClient,
  personalityId: string
): Promise<boolean> {
  const settings = await getVoiceSettings(supabase, personalityId);
  return settings?.voice_enabled ?? false;
}

/**
 * Check if realtime voice is enabled for a personality
 */
export async function isRealtimeEnabled(
  supabase: SupabaseClient,
  personalityId: string
): Promise<boolean> {
  const settings = await getVoiceSettings(supabase, personalityId);
  return settings?.realtime_enabled ?? false;
}

/**
 * Get the ElevenLabs voice ID for a personality
 * Returns the realtime voice ID if set, otherwise the main voice ID
 */
export async function getElevenLabsVoiceId(
  supabase: SupabaseClient,
  personalityId: string
): Promise<string | null> {
  const settings = await getVoiceSettings(supabase, personalityId);

  if (!settings) {
    return null;
  }

  // For realtime, prefer realtime_voice_id if set
  if (settings.realtime_voice_id) {
    return settings.realtime_voice_id;
  }

  // Otherwise, get the provider_voice_id from the voice library
  if (settings.voice_id) {
    const voice = await getVoiceById(supabase, settings.voice_id);
    return voice?.provider_voice_id ?? null;
  }

  // Check custom voice ID
  if (settings.custom_voice_id) {
    return settings.custom_voice_id;
  }

  return null;
}

/**
 * Get voice parameters for TTS
 */
export async function getVoiceParameters(
  supabase: SupabaseClient,
  personalityId: string,
  forRealtime: boolean = false
): Promise<{
  voiceId: string | null;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}> {
  const settings = await getVoiceSettings(supabase, personalityId);

  if (!settings) {
    return {
      voiceId: null,
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      speed: 1.0,
    };
  }

  const voiceId = await getElevenLabsVoiceId(supabase, personalityId);

  if (forRealtime) {
    return {
      voiceId,
      stability: settings.realtime_stability,
      similarityBoost: settings.realtime_similarity,
      style: settings.style_exaggeration,
      speed: settings.realtime_speed,
    };
  }

  return {
    voiceId,
    stability: settings.stability,
    similarityBoost: settings.similarity_boost,
    style: settings.style_exaggeration,
    speed: settings.speed,
  };
}

// ===========================================
// VALIDATION
// ===========================================

/**
 * Validate voice settings input
 */
export function validateVoiceSettingsInput(input: ModelVoiceSettingsInput): string[] {
  const errors: string[] = [];

  if (input.stability !== undefined) {
    if (typeof input.stability !== 'number' || input.stability < 0 || input.stability > 1) {
      errors.push('Stability must be a number between 0 and 1');
    }
  }

  if (input.similarity_boost !== undefined) {
    if (typeof input.similarity_boost !== 'number' || input.similarity_boost < 0 || input.similarity_boost > 1) {
      errors.push('Similarity boost must be a number between 0 and 1');
    }
  }

  if (input.style_exaggeration !== undefined) {
    if (typeof input.style_exaggeration !== 'number' || input.style_exaggeration < 0 || input.style_exaggeration > 1) {
      errors.push('Style exaggeration must be a number between 0 and 1');
    }
  }

  if (input.speed !== undefined) {
    if (typeof input.speed !== 'number' || input.speed < 0.5 || input.speed > 2.0) {
      errors.push('Speed must be a number between 0.5 and 2.0');
    }
  }

  return errors;
}
