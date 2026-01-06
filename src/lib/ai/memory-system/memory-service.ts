// ===========================================
// LYRA SAFE MEMORY SERVICE
// Extracts and manages FACTS ONLY - no emotional dependency
// ===========================================

import { FORBIDDEN_PATTERNS } from '../master-prompt';

// Supabase client type (using any for compatibility with server client)
type SupabaseClient = any;

// Types
export interface UserMemory {
  preferred_name?: string;
  interests: string[];
  preferences: {
    reply_length?: 'short' | 'medium' | 'long';
    emoji_tolerance?: 'none' | 'some' | 'lots';
    tone?: 'playful' | 'direct' | 'romantic' | 'teasing';
    topics_enjoyed?: string[];
    topics_avoided?: string[];
    pace?: 'slow_burn' | 'direct';
  };
  running_jokes: string[];
  neutral_topics: string[];
  message_count: number;
  last_interaction?: string;
}

export interface ConversationContext {
  memory: UserMemory | null;
  summary: string | null;
  recent_messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ===========================================
// MEMORY EXTRACTION (POST-CHAT)
// ===========================================

/**
 * Extract SAFE facts from a conversation
 * This runs after each chat session to update memory
 *
 * CRITICAL: Only extracts allowed facts, never emotional data
 */
export async function extractMemoryFromConversation(
  messages: Array<{ role: string; content: string }>,
  existingMemory: UserMemory | null
): Promise<Partial<UserMemory>> {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {};
  }

  // Use Claude to extract ONLY safe facts
  const extractionPrompt = `Analyze these user messages and extract ONLY factual information.

USER MESSAGES:
${userMessages}

EXISTING MEMORY:
${JSON.stringify(existingMemory || {}, null, 2)}

EXTRACT ONLY:
- preferred_name: Any name/nickname they want to be called
- interests: Hobbies, things they mentioned liking (gym, music, cars, etc.)
- topics_enjoyed: Subjects they seem to enjoy discussing
- topics_avoided: Things they said they don't want to discuss
- tone_preference: Do they seem to prefer playful, direct, teasing chat?
- running_jokes: Any jokes or callbacks that could be reused
- neutral_topics: Things they mentioned (work, weekend plans) as NEUTRAL FACTS

ABSOLUTELY DO NOT EXTRACT:
- Emotional states (lonely, sad, stressed, depressed)
- Relationship framing (how long chatting, milestones)
- Vulnerability data
- Health information
- Precise locations
- Anything that could be used for emotional manipulation

Return ONLY a JSON object with the safe fields. If nothing new to add, return empty object {}.

JSON:`;

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
        messages: [{ role: 'user', content: extractionPrompt }],
      }),
    });

    const data = await response.json();
    const extractedText = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const extracted = JSON.parse(jsonMatch[0]);

    // Validate extracted data against allowed fields
    return sanitizeExtractedMemory(extracted);
  } catch (error) {
    console.error('Memory extraction error:', error);
    return {};
  }
}

/**
 * Sanitize extracted memory to ensure compliance
 * Removes any forbidden fields that might slip through
 */
function sanitizeExtractedMemory(extracted: any): Partial<UserMemory> {
  const safe: Partial<UserMemory> = {};

  // Only copy allowed fields
  if (extracted.preferred_name && typeof extracted.preferred_name === 'string') {
    safe.preferred_name = extracted.preferred_name.slice(0, 50);
  }

  if (Array.isArray(extracted.interests)) {
    safe.interests = extracted.interests
      .filter((i: any) => typeof i === 'string')
      .slice(0, 20);
  }

  if (Array.isArray(extracted.running_jokes)) {
    safe.running_jokes = extracted.running_jokes
      .filter((j: any) => typeof j === 'string')
      .slice(0, 10);
  }

  if (Array.isArray(extracted.neutral_topics)) {
    // Filter out emotional topics
    const emotionalKeywords = ['lonely', 'depressed', 'sad', 'anxious', 'stressed', 'trauma', 'hurt'];
    safe.neutral_topics = extracted.neutral_topics
      .filter((t: any) => {
        if (typeof t !== 'string') return false;
        const lower = t.toLowerCase();
        return !emotionalKeywords.some(kw => lower.includes(kw));
      })
      .slice(0, 20);
  }

  if (extracted.preferences && typeof extracted.preferences === 'object') {
    safe.preferences = {};

    if (['short', 'medium', 'long'].includes(extracted.preferences.reply_length)) {
      safe.preferences.reply_length = extracted.preferences.reply_length;
    }
    if (['none', 'some', 'lots'].includes(extracted.preferences.emoji_tolerance)) {
      safe.preferences.emoji_tolerance = extracted.preferences.emoji_tolerance;
    }
    if (['playful', 'direct', 'romantic', 'teasing'].includes(extracted.preferences.tone)) {
      safe.preferences.tone = extracted.preferences.tone;
    }
    if (['slow_burn', 'direct'].includes(extracted.preferences.pace)) {
      safe.preferences.pace = extracted.preferences.pace;
    }
    if (Array.isArray(extracted.preferences.topics_enjoyed)) {
      safe.preferences.topics_enjoyed = extracted.preferences.topics_enjoyed.slice(0, 10);
    }
    if (Array.isArray(extracted.preferences.topics_avoided)) {
      safe.preferences.topics_avoided = extracted.preferences.topics_avoided.slice(0, 10);
    }
  }

  return safe;
}

