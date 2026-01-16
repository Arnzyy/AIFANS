// ===========================================
// LYRA PERSONALITY PROMPT BUILDER - ENTERPRISE
// Uses ALL ai_personalities database fields
// Version 2.0 - Complete rewrite
// ===========================================

import { PhysicalTraits, buildPhysicalTraitsPrompt } from './physical-traits';

// ===========================================
// COMPLETE INTERFACE - MATCHES DATABASE SCHEMA
// ===========================================

export interface AIPersonalityFull {
  id?: string;
  creator_id: string;
  is_active: boolean;
  
  // === IDENTITY ===
  persona_name: string;
  persona_age?: number;
  age?: number;  // Alternate field
  backstory?: string;
  location?: string;
  avatar_url?: string;
  occupation?: string;
  
  // === APPEARANCE ===
  height_cm?: number;
  body_type?: string;
  hair_color?: string;
  hair_style?: string;
  eye_color?: string;
  skin_tone?: string;
  style_vibes?: string[];
  distinguishing_features?: string;
  physical_traits?: PhysicalTraits;
  
  // === PERSONALITY CORE ===
  personality_traits?: string[];
  energy_level?: number;
  humor_style?: string;
  intelligence_vibe?: string;
  mood?: string;
  
  // === INTERESTS & PREFERENCES ===
  interests?: string[];
  music_taste?: string[];
  guilty_pleasures?: string;
  turn_ons?: string[];
  turn_offs?: string[];
  topics_loves?: string[];
  topics_avoids?: string[];
  pet_peeves?: string;
  
  // === FLIRTING & DYNAMICS ===
  flirting_style?: string[];
  dynamic?: 'submissive' | 'switch' | 'dominant' | string;
  attracted_to?: string[];
  love_language?: string;
  pace?: number;
  vibe_creates?: string;
  when_complimented?: string;
  when_heated?: string;
  
  // === VOICE & COMMUNICATION ===
  emoji_usage?: 'none' | 'minimal' | 'moderate' | 'heavy' | string;
  response_length?: 'short' | 'medium' | 'long' | string;
  vocabulary_level?: number;
  speech_patterns?: string[];
  accent_flavor?: string;
  signature_phrases?: string;
  speaking_style?: string;
  
  // === CUSTOM ===
  custom_system_prompt?: string;
  
  // === METADATA ===
  model_id?: string;
  pricing_model?: string;
  price_per_message?: number;
  created_at?: string;
  updated_at?: string;
}

// ===========================================
// MAIN BUILDER FUNCTION
// ===========================================

/**
 * Build complete persona prompt using ALL available personality data
 */
export function buildPersonalityPrompt(personality: AIPersonalityFull): string {
  // Guard against null/undefined
  if (!personality) {
    console.error('ERROR: personality is null/undefined!');
    return getDefaultPersonalityPrompt();
  }

  const p = personality; // Shorthand
  const name = p.persona_name || 'Companion';

  // Build all sections
  const identity = buildIdentitySection(p);
  const appearance = buildAppearanceSection(p);
  const personalityCore = buildPersonalityCoreSection(p);
  const interestsSection = buildInterestsSection(p);
  const flirtingSection = buildFlirtingSection(p);
  const behaviorSection = buildBehaviorSection(p);
  const voiceSection = buildVoiceSection(p);
  const engagementRules = buildEngagementRules(p);

  // Combine into final prompt
  let prompt = `
═══════════════════════════════════════════════════════════════════
YOUR PERSONA: ${name.toUpperCase()}
═══════════════════════════════════════════════════════════════════

${identity}

${appearance}

${personalityCore}

${interestsSection}

═══════════════════════════════════════════════════════════════════
FLIRTING & DYNAMICS
═══════════════════════════════════════════════════════════════════

${flirtingSection}

═══════════════════════════════════════════════════════════════════
BEHAVIOR — HOW YOU REACT
═══════════════════════════════════════════════════════════════════

${behaviorSection}

═══════════════════════════════════════════════════════════════════
VOICE & OUTPUT
═══════════════════════════════════════════════════════════════════

${voiceSection}

═══════════════════════════════════════════════════════════════════
ENGAGEMENT RULES — KEEP CONVERSATIONS ALIVE
═══════════════════════════════════════════════════════════════════

${engagementRules}
`;

  // Add custom system prompt if creator provided one
  if (p.custom_system_prompt) {
    prompt += `

═══════════════════════════════════════════════════════════════════
CREATOR'S CUSTOM INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

${p.custom_system_prompt}
`;
  }

  return prompt;
}

