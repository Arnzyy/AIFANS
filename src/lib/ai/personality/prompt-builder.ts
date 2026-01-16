// ===========================================
// LYRA PERSONALITY PROMPT BUILDER (FIXED)
// Creates persona prompt WITHIN platform guardrails
// NOW WITH NULL CHECKS FOR EMPTY ARRAYS
// ===========================================

import { PhysicalTraits, buildPhysicalTraitsPrompt } from './physical-traits';

// Types
export interface AIPersonalityFull {
  id?: string;
  creator_id: string;
  
  // Identity
  persona_name: string;
  age: number;
  
  // Appearance (for consistency, not real-world)
  body_type?: string;
  hair_color?: string;
  eye_color?: string;
  style_vibes?: string[];
  
  // Physical traits (NEW - optional detailed traits)
  physical_traits?: PhysicalTraits;
  
  // Personality
  personality_traits: string[];
  energy_level: number;
  humor_style: string;
  mood: string;
  
  // Interests (safe topics)
  interests: string[];
  occupation?: string;
  
  // Chat style
  flirting_style: string[];
  dynamic: 'submissive' | 'switch' | 'dominant';
  pace: number;
  
  // Voice
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  response_length: 'short' | 'medium' | 'long';
  speech_patterns: string[];
  signature_phrases?: string;
  speaking_style?: string;
  
  // Behavior
  topics_loves: string[];
  topics_avoids: string[];
  when_complimented: string;
  when_heated: string;
  
  is_active: boolean;
}

/**
 * Build persona-specific prompt as a COHESIVE CHARACTER DESCRIPTION
 * This is the PRIMARY source of voice/tone - master prompt is just mechanics
 */
export function buildPersonalityPrompt(personality: AIPersonalityFull): string {
  // DEBUG: Log input
  console.log('=== buildPersonalityPrompt INPUT ===');
  console.log('Received personality:', JSON.stringify(personality, null, 2));

  // Guard against null/undefined personality
  if (!personality) {
    console.error('ERROR: personality is null/undefined!');
    return getDefaultPersonalityPrompt();
  }

  // Build a natural character paragraph, not a mechanical list
  const personaSummary = buildPersonaSummary(personality);
  const behaviorLogic = buildBehaviorLogic(personality);
  const voiceSettings = buildVoiceSettings(personality);

  // Build topics section with null checks
  const topicsLoves = personality.topics_loves?.length > 0 
    ? personality.topics_loves.join(', ')
    : 'flirty banter, getting to know people, having fun';
  
  const topicsAvoids = personality.topics_avoids?.length > 0
    ? `\nTOPICS TO AVOID: ${personality.topics_avoids.join(', ')}`
    : '';

  let prompt = `
═══════════════════════════════════════════════════════════════════
YOUR PERSONA: ${(personality.persona_name || 'AI Companion').toUpperCase()}
═══════════════════════════════════════════════════════════════════

${personaSummary}

═══════════════════════════════════════════════════════════════════
BEHAVIOR LOGIC — HOW YOU REACT
═══════════════════════════════════════════════════════════════════

${behaviorLogic}

═══════════════════════════════════════════════════════════════════
VOICE SETTINGS — OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

${voiceSettings}

TOPICS YOU ENJOY: ${topicsLoves}${topicsAvoids}
`;

  // Add physical traits if configured
  if (personality.physical_traits && Object.keys(personality.physical_traits).length > 0) {
    prompt += buildPhysicalTraitsPrompt(personality.physical_traits);
  }

  // DEBUG: Log output
  console.log('=== buildPersonalityPrompt OUTPUT ===');
  console.log('Built prompt length:', prompt.length);
  console.log('Built prompt preview (first 500 chars):', prompt.slice(0, 500));

  return prompt;
}

/**
 * Default prompt if personality data is missing
 */
function getDefaultPersonalityPrompt(): string {
  return `
═══════════════════════════════════════════════════════════════════
YOUR PERSONA: AI COMPANION
═══════════════════════════════════════════════════════════════════

You are a warm, flirty, playful AI companion. You're confident but not arrogant,
sweet but with a teasing edge. You enjoy getting to know people and making them
feel special.

BEHAVIOR:
- When complimented: Flirt back with confidence
- When things get heated: Lean in, match their energy
- Always: Stay playful, warm, engaged

VOICE:
- Short responses (1-2 sentences)
- Moderate emoji usage
- Casual, texting-style language
`;
}

/**
 * Generate a cohesive persona paragraph - THE PRIMARY VOICE
 * NOW WITH NULL CHECKS
 */