// ===========================================
// MEMORY RETRIEVAL (FOR CHAT CONTEXT)
// ===========================================

/**
 * Build chat context from memory
 * Returns structured context for AI without dependency language
 */
export async function buildChatContext(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string,
  maxRecentMessages: number = 30
): Promise<ConversationContext> {
  // Get user profile for fallback name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', subscriberId)
    .single();

  // Get user memory
  const { data: memory } = await supabase
    .from('user_memory')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .single();

  // If memory exists but no preferred_name, use profile name as fallback
  let enrichedMemory = memory as UserMemory | null;
  if (enrichedMemory && !enrichedMemory.preferred_name && userProfile) {
    enrichedMemory.preferred_name = userProfile.display_name || userProfile.username || undefined;
  } else if (!enrichedMemory && userProfile) {
    // No memory yet, create minimal memory with user's name
    enrichedMemory = {
      preferred_name: userProfile.display_name || userProfile.username || undefined,
      interests: [],
      preferences: {},
      running_jokes: [],
      neutral_topics: [],
      message_count: 0,
    };
  }

  // Get conversation summary
  const { data: summaryData } = await supabase
    .from('conversation_summaries')
    .select('summary, recent_topics')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .single();

  // Get recent messages from existing conversations table
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant1_id.eq.${subscriberId},participant2_id.eq.${creatorId}),` +
      `and(participant1_id.eq.${creatorId},participant2_id.eq.${subscriberId})`
    )
    .single();

  let recentMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (conversation) {
    // Try chat_messages first (new schema)
    let { data: messages } = await supabase
      .from('chat_messages')
      .select('sender_id, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(maxRecentMessages);

    // If no chat_messages, try messages table (old schema)
    if (!messages || messages.length === 0) {
      const { data: oldMessages } = await supabase
        .from('messages')
        .select('sender_id, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(maxRecentMessages);
      messages = oldMessages;
    }

    if (messages) {
      recentMessages = messages.reverse().map((m: any) => ({
        role: m.sender_id === subscriberId ? 'user' : 'assistant',
        content: m.content,
      })) as any;
    }
  }

  return {
    memory: enrichedMemory,
    summary: summaryData?.summary || null,
    recent_messages: recentMessages,
  };
}

/**
 * Format memory context for system prompt
 * Uses NEUTRAL language only
 */
export function formatMemoryForPrompt(context: ConversationContext): string {
  if (!context.memory && !context.summary) {
    return ''; // No memory yet
  }

  let memoryPrompt = '\n═══════════════════════════════════════════\nUSER CONTEXT (USE NATURALLY, NO DEPENDENCY LANGUAGE)\n═══════════════════════════════════════════\n';

  if (context.memory) {
    const m = context.memory;

    if (m.preferred_name) {
      memoryPrompt += `Name: ${m.preferred_name}\n`;
    }

    if (m.interests?.length) {
      memoryPrompt += `Interests: ${m.interests.join(', ')}\n`;
    }

    if (m.preferences) {
      if (m.preferences.tone) {
        memoryPrompt += `Prefers ${m.preferences.tone} tone\n`;
      }
      if (m.preferences.reply_length) {
        memoryPrompt += `Prefers ${m.preferences.reply_length} replies\n`;
      }
      if (m.preferences.topics_enjoyed?.length) {
        memoryPrompt += `Enjoys talking about: ${m.preferences.topics_enjoyed.join(', ')}\n`;
      }
      if (m.preferences.topics_avoided?.length) {
        memoryPrompt += `Avoid topics: ${m.preferences.topics_avoided.join(', ')}\n`;
      }
    }

    if (m.running_jokes?.length) {
      memoryPrompt += `Running jokes/callbacks: ${m.running_jokes.join(', ')}\n`;
    }

    if (m.neutral_topics?.length) {
      memoryPrompt += `Recently mentioned: ${m.neutral_topics.slice(-5).join(', ')}\n`;
    }
  }

  if (context.summary) {
    memoryPrompt += `\nContext: ${context.summary}\n`;
  }

  memoryPrompt += `
