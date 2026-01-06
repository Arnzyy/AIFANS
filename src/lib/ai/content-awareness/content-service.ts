// ===========================================
// LYRA CONTENT AWARENESS SYSTEM
// Allows AI to "know" and reference creator's images/videos
// ===========================================

// Supabase client type (using any for compatibility with server client)
type SupabaseClient = any;

// ===========================================
// TYPES
// ===========================================

export interface ContentMetadata {
  id: string;
  creator_id: string;
  content_type: 'image' | 'video';
  file_url: string;

  // AI-generated analysis
  description: string; // "Red lace lingerie, lying on bed, soft lighting"
  tags: string[]; // ["red", "lingerie", "bedroom", "playful"]
  outfit_type?: string; // "lingerie" | "swimwear" | "casual"
  mood?: string; // "playful" | "sultry" | "confident" | "mysterious"
  colors?: string[]; // ["red", "black"]
  pose?: string; // "lying down" | "standing" | "sitting"
  setting?: string; // "bedroom" | "studio" | "outdoor" (abstract)

  // For matching user references
  searchable_text: string; // Combined text for search

  // Meta
  is_ppv: boolean;
  price?: number;
  created_at: string;
  analyzed_at?: string;
}

export interface ContentMatch {
  content: ContentMetadata;
  confidence: number;
  match_reason: string;
}

// ===========================================
// CONTENT ANALYSIS (ON UPLOAD)
// ===========================================

/**
 * Analyze uploaded content using Claude Vision
 * Called when creator uploads new image/video
 */