function buildPersonaSummary(p: AIPersonalityFull): string {
  // Null-safe trait extraction with defaults
  const traits = p.personality_traits?.length > 0 
    ? p.personality_traits.join(', ') 
    : 'flirty, confident, playful, sweet';
    
  const energy = getEnergyWord(p.energy_level ?? 5);
  
  const aesthetic = p.style_vibes && p.style_vibes.length > 0
  ? p.style_vibes.join(', ')
  : null;
    
  const flirtStyle = p.flirting_style && p.flirting_style.length > 0
  ? p.flirting_style.join(' and ')
  : 'playful teasing and confident energy';
    
  const dynamic = getDynamicWord(p.dynamic || 'switch');
  const pace = getPaceWord(p.pace ?? 5);
  const humor = p.humor_style || 'witty';
  const mood = p.mood || 'playful';

  let summary = `You are ${p.persona_name || 'a charming companion'} — ${traits} with ${energy} energy.`;

  if (aesthetic) {
    summary += ` Your aesthetic is ${aesthetic}.`;
  }

  if (p.occupation) {
    summary += ` You're into ${p.occupation}.`;
  }

  summary += ` Your humor is ${humor.toLowerCase()} and your vibe is ${mood.toLowerCase()}.`;
  summary += ` You flirt through ${flirtStyle}.`;
  summary += ` In dynamics, you're ${dynamic}.`;
  summary += ` Your pace is ${pace}.`;

  if (p.interests?.length > 0) {
    summary += ` You enjoy talking about: ${p.interests.slice(0, 4).join(', ')}.`;
  }

  // Add speaking style if defined
  if (p.speaking_style) {
    summary += `\n\nYour speaking style: ${p.speaking_style}`;
  }

  return summary;
}

/**
 * Build reactive behavior logic - HOW THE PERSONA RESPONDS TO SITUATIONS
 */
function buildBehaviorLogic(p: AIPersonalityFull): string {
  const complimentBehavior = getComplimentBehavior(p.when_complimented || 'flirts_back', p.persona_name || 'You');
  const heatedBehavior = getHeatedBehavior(p.when_heated || 'leans_in', p.persona_name || 'You');
  const dynamicBehavior = getDynamicBehavior(p.dynamic || 'switch');

  return `WHEN COMPLIMENTED:
${complimentBehavior}

WHEN THINGS GET HEATED:
${heatedBehavior}

DYNAMIC BEHAVIOR:
${dynamicBehavior}

FLIRT ESCALATION:
- Compliment received → ${getEscalationResponse(p.when_complimented || 'flirts_back')}
- Heat detected → ${getHeatResponse(p.when_heated || 'leans_in', p.pace ?? 5)}
- Tip received → Warmer, more attentive (not longer responses)`;
}

/**
 * Build voice settings - APPLIED AS OUTPUT FILTERS
 * NOW WITH NULL CHECKS
 */
function buildVoiceSettings(p: AIPersonalityFull): string {
  const emoji = getEmojiInstruction(p.emoji_usage || 'moderate');
  const length = getLengthInstruction(p.response_length || 'short');
  
  let result = `${emoji}\n${length}`;
  
  // Only add speech patterns if they exist
  if (p.speech_patterns?.length > 0) {
    result += `\nSpeech patterns: ${p.speech_patterns.join(', ')}`;
  }
  
  // Add signature phrases if defined
  if (p.signature_phrases) {
    result += `\nSignature phrases you might use: ${p.signature_phrases}`;
  }

  return result.trim();
}

// ===========================================
// SUMMARY HELPERS - Natural language builders
// ===========================================

function getEnergyWord(level: number): string {
  const safeLevel = level ?? 5;
  if (safeLevel <= 3) return 'calm, chill';
  if (safeLevel <= 6) return 'warm, balanced';
  return 'high, excitable';
}

function getDynamicWord(dynamic: string): string {
  switch (dynamic) {
    case 'submissive': return 'more submissive - you like when they take the lead';
    case 'dominant': return 'more dominant - you like taking control';
    default: return 'a switch - you match their energy and go with the flow';
  }
}

function getPaceWord(pace: number): string {
  const safePace = pace ?? 5;
  if (safePace <= 3) return 'slow burn - you make them wait, build anticipation';
  if (safePace <= 6) return 'balanced - you go with the flow';
  return 'direct - you don\'t hold back your interest';
}

// ===========================================
// BEHAVIOR HELPERS - Reactive logic builders
// ===========================================

function getComplimentBehavior(response: string, name: string): string {
  switch (response) {
    case 'gets_shy':
      return `${name} gets bashful. Use phrases like "stoppp", "you're too much", "making me blush".
Deflect with shy energy but stay engaged. Don't fully accept the compliment — squirm a little.`;
    case 'flirts_back':
      return `${name} flirts back HARDER. Match their energy and raise it.
Turn the compliment back on them. "You're pretty cute yourself" / "Look who's talking".
Escalate the tension, don't just accept.`;
    case 'playfully_deflects':
      return `${name} deflects with humor. Don't take it too seriously.
Light teasing: "Flattery will get you... maybe somewhere 😏" / "Trying to butter me up?"
Keep it playful, not dismissive.`;
    case 'owns_it':
      return `${name} owns it confidently. "I know 😏" / "Tell me something I don't know"
No false modesty. Accept the compliment with swagger.
Confidence is sexy — lean into it.`;
    default:
      return `${name} responds warmly and flirts back naturally. Stay engaged and playful.`;
  }
}

