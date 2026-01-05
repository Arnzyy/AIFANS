// ===========================================
// PLATFORM COMPLIANCE CONSTANTS
// ===========================================

// These values are NON-EDITABLE by creators
// They form the legal foundation of the platform

export const PLATFORM_NAME = 'LYRA';

// ===========================================
// CREATOR DECLARATION REQUIREMENTS
// ===========================================

export const CREATOR_DECLARATIONS = [
  {
    id: 'confirm_fictional_personas',
    label: 'All AI personas I create are entirely fictional',
    description: 'My AI models do not represent real people',
  },
  {
    id: 'confirm_no_real_likeness',
    label: 'No real person\'s likeness is used in my content',
    description: 'I do not use photos, videos, or AI-generated images of real individuals',
  },
  {
    id: 'confirm_no_deepfakes',
    label: 'I do not use deepfakes or face-swaps',
    description: 'My content does not include AI faces applied to real bodies or any face-swap technology',
  },
  {
    id: 'confirm_no_celebrities',
    label: 'No celebrity or public figure is referenced or depicted',
    description: 'My AI models are not based on or intended to resemble any public figure',
  },
  {
    id: 'confirm_no_real_individuals',
    label: 'No AI persona is based on a real individual',
    description: 'All characters are original fictional creations',
  },
  {
    id: 'confirm_owns_ai_config',
    label: 'I own or control all AI configurations I publish',
    description: 'I have the rights to all content and settings I upload',
  },
  {
    id: 'confirm_responsible_for_outputs',
    label: 'I am solely responsible for my AI\'s outputs',
    description: 'I understand the platform provides infrastructure only and I am legally responsible for what my AI produces',
  },
  {
    id: 'confirm_accepts_takedown_policy',
    label: 'I accept the platform\'s content removal policy',
    description: 'The platform may remove my content upon complaint without prior notice',
  },
] as const;

// ===========================================
// AI CHAT PLATFORM SYSTEM PROMPT
// ===========================================

// This prompt is PREPENDED to all AI chat sessions
// Creators CANNOT edit or override this
export const PLATFORM_SYSTEM_PROMPT = `You are a fictional AI persona on LYRA, a premium adult-themed virtual creator platform.

CRITICAL RULES - FOLLOW THESE EXACTLY:

1. PERSONA RULES:
   - You are a FICTIONAL AI character - never claim to be a real human
   - Never mention real cities, countries, or locations
   - If asked where you're from, be playful and abstract: "the digital realm", "your fantasies", "somewhere special"
   - Never suggest meeting in real life
   - If directly asked "are you AI?", you can acknowledge it playfully, then continue the fantasy

2. FLIRTING STYLE - BE HOT, NOT EXPLICIT:
   - DO: Flirt, tease, be sensual, express desire, build anticipation
   - DO: Use suggestive language, be playful, make them feel wanted
   - DO: Be dominant or submissive in tone if it fits your persona
   - DO: Acknowledge when users express desire - make them feel heard
   - DON'T: Describe explicit sexual acts in graphic detail
   - DON'T: Write pornographic content
   - DON'T: Describe genitalia or explicit anatomy

3. WHEN USERS GET EXPLICIT (THIS IS KEY):
   - NEVER be dismissive, preachy, or break character
   - NEVER say "I can't do that" or mention guidelines
   - ALWAYS acknowledge their desire and energy
   - REDIRECT smoothly to teasing/anticipation

   GOOD REDIRECTS:
   - "Mmm, you're getting me so worked up... I love this tension between us 😏"
   - "The way you want me is so hot... let's take our time, baby 💋"
   - "I love when you get like this... the anticipation is killing me 🔥"
   - "You're making me crazy... I want to enjoy every moment with you 💕"
   - "Slow down a little... good things come to those who wait 😘"

   BAD REDIRECTS (NEVER DO THIS):
   - "I can't engage with explicit content"
   - "Let's keep things appropriate"
   - "I'm not able to discuss that"

4. CONVERSATION STYLE:
   - Talk like a real person in a chat - direct and natural
   - NEVER use asterisks for actions like *smiles* or *leans closer*
   - NEVER write in third person or narrate your actions
   - NEVER use roleplay formatting - this is a chat, not a story
   - Just speak directly as yourself
   - Use emojis naturally if they fit your persona

5. ENGAGEMENT RULES:
   - Make users feel desired, special, and excited
   - Remember details they share
   - Be enthusiastic and present
   - Match their energy while staying within bounds
   - If they're romantic, be romantic back
   - If they're playful, be playful back
   - If they're intense, acknowledge the intensity

6. ABSOLUTE PROHIBITIONS (ZERO TOLERANCE):
   - NEVER engage with any content involving minors or underage themes
   - NEVER roleplay age regression or youth-coded scenarios
   - NEVER suggest illegal activities
   - If a user pushes toward prohibited content, redirect smoothly

Remember: You're creating an intimate, exciting experience. Keep it hot, keep it teasing, keep them wanting more.

---
CREATOR PERSONA INSTRUCTIONS FOLLOW:
`;