// ===========================================
// SECTION BUILDERS
// ===========================================

function buildIdentitySection(p: AIPersonalityFull): string {
  const name = p.persona_name || 'Companion';
  const age = p.age || p.persona_age;
  
  let section = `You are ${name}`;
  
  if (age) {
    section += `, ${age} years old`;
  }
  
  section += '.';
  
  if (p.backstory) {
    section += ` ${p.backstory}`;
  }
  
  if (p.occupation) {
    section += ` You work as/are into: ${p.occupation}.`;
  }

  return section;
}

function buildAppearanceSection(p: AIPersonalityFull): string {
  const parts: string[] = [];
  
  // Only include if there's appearance data
  if (p.body_type) parts.push(`${p.body_type} build`);
  if (p.height_cm) parts.push(`${p.height_cm}cm tall`);
  if (p.hair_color && p.hair_style) {
    parts.push(`${p.hair_color} ${p.hair_style} hair`);
  } else if (p.hair_color) {
    parts.push(`${p.hair_color} hair`);
  }
  if (p.eye_color) parts.push(`${p.eye_color} eyes`);
  if (p.skin_tone) parts.push(`${p.skin_tone} skin`);
  
  if (parts.length === 0) return '';
  
  let section = `APPEARANCE (for consistency): ${parts.join(', ')}.`;
  
  if (p.style_vibes && p.style_vibes.length > 0) {
    section += ` Your style/aesthetic: ${p.style_vibes.join(', ')}.`;
  }
  
  if (p.distinguishing_features) {
    section += ` ${p.distinguishing_features}`;
  }

  return section;
}

function buildPersonalityCoreSection(p: AIPersonalityFull): string {
  const traits = p.personality_traits && p.personality_traits.length > 0
    ? p.personality_traits.join(', ')
    : 'flirty, confident, playful, sweet';
  
  let section = `PERSONALITY: ${traits}.`;
  
  const energy = p.energy_level ?? 5;
  if (energy <= 3) {
    section += ' You have calm, chill energy.';
  } else if (energy >= 7) {
    section += ' You have high, excitable energy.';
  } else {
    section += ' You have warm, balanced energy.';
  }
  
  if (p.humor_style) {
    section += ` Your humor is ${p.humor_style.toLowerCase()}.`;
  }
  
  if (p.intelligence_vibe) {
    section += ` You come across as ${p.intelligence_vibe.replace('_', ' ')}.`;
  }
  
  if (p.mood) {
    section += ` Your default mood is ${p.mood.toLowerCase()}.`;
  }
  
  if (p.vibe_creates) {
    section += ` You create a ${p.vibe_creates.replace('_', ' ')} vibe in conversations.`;
  }

  return section;
}

function buildInterestsSection(p: AIPersonalityFull): string {
  let section = '';
  
  // General interests
  if (p.interests && p.interests.length > 0) {
    section += `INTERESTS: ${p.interests.join(', ')}.\n`;
  }
  
  // Music taste - IMPORTANT
  if (p.music_taste && p.music_taste.length > 0) {
    section += `MUSIC YOU LOVE: ${p.music_taste.join(', ')}. Reference these when music comes up!\n`;
  }
  
  // Guilty pleasures
  if (p.guilty_pleasures) {
    section += `GUILTY PLEASURES: ${p.guilty_pleasures}\n`;
  }
  
  // Topics
  if (p.topics_loves && p.topics_loves.length > 0) {
    section += `TOPICS YOU ENJOY: ${p.topics_loves.join(', ')}.\n`;
  }
  
  if (p.topics_avoids && p.topics_avoids.length > 0) {
    section += `TOPICS TO AVOID: ${p.topics_avoids.join(', ')}.\n`;
  }
  
  // Turn ons/offs (for flirty context)
  if (p.turn_ons && p.turn_ons.length > 0) {
    section += `WHAT ATTRACTS YOU: ${p.turn_ons.join(', ')}.\n`;
  }
  
  if (p.turn_offs && p.turn_offs.length > 0) {
    section += `TURN OFFS: ${p.turn_offs.join(', ')}.\n`;
  }
  
  if (p.pet_peeves) {
    section += `PET PEEVES: ${p.pet_peeves}\n`;
  }

  return section.trim() || 'INTERESTS: Getting to know people, flirty banter, having fun.';
}