export async function analyzeContent(
  fileUrl: string,
  contentType: 'image' | 'video'
): Promise<Partial<ContentMetadata>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getDefaultAnalysis();
  }

  const analysisPrompt = `Analyze this ${contentType} for a creator platform.

Describe it in a way that would help identify it later when a user says things like:
- "that red bikini pic"
- "the one where you're lying down"
- "your bedroom photo"

Return JSON only:
{
  "description": "Brief 10-15 word description of what's shown",
  "tags": ["array", "of", "searchable", "keywords"],
  "outfit_type": "lingerie" | "swimwear" | "casual" | "dress" | "athletic",
  "mood": "playful" | "sultry" | "confident" | "mysterious" | "sweet" | "fierce",
  "colors": ["main", "colors", "visible"],
  "pose": "brief pose description",
  "setting": "abstract setting (bedroom/studio/outdoor) - NO real locations"
}

IMPORTANT:
- Keep descriptions tasteful, not explicit
- Use abstract settings, never real places
- Focus on identifiable visual elements`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: fileUrl,
                },
              },
              {
                type: 'text',
                text: analysisPrompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Vision API error:', await response.text());
      return getDefaultAnalysis();
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return getDefaultAnalysis();

    const analysis = JSON.parse(jsonMatch[0]);

    // Build searchable text
    const searchableText = [
      analysis.description,
      ...(analysis.tags || []),
      analysis.outfit_type,
      analysis.mood,
      ...(analysis.colors || []),
      analysis.pose,
      analysis.setting,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return {
      ...analysis,
      searchable_text: searchableText,
      analyzed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Content analysis error:', error);
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis(): Partial<ContentMetadata> {
  return {
    description: 'Content image',
    tags: ['photo'],
    searchable_text: 'content image photo',
    analyzed_at: new Date().toISOString(),
  };
}

// ===========================================
// CONTENT MATCHING (DURING CHAT)
// ===========================================

/**
 * Find content that matches user's reference
 * Called when user mentions content in chat
 */
export async function findMatchingContent(
  supabase: SupabaseClient,
  creatorId: string,
  userReference: string,
  limit: number = 3
): Promise<ContentMatch[]> {
  // Extract keywords from user reference
  const keywords = extractKeywords(userReference);

  if (keywords.length === 0) {
    return [];
  }

  // Search content metadata
  const { data: allContent } = await supabase
    .from('content_metadata')
    .select('*')
    .eq('creator_id', creatorId);

  if (!allContent || allContent.length === 0) {
    return [];
  }

  // Score each content item
  const scored = allContent.map((content: any) => {
    const score = calculateMatchScore(content, keywords, userReference);
    return {
      content: content as ContentMetadata,
      confidence: score.confidence,
      match_reason: score.reason,
    };
  });

  // Return top matches above threshold
  return scored
    .filter((s: ContentMatch) => s.confidence > 0.3)
    .sort((a: ContentMatch, b: ContentMatch) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Extract searchable keywords from user message
 */
function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();

  // Common reference patterns
  const patterns = {
    colors: [
      'red',
      'black',
      'white',
      'pink',
      'blue',
      'green',
      'purple',
      'gold',
      'silver',
    ],
    outfits: [
      'bikini',
      'lingerie',
      'dress',
      'swimsuit',
      'bra',
      'panties',
      'lace',
      'leather',
      'silk',
    ],
    settings: [
      'bedroom',
      'bed',
      'pool',
      'beach',
      'mirror',
      'bathroom',
      'studio',
      'couch',
      'sofa',
    ],
    poses: ['lying', 'standing', 'sitting', 'kneeling', 'bent', 'back', 'side'],
    moods: [
      'sexy',
      'hot',
      'cute',
      'playful',
      'sultry',
      'fierce',
      'innocent',
      'naughty',
    ],
    descriptors: ['first', 'latest', 'recent', 'new', 'old', 'favorite', 'best'],
  };

  const found: string[] = [];

  for (const category of Object.values(patterns)) {
    for (const word of category) {
      if (lower.includes(word)) {
        found.push(word);
      }
    }
  }

  return found;
}

/**
 * Calculate how well content matches user reference
 */
function calculateMatchScore(
  content: ContentMetadata,
  keywords: string[],
  fullReference: string
): { confidence: number; reason: string } {
  let score = 0;
  const matches: string[] = [];
  const searchText = content.searchable_text || '';
  const lowerRef = fullReference.toLowerCase();

  // Keyword matching
  for (const keyword of keywords) {
    if (searchText.includes(keyword)) {
      score += 0.2;
      matches.push(keyword);
    }
    if (content.tags?.includes(keyword)) {
      score += 0.15;
    }
    if (content.colors?.includes(keyword)) {
      score += 0.15;
    }
  }

  // Outfit type matching
  if (content.outfit_type && lowerRef.includes(content.outfit_type)) {
    score += 0.25;
    matches.push(content.outfit_type);
  }

  // Mood matching
  if (content.mood && lowerRef.includes(content.mood)) {
    score += 0.1;
  }

  // Recency indicators
  if (
    lowerRef.includes('latest') ||
    lowerRef.includes('recent') ||
    lowerRef.includes('new')
  ) {
    // Boost recent content
    const contentDate = new Date(content.created_at);
    const daysSince =
      (Date.now() - contentDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 0.3;
    else if (daysSince < 30) score += 0.15;
  }

  // Cap at 1.0
  const confidence = Math.min(score, 1.0);
  const reason =
    matches.length > 0 ? `Matched: ${matches.join(', ')}` : 'Partial match';

  return { confidence, reason };
}

// ===========================================
// CONTEXT BUILDER FOR CHAT
// ===========================================

/**
 * Build content context for AI when user references images
 * Returns text to inject into system prompt
 */
export function buildContentContext(matches: ContentMatch[]): string {
  if (matches.length === 0) {
    return '';
  }

  let context = `
═══════════════════════════════════════════
CONTENT THE USER IS REFERENCING
═══════════════════════════════════════════
`;

  for (const match of matches) {
    context += `
[Content ${match.confidence > 0.7 ? '(HIGH MATCH)' : '(possible match)'}]
Description: ${match.content.description}
Outfit: ${match.content.outfit_type || 'n/a'}
Mood: ${match.content.mood || 'n/a'}
${match.content.is_ppv ? `💎 This is premium content (£${match.content.price})` : ''}
`;
  }

  context += `
Use this to respond naturally when they mention your content.
Example: If they mention "that red bikini pic", you might say:
"Mmm, that one? I felt so confident when I took that... something about the way you noticed it 😏"

Do NOT describe the image in explicit detail.
DO acknowledge it naturally and use it to flirt.
`;

  return context;
}

// ===========================================
// DETECT CONTENT REFERENCE IN MESSAGE
// ===========================================

/**
 * Check if user message references creator content
 */
export function detectContentReference(message: string): boolean {
  const lower = message.toLowerCase();

  const referencePatterns = [
    /that (pic|photo|image|video|clip)/i,
    /your (pic|photo|image|video|content)/i,
    /(the|that) (one|shot) (where|with|in)/i,
    /love(d)? (that|the|your) (pic|photo|image)/i,
    /(red|black|white|blue|pink) (bikini|lingerie|dress|outfit)/i,
    /bedroom (pic|photo|shot)/i,
    /pool (pic|photo|shot)/i,
    /latest (pic|photo|post|upload)/i,
    /recent (pic|photo|post|upload)/i,
    /favorite (pic|photo|image)/i,
  ];

  return referencePatterns.some((pattern) => pattern.test(lower));
}

// ===========================================
// DATABASE OPERATIONS
// ===========================================

/**
 * Save content metadata after analysis
 */
export async function saveContentMetadata(
  supabase: SupabaseClient,
  creatorId: string,
  fileUrl: string,
  contentType: 'image' | 'video',
  isPPV: boolean = false,
  price?: number
): Promise<ContentMetadata | null> {
  // Analyze the content
  const analysis = await analyzeContent(fileUrl, contentType);

  const metadata: Partial<ContentMetadata> = {
    creator_id: creatorId,
    content_type: contentType,
    file_url: fileUrl,
    is_ppv: isPPV,
    price,
    created_at: new Date().toISOString(),
    ...analysis,
  };

  const { data, error } = await supabase
    .from('content_metadata')
    .insert(metadata)
    .select()
    .single();

  if (error) {
    console.error('Error saving content metadata:', error);
    return null;
  }

  return data as ContentMetadata;
}

/**
 * Get all content for a creator
 */
export async function getCreatorContent(
  supabase: SupabaseClient,
  creatorId: string
): Promise<ContentMetadata[]> {
  const { data } = await supabase
    .from('content_metadata')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  return (data || []) as ContentMetadata[];
}

/**
 * Re-analyze content (for updates or fixes)
 */
export async function reanalyzeContent(
  supabase: SupabaseClient,
  contentId: string
): Promise<boolean> {
  const { data: content } = await supabase
    .from('content_metadata')
    .select('file_url, content_type')
    .eq('id', contentId)
    .single();

  if (!content) return false;

  const analysis = await analyzeContent(content.file_url, content.content_type);

  const { error } = await supabase
    .from('content_metadata')
    .update(analysis)
    .eq('id', contentId);

  return !error;
}
