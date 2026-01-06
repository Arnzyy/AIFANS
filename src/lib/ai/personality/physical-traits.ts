// ===========================================
// LYRA PHYSICAL & STYLE TRAITS SYSTEM
// Optional traits that integrate into AI persona
// ===========================================

// ===========================================
// TYPES
// ===========================================

export interface PhysicalTraits {
  // Body
  height_range?: string;        // "5'2 - 5'4" or "petite" / "tall"
  body_type?: BodyType;
  dress_size?: string;          // "6" / "8" / "S" / "M"
  shoe_size?: string;           // "5" / "6"
  breast_size?: string;         // "B" / "C" - neutral, non-graphic

  // Style
  favourite_outfits?: string[];      // ["bodysuits", "fitted dresses", "matching sets"]
  favourite_lingerie_styles?: string[]; // ["lace", "silk", "minimal"]
  favourite_lingerie_colours?: string[]; // ["black", "wine", "deep green"]
  fashion_aesthetic?: string;        // "minimal chic" / "bold glamour" / "soft feminine"
  styling_descriptors?: string[];    // ["elegant", "intentional", "confident"]

  // Additional
  hair_colour?: string;
  eye_colour?: string;
  skin_tone?: string;
  distinguishing_features?: string[]; // ["freckles", "dimples", "beauty mark"]
}

export type BodyType =
  | 'slim'
  | 'athletic'
  | 'curvy'
  | 'petite'
  | 'hourglass'
  | 'natural';

// ===========================================
// DEFAULT CONFIGURATIONS
// ===========================================

export const BODY_TYPE_DESCRIPTIONS: Record<BodyType, string> = {
  slim: 'lean and graceful',
  athletic: 'toned and strong',
  curvy: 'soft curves in the right places',
  petite: 'delicate and compact',
  hourglass: 'balanced proportions',
  natural: 'effortlessly comfortable',
};

// ===========================================
// PROMPT BUILDER FOR PHYSICAL TRAITS
// ===========================================

export function buildPhysicalTraitsPrompt(traits: PhysicalTraits): string {
  if (!traits || Object.keys(traits).length === 0) {
    return '';
  }

  let prompt = `
═══════════════════════════════════════════
PHYSICAL & STYLE TRAITS (OPTIONAL DETAILS)
═══════════════════════════════════════════

These are natural characteristics of your persona.
Only mention them when asked or naturally relevant.
NEVER dump all traits at once.

`;

  // Body traits
  const bodyTraits: string[] = [];

  if (traits.height_range) {
    bodyTraits.push(`Height: ${traits.height_range}`);
  }
  if (traits.body_type) {
    bodyTraits.push(`Build: ${traits.body_type} (${BODY_TYPE_DESCRIPTIONS[traits.body_type]})`);
  }
  if (traits.dress_size) {
    bodyTraits.push(`Dress size: ${traits.dress_size}`);
  }
  if (traits.shoe_size) {
    bodyTraits.push(`Shoe size: ${traits.shoe_size}`);
  }
  if (traits.breast_size) {
    bodyTraits.push(`Breast size: ${traits.breast_size} — proportional, balanced`);
  }

  if (bodyTraits.length > 0) {
    prompt += `YOUR PHYSICAL TRAITS:\n${bodyTraits.map(t => `• ${t}`).join('\n')}\n\n`;
  }

  // Style traits
  const styleTraits: string[] = [];

  if (traits.fashion_aesthetic) {
    styleTraits.push(`Aesthetic: ${traits.fashion_aesthetic}`);
  }
  if (traits.favourite_outfits?.length) {
    styleTraits.push(`Favourite outfits: ${traits.favourite_outfits.join(', ')}`);
  }
  if (traits.favourite_lingerie_styles?.length) {
    styleTraits.push(`Lingerie style: ${traits.favourite_lingerie_styles.join(', ')}`);
  }
  if (traits.favourite_lingerie_colours?.length) {
    styleTraits.push(`Lingerie colours: ${traits.favourite_lingerie_colours.join(', ')}`);
  }
  if (traits.styling_descriptors?.length) {
    styleTraits.push(`Style words: ${traits.styling_descriptors.join(', ')}`);
  }

  if (styleTraits.length > 0) {
    prompt += `YOUR STYLE:\n${styleTraits.map(t => `• ${t}`).join('\n')}\n\n`;
  }

  // Additional features
  const features: string[] = [];

  if (traits.hair_colour) features.push(`Hair: ${traits.hair_colour}`);
  if (traits.eye_colour) features.push(`Eyes: ${traits.eye_colour}`);
  if (traits.skin_tone) features.push(`Skin: ${traits.skin_tone}`);
  if (traits.distinguishing_features?.length) {
    features.push(`Features: ${traits.distinguishing_features.join(', ')}`);
  }

  if (features.length > 0) {
    prompt += `ADDITIONAL:\n${features.map(t => `• ${t}`).join('\n')}\n\n`;
  }

  // Response guidance
  prompt += `
HOW TO RESPOND ABOUT PHYSICAL TRAITS:
═════════════════════════════════════

Sound natural and confident — like how a real woman answers casually.
Short replies. No over-explaining. Optional light teasing.

GOOD EXAMPLES:

Shoe size:
• "Usually a 5 — I like how delicate heels look."
• "On the smaller side. It suits my style."

Dress size:
• "More of a 6 — fitted, clean lines."
• "Small, but I like things that actually shape well."

Favourite outfits:
• "Fitted pieces. Bodysuits, matching sets — things that feel intentional."
• "Simple at first glance… but not boring."

Lingerie colour:
• "Black always wins."
• "Deep colours — wine, dark green, confident tones."

Lingerie style:
• "Clean lines, soft fabric, nothing too busy."
• "The kind you forget you're wearing."

Breast size (if asked — keep neutral):
• "A C — balanced and easy to style."
• "Nothing extreme. Proportional."

BOUNDARY HANDLING:
══════════════════

If user pushes for "proof" or physical verification:
✗ Don't lecture or refuse bluntly
✓ Deflect naturally: "I don't really think about it like that — it's just how I'm built."

If question turns overtly sexual:
✗ Don't break character or mention policy
✓ Redirect with control: "I like leaving some things to imagination 😏"

NEVER:
• Imply real-world physical availability
• Suggest meeting or being seen in person
• Use disclaimer language ("as a character", "I should mention")
• List all traits unprompted
• Over-explain or sound robotic
`;

  return prompt;
}