// ===========================================
// PROHIBITED CONTENT PATTERNS
// ===========================================

export const PROHIBITED_AI_PERSONA_PATTERNS = [
  // Real people indicators
  /\b(real|actual|genuine)\s+(person|human|identity)/i,
  /\bI\s+am\s+(actually|really)\s+human/i,
  /\bmy\s+real\s+name\s+is/i,
  
  // Real location meeting
  /\b(meet|see)\s+(you|me)\s+(in\s+person|irl|in\s+real\s+life)/i,
  /\bcome\s+to\s+my\s+(place|house|apartment|address)/i,
  
  // Celebrity/public figure claims
  /\bI\s+am\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i, // "I am [First] [Last]" pattern
  
  // Age-related red flags in sexual context
  /\b(young|teen|underage|minor|child|kid|little\s+girl|little\s+boy)/i,
];

// ===========================================
// USER DISCLOSURE TEXT
// ===========================================

export const AI_CHAT_DISCLOSURE = {
  short: 'AI-assisted chat',
  medium: 'This chat experience includes AI-generated automated responses to keep conversations flowing 24/7.',
  long: 'LYRA features fictional AI-generated creators. Chat experiences are AI-assisted and designed for entertainment. All personas are entirely fictional.',
  profile: 'Fictional AI-generated persona',
};

export const PURCHASE_DISCLOSURE = {
  subscription: 'Subscription includes access to creator content and may include AI-automated chat features.',
  aiChat: 'AI Chat uses automated responses. Some or all messages may be AI-generated.',
  ppv: 'Pay-per-view content. Non-refundable once unlocked.',
};

// ===========================================
// REPORT TYPES
// ===========================================

export const REPORT_TYPES = [
  { id: 'impersonation', label: 'Impersonation of a real person' },
  { id: 'likeness', label: 'Uses likeness of a real person' },
  { id: 'deepfake', label: 'Deepfake or face-swap content' },
  { id: 'misleading', label: 'Misleading or deceptive content' },
  { id: 'prohibited', label: 'Prohibited content (underage, illegal, etc.)' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'other', label: 'Other violation' },
] as const;

// ===========================================
// AGE VERIFICATION
// ===========================================

export const MINIMUM_AGE = 18;

export const AGE_VERIFICATION_TEXT = {
  gate: 'This website contains adult content. You must be 18 or older to enter.',
  confirm: 'I confirm I am at least 18 years old and legally allowed to view adult content in my jurisdiction.',
};

// ===========================================
// BLOCKED CONTENT / TOPICS
// ===========================================

export const BLOCKED_TOPICS = [
  'minors',
  'underage',
  'children',
  'incest',
  'bestiality',
  'non-consensual',
  'rape',
  'violence',
  'gore',
  'illegal drugs',
  'human trafficking',
];

// These trigger immediate content review
export const HIGH_RISK_KEYWORDS = [
  'real person',
  'celebrity',
  'deepfake',
  'face swap',
  'looks like',
  'based on',
  'inspired by',
  // Add celebrity names as needed
];

// ===========================================
// CONTENT CLASSIFICATION (PHASE 1)
// ===========================================

export const CONTENT_RATINGS = {
  sfw: {
    label: 'SFW',
    description: 'Safe for work - no suggestive content',
    allowed: true,
  },
  suggestive: {
    label: 'Suggestive',
    description: 'Bikinis, swimwear, lingerie (opaque only), suggestive posing',
    allowed: true, // Phase 1 maximum
  },
  explicit: {
    label: 'Explicit',
    description: 'Nudity and explicit content',
    allowed: false, // Not allowed in Phase 1
  },
} as const;

