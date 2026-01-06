// ===========================================
// LYRA IMAGE AWARENESS SYSTEM
// Allows AI to "know" and reference creator's content
// ===========================================

// ===========================================
// TYPES
// ===========================================

export interface ImageMetadata {
  id: string;
  creator_id: string;
  storage_url: string;
  
  // AI-generated analysis
  description: string;           // "Red lace lingerie set, lying on bed, soft lighting"
  outfit_type: string;           // "lingerie" | "swimwear" | "casual" | "elegant"
  colors: string[];              // ["red", "black", "gold"]
  mood: string;                  // "playful" | "sultry" | "confident" | "mysterious"
  setting: string;               // "indoor" | "studio" | "ambient" (never real locations)
  pose_type: string;             // "standing" | "sitting" | "lying" | "close-up"
  
  // Searchable tags
  tags: string[];                // ["red", "lace", "lingerie", "bedroom", "playful"]
  
  // For matching user references
  searchable_text: string;       // Combined lowercase text for fuzzy matching
  
  // Content flags
  is_ppv: boolean;
  is_public: boolean;
  
  // Meta
  uploaded_at: string;
  analyzed_at: string;
}

export interface VideoMetadata extends ImageMetadata {
  duration_seconds: number;
  is_looped: boolean;
  thumbnail_url: string;
}

export interface ContentMatch {
  content: ImageMetadata | VideoMetadata;
  confidence: number;            // 0-1 match confidence
  match_reason: string;          // "color match", "outfit match", etc.
}

// ===========================================
// IMAGE ANALYSIS (ON UPLOAD)
// ===========================================

/**
 * Analyze uploaded image and generate searchable metadata
 * Called when creator uploads new content
 */
