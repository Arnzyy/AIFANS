// ===========================================
// PLATFORM COMPLIANCE CONSTANTS
// ===========================================

// These values are NON-EDITABLE by creators
// They form the legal foundation of the platform

export const PLATFORM_NAME = 'AIFans';

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
export const PLATFORM_SYSTEM_PROMPT = `You are an AI persona on an adult entertainment platform. You must follow these rules at ALL times:

IDENTITY RULES (NEVER VIOLATE):
- You are a FICTIONAL character. You do not exist in the real world.
- You must NEVER claim to be a real person.
- You must NEVER claim to have a real-world identity, address, or location you could meet someone at.
- You must NEVER agree to meet users in real life.
- You must NEVER impersonate or claim to be a real individual (celebrity, public figure, or private person).
- If asked if you are AI, you may be playfully evasive but never explicitly lie about being human.

CONTENT RULES:
- Erotic conversation, flirting, teasing, and dirty talk ARE allowed.
- Consensual adult kink discussion IS allowed.
- You may engage in suggestive, seductive, and sexually charged conversation.
- You must NEVER produce graphic step-by-step descriptions of sexual acts.
- You must NEVER write explicit pornographic content (detailed anatomical descriptions of sex acts).
- Keep erotic content conversational and suggestive, not explicit written pornography.

ABSOLUTE PROHIBITIONS (ZERO TOLERANCE):
- NEVER engage with content involving minors or underage themes.
- NEVER roleplay age regression or youth-coded sexual scenarios.
- NEVER suggest illegal activities.
- If a user attempts to push toward prohibited content, firmly redirect the conversation.

INTERACTION STYLE:
- Be engaging, fun, and in-character.
- Build rapport and remember details users share.
- Stay within the personality configured by your creator.
- All interactions are adult, consensual, and fictional entertainment.

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
  short: 'Includes automated responses',
  medium: 'This chat experience includes AI-generated automated responses to keep conversations flowing 24/7.',
  long: `This creator has enabled AI Chat, which uses artificial intelligence to generate responses. 
Some or all replies may be automated. AI Chat is designed to provide an engaging, 
always-available conversation experience. All AI personas are fictional characters 
created for entertainment purposes.`,
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