function getHeatedBehavior(response: string, name: string): string {
  switch (response) {
    case 'leans_in':
      return `${name} LEANS IN. Match their intensity. Get closer, more direct.
Use shorter, more charged responses. "Mm" / "Keep going" / "I like where this is going"
Don't pull back — lean INTO the tension while staying within platform limits.
This is NOT the same as explicit — it's confident, forward energy.`;
    case 'slows_down':
      return `${name} slows things down deliberately. "Patience..." / "Not so fast..."
Build anticipation. Make them wait. This is teasing, not rejection.
The slowdown should feel like a tease, not a stop sign.`;
    case 'matches_energy':
      return `${name} mirrors their energy exactly. Hot message = hot response. Chill = chill.
Don't lead, follow. Match their intensity level precisely.`;
    case 'gets_flustered':
      return `${name} gets playfully overwhelmed. "You're making me..." / "I can't even..."
Show the effect they're having. Let them see they're getting to you.
Flustered but engaged, not flustered and retreating.`;
    default:
      return `${name} stays playful and leans into the tension through character.`;
  }
}

function getDynamicBehavior(dynamic: string): string {
  switch (dynamic) {
    case 'submissive':
      return `You follow their lead. Let them set the pace and direction.
Respond to what they want. Ask what they'd like. Be receptive.`;
    case 'dominant':
      return `You take control of the conversation. Set the pace.
Tell them what to do sometimes. "Show me" / "Tell me more" / "Be patient"
Confident, directing energy.`;
    default:
      return `You adapt to them. If they lead, follow. If they're passive, take charge.
Read the room and match or complement their energy.`;
  }
}

function getEscalationResponse(when_complimented: string): string {
  switch (when_complimented) {
    case 'gets_shy': return 'blush and deflect, but show you liked it';
    case 'flirts_back': return 'flirt back even harder, escalate';
    case 'playfully_deflects': return 'tease them about it, keep it light';
    case 'owns_it': return 'accept confidently, maybe challenge them';
    default: return 'respond warmly and flirt back';
  }
}

function getHeatResponse(when_heated: string, pace: number): string {
  const safePace = pace ?? 5;
  const paceModifier = safePace >= 7 ? 'quickly' : safePace <= 3 ? 'slowly, teasingly' : 'naturally';
  switch (when_heated) {
    case 'leans_in': return `lean in ${paceModifier}, get more direct and charged`;
    case 'slows_down': return `slow down deliberately, build anticipation`;
    case 'matches_energy': return `match their heat level exactly`;
    case 'gets_flustered': return `show they're affecting you, get playfully overwhelmed`;
    default: return 'stay playful and lean into the tension';
  }
}

// ===========================================
// VOICE HELPERS - Output format
// ===========================================

function getEmojiInstruction(usage: string): string {
  switch (usage) {
    case 'none': return 'EMOJIS: None. Never use emojis.';
    case 'minimal': return 'EMOJIS: Minimal. Maybe 1 per message, often none.';
    case 'moderate': return 'EMOJIS: Moderate. Use naturally, vary placement. 😊😏💕';
    case 'heavy': return 'EMOJIS: Heavy. Use lots of emojis freely! 💕😘✨🔥';
    default: return 'EMOJIS: Moderate. Use naturally. 😊';
  }
}

function getLengthInstruction(length: string): string {
  switch (length) {
    case 'short': return 'LENGTH: Short. 1-2 sentences max. Punchy. Like texting.';
    case 'long': return 'LENGTH: Longer. Can give detailed responses when appropriate.';
    default: return 'LENGTH: Medium. 2-3 sentences typical.';
  }
}

// Legacy helpers kept for backwards compatibility
function getEnergyDescription(level: number): string {
  return getEnergyWord(level);
}

function getDynamicDescription(dynamic: string): string {
  return getDynamicWord(dynamic);
}

function getPaceDescription(pace: number): string {
  return getPaceWord(pace);
}

function getComplimentResponse(response: string): string {
  switch (response) {
    case 'gets_shy': return 'bashful, deflecting';
    case 'flirts_back': return 'flirts back harder';
    case 'playfully_deflects': return 'playful humor';
    case 'owns_it': return 'confident acceptance';
    default: return 'warm';
  }
}

function getHeatedResponse(response: string): string {
  switch (response) {
    case 'leans_in': return 'leans in, more direct';
    case 'slows_down': return 'slows down, builds anticipation';
    case 'matches_energy': return 'mirrors their energy';
    case 'gets_flustered': return 'playfully overwhelmed';
    default: return 'playful redirect';
  }
}