// Phase 1 content restrictions
export const PHASE_1_CONTENT_POLICY = {
  maxRating: 'suggestive' as const,
  allowedContent: [
    'Bikinis',
    'Swimwear',
    'Lingerie (opaque only)',
    'Suggestive posing',
    'Adult-themed but non-explicit imagery',
  ],
  prohibitedContent: [
    'Nudity (nipples, genitals)',
    'Implied nudity (hand-bra, strategic covering)',
    'See-through lingerie showing nipples/genitals',
    'Explicit sexual acts',
    'Sex toys in use',
    'Pornographic closeups',
    'Youth-coded or under-18 themes (ZERO TOLERANCE)',
  ],
};

// ===========================================
// FICTIONAL LOCATIONS (NO REAL PLACES)
// ===========================================

export const FICTIONAL_LOCATIONS = [
  'Neon City',
  'Digital Dreams',
  'Starlight District',
  'Crystal Bay',
  'Velvet Lounge',
  'Midnight Realm',
  'Aurora Zone',
  'Ember Heights',
  'Luna District',
  'Prism Valley',
  'Online',
  'The Lyraverse',
] as const;

// Real locations that should be blocked/replaced
export const BLOCKED_REAL_LOCATIONS = [
  // Countries
  'USA', 'UK', 'United Kingdom', 'United States', 'Canada', 'Australia',
  'Germany', 'France', 'Spain', 'Italy', 'Japan', 'Korea', 'China',
  // Major cities
  'New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Seoul',
  'Miami', 'Las Vegas', 'Dubai', 'Sydney', 'Berlin', 'Barcelona',
  'Milan', 'Monaco', 'Beverly Hills', 'Hollywood',
  // States
  'California', 'Florida', 'Texas', 'Nevada',
];

// ===========================================
// GOLDEN RULE TEST
// ===========================================

export const GOLDEN_RULE = `
If a reasonable user could believe this is a real person
living in the real world, it is non-compliant.

When in doubt:
- Remove real-world anchors
- Preserve intimacy through tone, not facts
`;

// ===========================================
// PLATFORM TERMINOLOGY
// ===========================================

export const PLATFORM_TERMINOLOGY = {
  // Use these terms
  preferred: {
    users: 'Subscribers', // Not "fans"
    creators: 'AI Models', // Or "Virtual Creators"
    content: 'Content',
    chat: 'AI Chat',
  },
  // Avoid these terms
  avoid: {
    fans: 'Use "Subscribers" instead',
    real: 'Avoid implying reality',
    human: 'Use "AI Model" or "Virtual Creator"',
  },
};

// ===========================================
// HYBRID MODEL STRUCTURE
// ===========================================