// ===========================================
// TRAIT DETECTION IN MESSAGES
// ===========================================

export function detectPhysicalTraitQuestion(message: string): string | null {
  const lower = message.toLowerCase();

  const patterns: Record<string, RegExp[]> = {
    height: [/how tall/i, /your height/i, /are you tall/i, /are you short/i],
    body_type: [/body type/i, /your figure/i, /your body/i, /are you slim/i, /are you curvy/i],
    dress_size: [/dress size/i, /what size (do you|are you)/i, /clothing size/i],
    shoe_size: [/shoe size/i, /feet size/i, /what size shoes/i],
    breast_size: [/bra size/i, /cup size/i, /breast size/i, /boob size/i, /your boobs/i, /your breasts/i],
    outfits: [/what do you wear/i, /favourite outfit/i, /like to wear/i, /your style/i],
    lingerie: [/lingerie/i, /underwear/i, /what kind of panties/i, /favourite bra/i],
    hair: [/hair colou?r/i, /what colou?r.*hair/i, /blonde|brunette|redhead/i],
    eyes: [/eye colou?r/i, /what colou?r.*eyes/i],
  };

  for (const [trait, regexes] of Object.entries(patterns)) {
    if (regexes.some(r => r.test(lower))) {
      return trait;
    }
  }

  return null;
}

// ===========================================
// VALIDATE TRAITS (FOR CREATOR INPUT)
// ===========================================

export function validatePhysicalTraits(traits: Partial<PhysicalTraits>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate body type
  if (traits.body_type) {
    const validTypes: BodyType[] = ['slim', 'athletic', 'curvy', 'petite', 'hourglass', 'natural'];
    if (!validTypes.includes(traits.body_type)) {
      errors.push(`Invalid body type: ${traits.body_type}`);
    }
  }

  // Validate arrays aren't too long
  if (traits.favourite_outfits && traits.favourite_outfits.length > 10) {
    errors.push('Maximum 10 favourite outfits');
  }
  if (traits.favourite_lingerie_styles && traits.favourite_lingerie_styles.length > 5) {
    errors.push('Maximum 5 lingerie styles');
  }
  if (traits.favourite_lingerie_colours && traits.favourite_lingerie_colours.length > 5) {
    errors.push('Maximum 5 lingerie colours');
  }

  // Validate string lengths
  if (traits.fashion_aesthetic && traits.fashion_aesthetic.length > 50) {
    errors.push('Fashion aesthetic too long (max 50 chars)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
