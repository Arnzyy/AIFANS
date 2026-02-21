// ===========================================
// VOICE SYSTEM TYPES
// Core types for voice library and settings
// ===========================================

// ===========================================
// VOICE LIBRARY TYPES
// ===========================================

export type VoiceProvider = 'elevenlabs' | 'openai' | 'playht';
export type VoiceGender = 'female' | 'male' | 'neutral';
export type VoiceAgeRange = 'young' | 'middle' | 'mature';

export interface VoiceLibraryEntry {
  id: string;
  provider: VoiceProvider;
  provider_voice_id: string;
  name: string;
  description: string | null;
  gender: VoiceGender | null;
  age_range: VoiceAgeRange | null;
  accent: string;
  style: string;
  preview_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===========================================
// MODEL VOICE SETTINGS TYPES
// ===========================================

export interface ModelVoiceSettings {
  id: string;
  creator_id: string;
  personality_id: string;
  voice_id: string | null;
  custom_voice_id: string | null;
  stability: number;
  similarity_boost: number;
  style_exaggeration: number;
  speed: number;
  voice_enabled: boolean;
  realtime_enabled: boolean;
  realtime_voice_id: string | null;
  realtime_stability: number;
  realtime_similarity: number;
  realtime_speed: number;
  created_at: string;
  updated_at: string;
}

export interface ModelVoiceSettingsInput {
  voice_id?: string | null;
  custom_voice_id?: string | null;
  stability?: number;
  similarity_boost?: number;
  style_exaggeration?: number;
  speed?: number;
  voice_enabled?: boolean;
  realtime_enabled?: boolean;
  realtime_voice_id?: string | null;
  realtime_stability?: number;
  realtime_similarity?: number;
  realtime_speed?: number;
}

// ===========================================
// VOICE SESSION TYPES
// ===========================================

export type VoiceSessionStatus = 'connecting' | 'active' | 'paused' | 'ended' | 'failed';
export type VoiceSessionMode = 'call' | 'inline';

export interface VoiceSession {
  id: string;
  subscriber_id: string;
  creator_id: string;
  personality_id: string;
  status: VoiceSessionStatus;
  mode: VoiceSessionMode;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  stt_seconds: number;
  tts_characters: number;
  llm_input_tokens: number;
  llm_output_tokens: number;
  estimated_cost_cents: number;
  avg_latency_ms: number | null;
  barge_in_count: number;
  ended_reason: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceSessionMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp_ms: number;
  duration_ms: number | null;
  stt_confidence: number | null;
  latency_ms: number | null;
  was_interrupted: boolean;
  created_at: string;
}

// ===========================================
// VOICE USAGE TYPES
// ===========================================

export interface VoiceUsageLimit {
  id: string;
  subscriber_id: string;
  period_start: string;
  period_end: string;
  minutes_used: number;
  minutes_limit: number;
  alert_75_sent: boolean;
  alert_90_sent: boolean;
  limit_reached_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceUsageCheck {
  allowed: boolean;
  minutes_used: number;
  minutes_limit: number;
  minutes_remaining: number;
  percentage_used: number;
  is_near_limit: boolean;
  is_at_limit: boolean;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface VoiceLibraryResponse {
  voices: VoiceLibraryEntry[];
}

export interface VoiceSettingsResponse {
  settings: ModelVoiceSettings | null;
  voice: VoiceLibraryEntry | null;
}

export interface VoicePreviewRequest {
  voice_id: string;
  text?: string;
}

export interface VoicePreviewResponse {
  audio_url: string;
  duration_ms: number;
}

// ===========================================
// ELEVENLABS API TYPES
// ===========================================

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface ElevenLabsTTSRequest {
  text: string;
  model_id: string;
  voice_settings: ElevenLabsVoiceSettings;
  output_format?: string;
}

// ===========================================
// FILTER TYPES
// ===========================================

export interface VoiceLibraryFilters {
  gender?: VoiceGender;
  age_range?: VoiceAgeRange;
  accent?: string;
  is_premium?: boolean;
}