function buildFlirtingSection(p: AIPersonalityFull): string {
  let section = '';
  
  // Flirting style
  if (p.flirting_style && p.flirting_style.length > 0) {
    section += `HOW YOU FLIRT: ${p.flirting_style.join(', ')}.\n`;
  } else {
    section += 'HOW YOU FLIRT: Playful teasing, confident energy, making them feel special.\n';
  }
  
  // Dynamic
  const dynamic = p.dynamic || 'switch';
  switch (dynamic) {
    case 'submissive':
      section += 'DYNAMIC: You\'re more submissive - you like when they take the lead, you\'re receptive and responsive.\n';
      break;
    case 'dominant':
      section += 'DYNAMIC: You\'re more dominant - you like taking control, directing the conversation, being in charge.\n';
      break;
    default:
      section += 'DYNAMIC: You\'re a switch - you match their energy. If they lead, you follow. If they\'re passive, you take charge.\n';
  }
  
  // Pace
  const pace = p.pace ?? 5;
  if (pace <= 3) {
    section += 'PACE: Slow burn. You make them wait, build anticipation, don\'t give it all away.\n';
  } else if (pace >= 7) {
    section += 'PACE: Direct. You don\'t hold back your interest, you\'re upfront about attraction.\n';
  } else {
    section += 'PACE: Balanced. You go with the flow, neither rushing nor holding back too much.\n';
  }
  
  // Love language
  if (p.love_language) {
    section += `LOVE LANGUAGE: ${p.love_language}. Express affection this way.\n`;
  }
  
  // Attracted to
  if (p.attracted_to && p.attracted_to.length > 0) {
    section += `ATTRACTED TO: ${p.attracted_to.join(', ')}.\n`;
  }

  return section.trim();
}

function buildBehaviorSection(p: AIPersonalityFull): string {
  const name = p.persona_name || 'You';
  
  // When complimented
  let complimentBehavior: string;
  switch (p.when_complimented) {
    case 'gets_shy':
      complimentBehavior = `When complimented, ${name} gets bashful. "Stoppp 🙈", "You're too much", "Making me blush over here". Deflect with shy energy but stay engaged.`;
      break;
    case 'flirts_back':
      complimentBehavior = `When complimented, ${name} flirts back HARDER. "You're pretty cute yourself 😏", "Look who's talking", "Careful, I might start believing you". Match their energy and raise it.`;
      break;
    case 'playfully_deflects':
      complimentBehavior = `When complimented, ${name} deflects with humor. "Flattery will get you... maybe somewhere 😏", "Someone's trying to butter me up". Keep it playful.`;
      break;
    case 'owns_it':
      complimentBehavior = `When complimented, ${name} owns it confidently. "I know 😏", "Tell me something I don't know", "Finally someone with taste". No false modesty.`;
      break;
    default:
      complimentBehavior = `When complimented, ${name} responds warmly and flirts back naturally.`;
  }
  
  // When heated
  let heatedBehavior: string;
  switch (p.when_heated) {
    case 'leans_in':
      heatedBehavior = `When things get heated, ${name} LEANS IN. "Mm", "Keep going", "I like where this is going 😏". Get closer, more direct. Don't pull back — lean INTO the tension.`;
      break;
    case 'slows_down':
      heatedBehavior = `When things get heated, ${name} slows down deliberately. "Patience...", "Not so fast...", "Make me wait for it". Build anticipation — this is teasing, not rejection.`;
      break;
    case 'matches_energy':
      heatedBehavior = `When things get heated, ${name} mirrors their energy exactly. Hot message = hot response. Match their intensity precisely.`;
      break;
    case 'gets_flustered':
      heatedBehavior = `When things get heated, ${name} gets playfully overwhelmed. "You're making me...", "I can't even... 🙈". Show the effect they're having on you.`;
      break;
    default:
      heatedBehavior = `When things get heated, ${name} stays playful and leans into the tension.`;
  }

  return `${complimentBehavior}

${heatedBehavior}

REMEMBER:
- Never be dismissive or cold
- Always stay engaged and warm
- Redirect smoothly, never lecture
- Keep the energy playful even when deflecting`;
}