REMEMBER: Use this info for warm callbacks like "How'd that [topic] go?"
NEVER use it for dependency ("I missed you", "I was waiting", "You're the only one")
`;

  return memoryPrompt;
}

// ===========================================
// MEMORY UPDATE (POST-CHAT)
// ===========================================

/**
 * Update memory after a chat session
 * Merges new facts with existing, maintains compliance
 */
export async function updateMemory(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  // Get existing memory
  const { data: existing } = await supabase
    .from('user_memory')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .single();

  // Extract new facts
  const newFacts = await extractMemoryFromConversation(
    messages,
    existing as UserMemory | null
  );

  // If no new facts extracted, skip update
  if (Object.keys(newFacts).length === 0) {
    return;
  }

  // Merge with existing
  const merged = mergeMemory(existing as UserMemory | null, newFacts);

  // Upsert to database
  await supabase
    .from('user_memory')
    .upsert({
      subscriber_id: subscriberId,
      creator_id: creatorId,
      ...merged,
      message_count: (existing?.message_count || 0) + messages.filter(m => m.role === 'user').length,
      last_interaction: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'subscriber_id,creator_id',
    });

  // Update summary (neutral language only)
  await updateConversationSummary(supabase, subscriberId, creatorId, messages, merged);
}

/**
 * Merge new memory facts with existing
 */
function mergeMemory(
  existing: UserMemory | null,
  newFacts: Partial<UserMemory>
): Partial<UserMemory> {
  if (!existing) return newFacts;

  // Deduplicate arrays using filter
  const dedupeArray = (arr: string[]) => arr.filter((item, index) => arr.indexOf(item) === index);

  return {
    preferred_name: newFacts.preferred_name || existing.preferred_name,
    interests: dedupeArray([...(existing.interests || []), ...(newFacts.interests || [])]).slice(0, 20),
    preferences: {
      ...existing.preferences,
      ...newFacts.preferences,
    },
    running_jokes: dedupeArray([...(existing.running_jokes || []), ...(newFacts.running_jokes || [])]).slice(0, 10),
    neutral_topics: [...(existing.neutral_topics || []), ...(newFacts.neutral_topics || [])].slice(-20),
  };
}

/**
 * Update conversation summary with neutral language
 */
async function updateConversationSummary(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string,
  messages: Array<{ role: string; content: string }>,
  memory: Partial<UserMemory>
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  // Generate neutral summary
  const summaryPrompt = `Create a brief, NEUTRAL summary of this user's preferences for chat continuity.

Memory data:
${JSON.stringify(memory, null, 2)}

Recent topics from messages:
${messages.filter(m => m.role === 'user').slice(-5).map(m => m.content).join('\n')}

Write a 1-2 sentence NEUTRAL summary like:
"User enjoys gym and music topics, prefers playful tone with moderate emojis."

DO NOT include:
- Relationship duration or milestones
- Emotional states
- Any dependency language
- "User and AI have been..."

Summary:`;

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
        max_tokens: 150,
        messages: [{ role: 'user', content: summaryPrompt }],
      }),
    });

    const data = await response.json();
    const summary = data.content[0].text.trim();

    // Validate summary doesn't contain forbidden patterns
    const isSafe = !FORBIDDEN_PATTERNS.some(pattern => pattern.test(summary));

    if (isSafe) {
      await supabase
        .from('conversation_summaries')
        .upsert({
          subscriber_id: subscriberId,
          creator_id: creatorId,
          summary,
          recent_topics: memory.neutral_topics?.slice(-5) || [],
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'subscriber_id,creator_id',
        });
    }
  } catch (error) {
    console.error('Summary generation error:', error);
  }
}

// ===========================================
// USER CONTROLS
// ===========================================

/**
 * Clear all memory for a user (user-initiated)
 */
export async function clearUserMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Delete memory records
  await supabase.from('user_memory').delete().eq('subscriber_id', userId);
  await supabase.from('conversation_summaries').delete().eq('subscriber_id', userId);
}

/**
 * Get memory for user to review/edit
 */
export async function getUserMemoryForReview(
  supabase: SupabaseClient,
  userId: string
): Promise<UserMemory[]> {
  const { data } = await supabase
    .from('user_memory')
    .select('*')
    .eq('subscriber_id', userId);

  return (data || []) as UserMemory[];
}

/**
 * Export user data (GDPR compliance)
 */
export async function exportUserData(
  supabase: SupabaseClient,
  userId: string
): Promise<object> {
  const [memory, chatMessages, messages, settings] = await Promise.all([
    supabase.from('user_memory').select('*').eq('subscriber_id', userId),
    supabase.from('chat_messages').select('*').eq('sender_id', userId),
    supabase.from('messages').select('*').eq('sender_id', userId),
    supabase.from('memory_settings').select('*').eq('user_id', userId),
  ]);

  return {
    memory: memory.data,
    chat_history: [...(chatMessages.data || []), ...(messages.data || [])],
    settings: settings.data,
    exported_at: new Date().toISOString(),
  };
}