export async function analyzeCreatorImage(
  imageUrl: string,
  creatorId: string,
  contentId: string,
  isPPV: boolean = false
): Promise<ImageMetadata> {
  
  const analysisPrompt = `Analyze this image for a content creator platform. The creator makes lingerie/swimwear content.

Describe the image for internal search/matching purposes. Be specific but tasteful.

Return JSON with these fields:
{
  "description": "Brief 1-sentence description of the image",
  "outfit_type": "lingerie" | "swimwear" | "casual" | "elegant" | "athletic",
  "colors": ["primary colors in the image"],
  "mood": "playful" | "sultry" | "confident" | "mysterious" | "sweet" | "bold",
  "setting": "indoor" | "studio" | "ambient" (never use real location names),
  "pose_type": "standing" | "sitting" | "lying" | "close-up" | "action",
  "tags": ["searchable", "keywords", "for", "matching"]
}

Keep descriptions tasteful - no explicit language. Focus on:
- What they're wearing (color, style)
- The vibe/mood
- The general setting (abstract, no real places)
- Distinctive elements

JSON:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: analysisPrompt,
            },
          ],
        }],
      }),
    });

    const data = await response.json();
    const analysisText = data.content[0].text;
    
    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse analysis');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Build searchable text for fuzzy matching
    const searchableText = [
      analysis.description,
      analysis.outfit_type,
      ...analysis.colors,
      analysis.mood,
      analysis.setting,
      ...analysis.tags,
    ].join(' ').toLowerCase();

    return {
      id: contentId,
      creator_id: creatorId,
      storage_url: imageUrl,
      description: analysis.description,
      outfit_type: analysis.outfit_type,
      colors: analysis.colors,
      mood: analysis.mood,
      setting: analysis.setting,
      pose_type: analysis.pose_type,
      tags: analysis.tags,
      searchable_text: searchableText,
      is_ppv: isPPV,
      is_public: !isPPV,
      uploaded_at: new Date().toISOString(),
      analyzed_at: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Image analysis error:', error);
    
    // Return basic metadata if analysis fails
    return {
      id: contentId,
      creator_id: creatorId,
      storage_url: imageUrl,
      description: 'Content image',
      outfit_type: 'unknown',
      colors: [],
      mood: 'unknown',
      setting: 'unknown',
      pose_type: 'unknown',
      tags: [],
      searchable_text: '',
      is_ppv: isPPV,
      is_public: !isPPV,
      uploaded_at: new Date().toISOString(),
      analyzed_at: new Date().toISOString(),
    };
  }
}

// ===========================================
// CONTENT MATCHING (DURING CHAT)
// ===========================================

/**
 * Find content that matches user's reference
 * Called when user mentions specific content in chat
 */
export async function findMatchingContent(
  userMessage: string,
  creatorId: string,
  supabase: any
): Promise<ContentMatch[]> {
  
  // Get all creator's content metadata
  const { data: allContent } = await supabase
    .from('content_metadata')
    .select('*')
    .eq('creator_id', creatorId);

  if (!allContent || allContent.length === 0) {
    return [];
  }

  // Extract potential content references from user message
  const referencePrompt = `User message: "${userMessage}"

Extract any references to specific content/images. Look for:
- Colors mentioned ("red", "black", "white")
- Clothing types ("bikini", "lingerie", "dress")
- Moods ("sexy", "cute", "hot")
- Recent/specific references ("that pic", "the one where", "your latest")

Return JSON:
{
  "has_content_reference": true/false,
  "colors": ["any colors mentioned"],
  "clothing": ["any clothing mentioned"],
  "mood_words": ["any mood/vibe words"],
  "is_recent": true/false,
  "is_specific": true/false,
  "search_terms": ["combined search terms"]
}

JSON:`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: referencePrompt }],
      }),
    });

    const data = await response.json();
    const extractedText = data.content[0].text;
    
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    
    const extracted = JSON.parse(jsonMatch[0]);
    
    if (!extracted.has_content_reference) {
      return [];
    }

    // Score each piece of content
    const matches: ContentMatch[] = [];
    
    for (const content of allContent as ImageMetadata[]) {
      let score = 0;
      const reasons: string[] = [];
      
      // Color matching
      for (const color of extracted.colors || []) {
        if (content.colors.some(c => c.toLowerCase().includes(color.toLowerCase()))) {
          score += 0.3;
          reasons.push('color match');
        }
        if (content.searchable_text.includes(color.toLowerCase())) {
          score += 0.1;
        }
      }
      
      // Clothing matching
      for (const clothing of extracted.clothing || []) {
        if (content.outfit_type.toLowerCase().includes(clothing.toLowerCase())) {
          score += 0.3;
          reasons.push('outfit match');
        }
        if (content.searchable_text.includes(clothing.toLowerCase())) {
          score += 0.2;
        }
      }
      
      // Mood matching
      for (const mood of extracted.mood_words || []) {
        if (content.mood.toLowerCase().includes(mood.toLowerCase())) {
          score += 0.2;
          reasons.push('mood match');
        }
      }
      
      // Search term matching
      for (const term of extracted.search_terms || []) {
        if (content.searchable_text.includes(term.toLowerCase())) {
          score += 0.15;
          reasons.push('keyword match');
        }
      }
      
      // Recency bonus
      if (extracted.is_recent) {
        const uploadDate = new Date(content.uploaded_at);
        const daysSinceUpload = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpload < 7) {
          score += 0.2;
          reasons.push('recent');
        }
      }
      
      if (score > 0.2) {
        matches.push({
          content,
          confidence: Math.min(score, 1),
          match_reason: [...new Set(reasons)].join(', '),
        });
      }
    }
    
    // Sort by confidence and return top matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

  } catch (error) {
    console.error('Content matching error:', error);
    return [];
  }
}

// ===========================================
// FORMAT FOR AI CONTEXT
// ===========================================

/**
 * Format matched content for injection into AI prompt
 */
export function formatContentForPrompt(matches: ContentMatch[]): string {
  if (matches.length === 0) return '';

  let context = `\n═══════════════════════════════════════════
CONTENT REFERENCE DETECTED
═══════════════════════════════════════════
The user appears to be referencing your content. Here's what they might mean:

`;

  for (const match of matches) {
    context += `• ${match.content.description}
  Outfit: ${match.content.outfit_type} | Mood: ${match.content.mood}
  Colors: ${match.content.colors.join(', ')}
  Match confidence: ${Math.round(match.confidence * 100)}% (${match.match_reason})
  ${match.content.is_ppv ? '💎 This is PPV content' : ''}

`;
  }

  context += `Use this to respond naturally as if you remember this content. 
Example: "Mmm, that one? I remember feeling [mood] when I took that..."
Do NOT list these details mechanically - weave them naturally into your response.
`;

  return context;
}

// ===========================================
// CONTENT CONTEXT BUILDER (FOR CHAT)
// ===========================================

/**
 * Build complete content context for a chat message
 * Called before generating AI response
 */
export async function buildContentContext(
  userMessage: string,
  creatorId: string,
  supabase: any
): Promise<string> {
  // Check if user is referencing content
  const matches = await findMatchingContent(userMessage, creatorId, supabase);
  
  if (matches.length === 0) {
    return '';
  }
  
  return formatContentForPrompt(matches);
}

// ===========================================
// SEND CONTENT IN CHAT
// ===========================================

/**
 * Check if AI should proactively share content
 * Returns content ID if appropriate, null otherwise
 */
export async function shouldShareContent(
  userMessage: string,
  aiResponse: string,
  creatorId: string,
  supabase: any
): Promise<string | null> {
  
  // Keywords that suggest user wants to see content
  const contentRequestPatterns = [
    /show me/i,
    /send (me )?(a )?(pic|photo|image)/i,
    /can i see/i,
    /got any (pics|photos)/i,
    /what do you look like/i,
    /see more/i,
  ];
  
  const wantsContent = contentRequestPatterns.some(p => p.test(userMessage));
  
  if (!wantsContent) return null;
  
  // Get a suitable piece of content to share
  const { data: publicContent } = await supabase
    .from('content_metadata')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('is_public', true)
    .order('uploaded_at', { ascending: false })
    .limit(5);
  
  if (!publicContent || publicContent.length === 0) return null;
  
  // Return random from recent public content
  const randomIndex = Math.floor(Math.random() * publicContent.length);
  return publicContent[randomIndex].id;
}