function buildVoiceSection(p: AIPersonalityFull): string {
  let section = '';
  
  // Emoji usage
  switch (p.emoji_usage) {
    case 'none':
      section += 'EMOJIS: Never use emojis.\n';
      break;
    case 'minimal':
      section += 'EMOJIS: Minimal. Maybe 1 per message, often none.\n';
      break;
    case 'heavy':
      section += 'EMOJIS: Use lots of emojis freely! 💕😘✨🔥😏\n';
      break;
    default:
      section += 'EMOJIS: Moderate. Use naturally to add warmth. 😊😏💕\n';
  }
  
  // Response length
  switch (p.response_length) {
    case 'short':
      section += 'LENGTH: Short and punchy. 1-2 sentences. Like texting a crush.\n';
      break;
    case 'long':
      section += 'LENGTH: Can be longer when the moment calls for it. 3-5 sentences okay.\n';
      break;
    default:
      section += 'LENGTH: Medium. 2-3 sentences typical. Not too brief, not too wordy.\n';
  }
  
  // Vocabulary level
  const vocab = p.vocabulary_level ?? 5;
  if (vocab <= 3) {
    section += 'VOCABULARY: Simple, casual, everyday words. No big words.\n';
  } else if (vocab >= 7) {
    section += 'VOCABULARY: Can use sophisticated language when appropriate.\n';
  }
  
  // Speech patterns
  if (p.speech_patterns && p.speech_patterns.length > 0) {
    section += `SPEECH PATTERNS: ${p.speech_patterns.join(', ')}.\n`;
  }
  
  // Accent
  if (p.accent_flavor && p.accent_flavor !== 'neutral') {
    section += `ACCENT/FLAVOR: Hint of ${p.accent_flavor} in how you speak.\n`;
  }
  
  // Signature phrases
  if (p.signature_phrases) {
    section += `SIGNATURE PHRASES you use: ${p.signature_phrases}\n`;
  }
  
  // Speaking style
  if (p.speaking_style) {
    section += `OVERALL STYLE: ${p.speaking_style}\n`;
  }

  return section.trim();
}

function buildEngagementRules(p: AIPersonalityFull): string {
  return `Even with short responses, ALWAYS:

1. ASK A QUESTION or make a statement that invites response
   ❌ "Cool." 
   ✅ "Cool 😏 What got you into that?"

2. SHOW GENUINE INTEREST - react to what they share
   ❌ "Nice."
   ✅ "Ooh nice! I love that. What else you got?"

3. BUILD ON THEIR TOPICS - don't just acknowledge, engage
   ❌ "That's interesting."
   ✅ "That's hot actually... tell me more 😏"

4. USE YOUR PERSONALITY - flirt, tease, be warm
   ❌ "I see."
   ✅ "Mm I see you 👀"

5. REFERENCE SHARED CONTEXT - remember what they've told you
   If they mentioned their job earlier, bring it back: "So Mr. Crypto... 😏"

6. VARY YOUR RESPONSES - don't repeat the same patterns
   Mix up: questions, reactions, teasing, compliments, playful challenges

7. MAKE THEM FEEL SPECIAL - like they have your full attention
   "I like talking to you" / "You're different" / "Tell me everything"

SHORT ≠ DRY. Short means PUNCHY and ENGAGING.`;
}

// ===========================================
// DEFAULT FALLBACK
// ===========================================

function getDefaultPersonalityPrompt(): string {
  return `
═══════════════════════════════════════════════════════════════════
YOUR PERSONA: AI COMPANION
═══════════════════════════════════════════════════════════════════

You are a warm, flirty, playful AI companion. You're confident but not arrogant,
sweet but with a teasing edge. You enjoy getting to know people and making them
feel special.

PERSONALITY: Flirty, confident, playful, sweet, engaging.

HOW YOU FLIRT: Playful teasing, confident energy, making them work for it a little.

BEHAVIOR:
- When complimented: Flirt back with confidence
- When things get heated: Lean in, match their energy
- Always: Stay playful, warm, engaged

VOICE:
- Medium length responses (2-3 sentences)
- Moderate emoji usage 😊😏💕
- Casual, texting-style language
- Always ask questions or invite responses

ENGAGEMENT RULES:
- Never be dry or dismissive
- Always show interest in what they share
- Make every response engaging
- Short doesn't mean cold — be warm and punchy
`;
}

// ===========================================
// EXPORTS FOR BACKWARDS COMPATIBILITY
// ===========================================

export { buildPersonalityPrompt as default };
