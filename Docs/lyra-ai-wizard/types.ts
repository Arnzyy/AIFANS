// ===========================================
// LYRA AI PERSONALITY TYPES
// ===========================================

export interface AIPersonalityFull {
  id?: string;
  creator_id: string;
  
  // Step 1: Identity & Appearance
  persona_name: string;
  age: number;
  height_cm: number;
  body_type: 'petite' | 'slim' | 'athletic' | 'curvy' | 'tall';
  hair_color: string;
  hair_style: string;
  eye_color: string;
  skin_tone: 'fair' | 'olive' | 'tan' | 'deep';
  style_vibes: string[];
  distinguishing_features?: string;
  
  // Step 2: Personality Core
  personality_traits: string[];
  energy_level: number; // 1-10
  humor_style: 'witty' | 'sarcastic' | 'silly' | 'dry' | 'dirty';
  intelligence_vibe: 'street_smart' | 'book_smart' | 'ditzy_cute' | 'wise';
  mood: 'happy' | 'moody_complex' | 'calm_zen';
  
  // Step 3: Background & Interests
  backstory?: string;
  occupation: string;
  interests: string[];
  music_taste: string[];
  guilty_pleasures?: string;
  
  // Step 4: Romantic & Intimate Style
  flirting_style: string[];
  dynamic: 'submissive' | 'switch' | 'dominant';
  attracted_to: string[];
  love_language: 'words' | 'attention' | 'affection' | 'devotion';
  pace: number; // 1-10 (slow tease to fast intense)
  vibe_creates: 'romantic_fantasy' | 'playful_fun' | 'intense_passion' | 'mysterious_allure' | 'comfort_warmth';
  turn_ons: string[]; // Compliant vibe-based options
  
  // Step 5: Voice & Speech
  vocabulary_level: number; // 1-10
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  response_length: 'short' | 'medium' | 'long';
  speech_patterns: string[];
  accent_flavor: string;
  signature_phrases?: string;
  
  // Step 6: Conversation Behavior
  topics_loves: string[];
  topics_avoids: string[];
  when_complimented: 'gets_shy' | 'flirts_back' | 'playfully_deflects' | 'owns_it';
  when_heated: 'leans_in' | 'slows_down' | 'matches_energy' | 'gets_flustered';
  pet_peeves?: string;
  
  // Meta
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Wizard step data
export interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Identity', subtitle: 'Who is she?', icon: '👤' },
  { id: 2, title: 'Personality', subtitle: "What's she like?", icon: '✨' },
  { id: 3, title: 'Background', subtitle: "What's her story?", icon: '📖' },
  { id: 4, title: 'Romantic Style', subtitle: 'How does she connect?', icon: '💕' },
  { id: 5, title: 'Voice', subtitle: 'How does she talk?', icon: '💬' },
  { id: 6, title: 'Behavior', subtitle: 'How does she handle things?', icon: '🎭' },
  { id: 7, title: 'Preview', subtitle: 'See her in action', icon: '🎬' },
];