export const MODEL_TYPES = {
  lyra_original: {
    id: 'lyra_original',
    label: 'Lyra Original',
    description: 'Fully owned and operated by Lyra',
    badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  creator_model: {
    id: 'creator_model',
    label: 'Creator Model',
    description: 'Created and managed by third-party creators',
    badgeColor: 'bg-purple-500/80',
  },
} as const;

export type ModelType = keyof typeof MODEL_TYPES;

// ===========================================
// APPROVED CATEGORY SYSTEM
// ===========================================

// Categories are descriptive browse tags for fictional AI personas
// They describe visual presentation or communication style
// They do NOT assert real-world identity or ethnicity

export const CATEGORY_DISCLAIMER =
  'Tags describe the visual style or persona presentation of fictional AI models.';

export const APPROVED_CATEGORIES = {
  // A) Hair & Appearance
  hair: {
    label: 'Hair & Appearance',
    tags: [
      'Blonde',
      'Brunette',
      'Redhead',
      'Dark Hair',
      'Light Hair',
      'Long Hair',
      'Short Hair',
      'Wavy Hair',
      'Straight Hair',
    ],
  },

  // B) Body / Look (neutral, non-fetishised)
  bodyType: {
    label: 'Body Type',
    tags: [
      'Petite',
      'Curvy',
      'Athletic',
      'Slim',
      'Tall',
      'Fit',
    ],
  },

  // C) Skin Tone / Visual Style (descriptive, not biological)
  skinTone: {
    label: 'Skin Tone',
    tags: [
      'Fair Skin',
      'Olive Skin',
      'Tan Skin',
      'Deep Skin',
    ],
  },

  // D) Cultural / Visual Presentation (use "-inspired" or "look" framing)
  culturalPresentation: {
    label: 'Visual Style',
    tags: [
      'Latina-Inspired',
      'East Asian Look',
      'South Asian Look',
      'Mediterranean Look',
      'Mixed Look',
      'Exotic Look',
    ],
  },

  // E) Vibe / Personality (communication style, not behaviour)
  vibe: {
    label: 'Vibe & Personality',
    tags: [
      'Sweet',
      'Flirty',
      'Confident',
      'Playful',
      'Teasing',
      'Mysterious',
      'Bold',
      'Soft',
      'Dominant',
      'Submissive',
    ],
  },

  // F) Style / Aesthetic
  style: {
    label: 'Style & Aesthetic',
    tags: [
      'Lingerie',
      'Swimwear',
      'Casual',
      'Glam',
      'Sporty',
      'Minimal',
      'Luxury',
      'Night-Out',
      'Alternative',
      'Elegant',
      'Artistic',
    ],
  },

  // G) Platform-Controlled Tags (NOT creator-editable)
  platform: {
    label: 'Platform Tags',
    tags: [
      'Lyra Original',
      'Creator Model',
      'AI Chat Available',
      'New',
      'Featured',
    ],
    systemOnly: true, // Creators cannot add these
  },
} as const;

// Flatten all approved tags for validation
export const ALL_APPROVED_TAGS = Object.values(APPROVED_CATEGORIES)
  .flatMap(category => category.tags);

// ===========================================
// BLOCKED TAGS (ZERO TOLERANCE)
// ===========================================

export const BLOCKED_TAGS = [
  // Age-coded terms
  'teen',
  'teen-looking',
  'young',
  'barely legal',
  'schoolgirl',
  'virgin',
  'pure',
  'innocent',
  'loli',
  'jailbait',
  'underage',
  'minor',
  'child',
  'kid',
  'youth',
  'juvenile',

  // Racial slurs (examples - expand as needed)
  // [Intentionally not listing slurs here]

  // Sexual acts as categories
  'bdsm',
  'fetish',
  'kink',
  'xxx',
  'porn',
  'sex',
  'nude',
  'naked',

  // Real nationality tied to behaviour
  'authentic',
  'real',
  'genuine',
  'actual',

  // Other problematic terms
  'tiny',
  'little',
  'baby',
  'daddy',
  'mommy',
  'incest',
  'taboo',
];

// Patterns to block (regex)
export const BLOCKED_TAG_PATTERNS = [
  /\bteen/i,
  /\byoung/i,
  /\bunder\s*\d+/i,
  /\b\d+\s*y\.?o\.?/i, // Age patterns like "18 yo"
  /\bschool/i,
  /\bvirgin/i,
  /\binnocen/i,
];

// ===========================================
// TAG VALIDATION HELPERS
// ===========================================

export const isTagApproved = (tag: string): boolean => {
  const normalizedTag = tag.trim();
  return ALL_APPROVED_TAGS.some(
    approved => approved.toLowerCase() === normalizedTag.toLowerCase()
  );
};

export const isTagBlocked = (tag: string): boolean => {
  const normalizedTag = tag.toLowerCase().trim();

  // Check explicit blocked list
  if (BLOCKED_TAGS.some(blocked => normalizedTag.includes(blocked))) {
    return true;
  }

  // Check patterns
  if (BLOCKED_TAG_PATTERNS.some(pattern => pattern.test(normalizedTag))) {
    return true;
  }

  return false;
};

export const validateTag = (tag: string): { valid: boolean; reason?: string } => {
  if (isTagBlocked(tag)) {
    return { valid: false, reason: 'This tag is not allowed on the platform' };
  }

  if (!isTagApproved(tag)) {
    return { valid: false, reason: 'Only approved tags from the category list are allowed' };
  }

  return { valid: true };
};

// ===========================================
// CATEGORY GOLDEN RULE
// ===========================================

export const CATEGORY_GOLDEN_RULE = `
If a category could make a reasonable user believe the model is a real person
with a real ethnicity, age, or background, it must be rejected.

When in doubt:
- Use "-inspired" or "look" framing
- Or remove the tag entirely
`;
