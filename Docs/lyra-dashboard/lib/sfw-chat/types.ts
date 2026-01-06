// ===========================================
// SFW / COMPANION CHAT - TYPES & CONFIG
// Completely separate from NSFW system
// ===========================================

// ===========================================
// ENUMS
// ===========================================

export type ChatMode = 'nsfw' | 'sfw';

export type SFWFlirtLevel = 'friendly' | 'light_flirty' | 'romantic';

// ===========================================
// SFW PERSONALITY CONFIG (SEPARATE FROM NSFW)
// ===========================================

export interface SFWPersonalityConfig {
  id?: string;
  creator_id: string;
  
  // Enable/disable
  enabled: boolean;
  
  // Identity (duplicated, separate from NSFW)
  persona_name: string;
  persona_age: number;
  backstory: string;
  
  // SFW-safe personality traits only
  personality_traits: SFWPersonalityTrait[];
  
  // Flirt level (SFW specific)
  flirt_level: SFWFlirtLevel;
  
  // Interests (safe topics)
  interests: string[];
  
  // Turn ons/offs (kept tasteful for SFW)
  turn_ons: string;   // e.g., "Confidence, humor, good conversation"
  turn_offs: string;  // e.g., "Rudeness, being ignored"
  
  // Response style
  response_length: 'short' | 'medium' | 'long';
  emoji_usage: 'none' | 'minimal' | 'some' | 'lots';
  
  // Pricing (separate from NSFW)
  pricing_model: 'included' | 'per_message';
  price_per_message: number;
  
  // Physical traits (safe subset)
  physical_traits?: SFWPhysicalTraits;
  
  created_at?: string;
  updated_at?: string;
}

// ===========================================
// SFW-SAFE PERSONALITY TRAITS
// (No NSFW themes like Dominant/Submissive for explicit context)
// ===========================================

export type SFWPersonalityTrait =
  | 'friendly'
  | 'playful'
  | 'sweet'
  | 'confident'
  | 'shy'
  | 'intellectual'
  | 'mysterious'
  | 'romantic'
  | 'caring'
  | 'witty'
  | 'adventurous'
  | 'creative';

export const SFW_PERSONALITY_TRAITS: { id: SFWPersonalityTrait; label: string; emoji: string }[] = [
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'playful', label: 'Playful', emoji: '😜' },
  { id: 'sweet', label: 'Sweet', emoji: '🥰' },
  { id: 'confident', label: 'Confident', emoji: '💪' },
  { id: 'shy', label: 'Shy', emoji: '🙈' },
  { id: 'intellectual', label: 'Intellectual', emoji: '🧠' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  { id: 'romantic', label: 'Romantic', emoji: '💕' },
  { id: 'caring', label: 'Caring', emoji: '💗' },
  { id: 'witty', label: 'Witty', emoji: '✨' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🌟' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
];

// ===========================================
// SFW FLIRT LEVELS
// ===========================================

export const SFW_FLIRT_LEVELS: { id: SFWFlirtLevel; label: string; description: string }[] = [
  { 
    id: 'friendly', 
    label: 'Friendly', 
    description: 'Warm and supportive, like a good friend' 
  },
  { 
    id: 'light_flirty', 
    label: 'Light Flirty', 
    description: 'Playful teasing, subtle compliments' 
  },
  { 
    id: 'romantic', 
    label: 'Romantic', 
    description: 'Sweet, affectionate, emotionally engaging (still SFW)' 
  },
];

// ===========================================
// SFW PHYSICAL TRAITS (TASTEFUL SUBSET)
// ===========================================

export interface SFWPhysicalTraits {
  height_range?: string;
  body_type?: string;
  hair_colour?: string;
  eye_colour?: string;
  fashion_aesthetic?: string;
  favourite_outfits?: string[];
  styling_descriptors?: string[];
}

// ===========================================
// CREATOR CHAT MODE SETTINGS
// ===========================================

export interface CreatorChatModeSettings {
  creator_id: string;
  
  // Which modes are enabled
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  
  // Default mode when both enabled
  default_mode: ChatMode;
  
  updated_at?: string;
}

// ===========================================
// CHAT SESSION WITH MODE
// ===========================================

export interface ChatSessionMeta {
  id: string;
  creator_id: string;
  subscriber_id: string;
  mode: ChatMode;
  created_at: string;
  last_message_at: string;
}

// ===========================================
// DEFAULT SFW CONFIG
// ===========================================

export const DEFAULT_SFW_CONFIG: Omit<SFWPersonalityConfig, 'creator_id'> = {
  enabled: false,
  persona_name: '',
  persona_age: 21,
  backstory: '',
  personality_traits: ['friendly', 'playful'],
  flirt_level: 'light_flirty',
  interests: [],
  turn_ons: '',
  turn_offs: '',
  response_length: 'medium',
  emoji_usage: 'some',
  pricing_model: 'included',
  price_per_message: 0.25,
};
