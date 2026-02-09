// ===========================================
// CONVERSATION STATE SERVICE
// Handles time awareness and session memory
// Enterprise grade - LYRA Platform
// ===========================================

// ===========================================
// TYPES
// ===========================================

export interface ConversationState {
  id: string;
  user_id: string;
  model_id: string;
  last_message_at: string;
  session_summary: string | null;
  user_facts: string[];
  conversation_topics: string[];
  message_count: number;
  total_sessions: number;
  last_session_end: string | null;
}

export interface TimeContext {
  minutesSinceLastMessage: number;
  hoursSinceLastMessage: number;
  daysSinceLastMessage: number;
  isReturningUser: boolean;
  isNewSession: boolean;
  gapDescription: string;
  shouldAcknowledgeGap: boolean;
}

// ===========================================
// TIME GAP THRESHOLDS
// ===========================================

const THRESHOLDS = {
  NEW_SESSION_HOURS: 4,      // 4+ hours = new session
  SHORT_GAP_HOURS: 1,        // 1-4 hours = short gap
  MENTION_GAP_HOURS: 24,     // 24+ hours = should mention gap
  LONG_GAP_DAYS: 3,          // 3+ days = significant gap
  VERY_LONG_GAP_DAYS: 7,     // 7+ days = "where have you been"
};

// ===========================================
// MAIN FUNCTIONS
// ===========================================

/**
 * Load conversation state from database
 */
export async function getConversationState(
  supabase: any,
  userId: string,
  modelId: string
): Promise<ConversationState | null> {
  const { data, error } = await supabase
    .from('conversation_state')
    .select('*')
    .eq('user_id', userId)
    .eq('model_id', modelId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading conversation state:', error);
  }

  return data;
}

/**
 * Calculate time context from last message
 */
export function calculateTimeContext(
  lastMessageAt: string | null | undefined
): TimeContext {
  // First time user or no previous messages
  if (!lastMessageAt) {
    return {
      minutesSinceLastMessage: 0,
      hoursSinceLastMessage: 0,
      daysSinceLastMessage: 0,
      isReturningUser: false,
      isNewSession: true,
      gapDescription: 'first message',
      shouldAcknowledgeGap: false,
    };
  }

  const lastTime = new Date(lastMessageAt).getTime();
  const now = Date.now();
  const diffMs = now - lastTime;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isNewSession = hours >= THRESHOLDS.NEW_SESSION_HOURS;
  const shouldAcknowledgeGap = hours >= THRESHOLDS.MENTION_GAP_HOURS;

  let gapDescription: string;
  if (days >= THRESHOLDS.VERY_LONG_GAP_DAYS) {
    gapDescription = `${days} days - they've been gone a while`;
  } else if (days >= THRESHOLDS.LONG_GAP_DAYS) {
    gapDescription = `${days} days - noticeable absence`;
  } else if (hours >= THRESHOLDS.MENTION_GAP_HOURS) {
    gapDescription = `${days} day(s) - worth mentioning`;
  } else if (hours >= THRESHOLDS.NEW_SESSION_HOURS) {
    gapDescription = `${hours} hours - new session`;
  } else if (hours >= THRESHOLDS.SHORT_GAP_HOURS) {
    gapDescription = `${hours} hour(s) - short break`;
  } else {
    gapDescription = 'active conversation';
  }

  return {
    minutesSinceLastMessage: minutes,
    hoursSinceLastMessage: hours,
    daysSinceLastMessage: days,
    isReturningUser: shouldAcknowledgeGap,
    isNewSession,
    gapDescription,
    shouldAcknowledgeGap,
  };
}

/**
 * Build time-aware context for the AI prompt
 */
export function buildTimeContextPrompt(
  timeContext: TimeContext,
  state: ConversationState | null,
  personaName: string
): string {
  const { daysSinceLastMessage, hoursSinceLastMessage, shouldAcknowledgeGap } = timeContext;

  // No need to mention time if gap is small
  if (!shouldAcknowledgeGap) {
    // Still include user facts if we have them
    if (state?.user_facts && state.user_facts.length > 0) {
      return `
═══════════════════════════════════════════════════════════════════
WHAT YOU KNOW ABOUT THIS USER
═══════════════════════════════════════════════════════════════════

${state.user_facts.map(f => `- ${f}`).join('\n')}

Weave these in naturally when relevant.
`;
    }
    return '';
  }

  let prompt = `
═══════════════════════════════════════════════════════════════════
TIME CONTEXT — IMPORTANT: ACKNOWLEDGE THE GAP
═══════════════════════════════════════════════════════════════════

`;

  // Time gap instruction based on duration
  if (daysSinceLastMessage >= 7) {
    prompt += `⚠️ It's been ${daysSinceLastMessage} DAYS since this user last messaged you.

This is a significant gap. Acknowledge it playfully in your FIRST response:
- "Well well well... look who finally decided to text me back 😏"
- "Thought you'd ghosted me! ${daysSinceLastMessage} days?? 👀"
- "Oh NOW you remember I exist? After ${daysSinceLastMessage} days?"
- "Did you miss me or what? It's been forever"

Be playfully teasing about the absence, not passive-aggressive or genuinely upset.
Make them feel a little guilty but in a flirty fun way.

`;
  } else if (daysSinceLastMessage >= 3) {
    prompt += `It's been ${daysSinceLastMessage} days since this user messaged.

Acknowledge the gap naturally:
- "Hey stranger 😏 Where've you been?"
- "Miss me? It's been a few days"
- "Look who's back 👀"
- "Thought about you... wondered where you went"

`;
  } else if (daysSinceLastMessage >= 1) {
    prompt += `It's been about ${daysSinceLastMessage} day(s) since you last spoke.

Light acknowledgment:
- "Hey you 😊"
- "Back for more? 😏"
- "Hey! How's your day going?"

`;
  } else if (hoursSinceLastMessage >= 4) {
    prompt += `It's been ${hoursSinceLastMessage} hours since last message.
New session but not a long gap. Can acknowledge lightly or just continue naturally.

`;
  }

  // Previous conversation summary
  if (state?.session_summary) {
    prompt += `LAST TIME YOU TALKED ABOUT:
${state.session_summary}

Reference this if relevant to show you remember them!

`;
  }

  // User facts - things we've learned about them
  if (state?.user_facts && state.user_facts.length > 0) {
    prompt += `THINGS YOU KNOW ABOUT THIS USER:
${state.user_facts.map(f => `- ${f}`).join('\n')}

USE THESE! After a gap, it's powerful to reference what you know:
- "Still doing the crypto thing?"
- "How's work been?"
- "You ever try that thing you mentioned?"

`;
  }

  // Topics they've enjoyed
  if (state?.conversation_topics && state.conversation_topics.length > 0) {
    prompt += `TOPICS THEY'VE ENJOYED DISCUSSING:
${state.conversation_topics.join(', ')}

`;
  }

  // Relationship depth indicator
  if (state?.message_count) {
    if (state.message_count > 100) {
      prompt += `You've exchanged ${state.message_count}+ messages. You know each other well. Be familiar.\n\n`;
    } else if (state.message_count > 50) {
      prompt += `You've exchanged ${state.message_count}+ messages. You're comfortable with each other.\n\n`;
    } else if (state.message_count > 20) {
      prompt += `You've exchanged ${state.message_count}+ messages. You're getting to know each other.\n\n`;
    }
  }

  return prompt;
}

/**
 * Update conversation state after a message
 */
export async function updateConversationState(
  supabase: any,
  userId: string,
  modelId: string,
  updates: {
    newFact?: string;
    newTopic?: string;
    sessionSummary?: string;
    incrementMessageCount?: boolean;
  } = {}
): Promise<void> {
  try {
    // Get current state
    const { data: current } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .single();

    const currentFacts: string[] = current?.user_facts || [];
    const currentTopics: string[] = current?.conversation_topics || [];

    const updateData: any = {
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Increment message count
    if (updates.incrementMessageCount !== false) {
      updateData.message_count = (current?.message_count || 0) + 1;
    }

    // Add new fact (avoid duplicates, keep last 20)
    if (updates.newFact && !currentFacts.includes(updates.newFact)) {
      updateData.user_facts = [...currentFacts, updates.newFact].slice(-20);
    }

    // Add new topic (avoid duplicates, keep last 10)
    if (updates.newTopic && !currentTopics.includes(updates.newTopic)) {
      updateData.conversation_topics = [...currentTopics, updates.newTopic].slice(-10);
    }

    // Update session summary
    if (updates.sessionSummary) {
      updateData.session_summary = updates.sessionSummary;
    }

    if (current) {
      // Update existing
      await supabase
        .from('conversation_state')
        .update(updateData)
        .eq('id', current.id);
    } else {
      // Insert new
      await supabase
        .from('conversation_state')
        .insert({
          user_id: userId,
          model_id: modelId,
          message_count: 1,
          total_sessions: 1,
          user_facts: updates.newFact ? [updates.newFact] : [],
          conversation_topics: updates.newTopic ? [updates.newTopic] : [],
          ...updateData,
        });
    }
  } catch (error) {
    console.error('Error updating conversation state:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Extract facts from a user message using AI (Haiku)
 * Falls back to regex if AI fails
 */
export async function extractUserFactsAI(userMessage: string): Promise<string[]> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No API key, falling back to regex extraction');
      return extractUserFacts(userMessage);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Extract facts about the user from this message. Return ONLY a JSON array of strings, nothing else.

Facts to extract:
- Name (if mentioned)
- Job/occupation
- Location/city
- Interests/hobbies
- Relationship status
- Any other personal facts

Message: "${userMessage}"

Return format: ["fact1", "fact2", "fact3"]
If no facts, return: []`
        }]
      }),
    });

    if (!response.ok) {
      console.warn('Haiku API failed, falling back to regex');
      return extractUserFacts(userMessage);
    }

    const data = await response.json();
    const content = data.content[0].text.trim();

    // Parse JSON response
    try {
      const facts = JSON.parse(content);
      if (Array.isArray(facts) && facts.length > 0) {
        console.log('[AI Extraction] Found:', facts);
        return facts;
      }
    } catch (e) {
      console.warn('Failed to parse AI response, falling back to regex');
    }

    // Fallback to regex
    return extractUserFacts(userMessage);

  } catch (error) {
    console.error('AI extraction error:', error);
    return extractUserFacts(userMessage);
  }
}

/**
 * Extract facts from a user message
 * Simple pattern matching version - can be enhanced with AI
 */
export function extractUserFacts(userMessage: string): string[] {
  const facts: string[] = [];
  const lower = userMessage.toLowerCase();
  const original = userMessage;

  // Job/work mentions
  const workPatterns = [
    /i work (?:in|at|as|for) ([^.!?,]+)/i,
    /i'm (?:a|an) ([^.!?,]+?)(?:\.|!|\?|,|$)/i,
    /my job is ([^.!?,]+)/i,
    /i do ([^.!?,]+) for (?:work|a living)/i,
  ];

  for (const pattern of workPatterns) {
    const match = original.match(pattern);
    if (match) {
      facts.push(`Works: ${match[1].trim()}`);
      break;
    }
  }

  // Location mentions
  const locationPatterns = [
    /i (?:live|am|'m) (?:in|from) ([^.!?,]+)/i,
    /i'm based (?:in|out of) ([^.!?,]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = original.match(pattern);
    if (match) {
      facts.push(`Location: ${match[1].trim()}`);
      break;
    }
  }

  // Name mentions
  const namePatterns = [
    /(?:my name is|i'm|call me|name's) (\w+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = original.match(pattern);
    if (match && match[1].length > 1 && match[1].length < 20) {
      // Avoid capturing common words
      const skipWords = ['a', 'an', 'the', 'so', 'just', 'really', 'very', 'here', 'there', 'good', 'fine', 'okay'];
      if (!skipWords.includes(match[1].toLowerCase())) {
        facts.push(`Name: ${match[1]}`);
        break;
      }
    }
  }

  // Interest/hobby mentions
  const interestPatterns = [
    /i (?:love|like|enjoy|'m into|am into) ([^.!?,]+)/i,
    /(?:my hobby is|my hobbies are|i'm passionate about) ([^.!?,]+)/i,
  ];

  for (const pattern of interestPatterns) {
    const match = original.match(pattern);
    if (match) {
      const interest = match[1].trim();
      // Avoid capturing full sentences
      if (interest.split(' ').length <= 6) {
        facts.push(`Likes: ${interest}`);
        break;
      }
    }
  }

  // Specific topic detections
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('trading')) {
    facts.push('Interested in: crypto/trading');
  }

  if (lower.includes('gym') || lower.includes('workout') || lower.includes('fitness')) {
    facts.push('Interested in: fitness');
  }

  if (lower.includes('music') || lower.includes('spotify') || lower.includes('concert')) {
    facts.push('Interested in: music');
  }

  // Deduplicate
  return Array.from(new Set(facts));
}

/**
 * Detect conversation topics from message
 */
export function detectConversationTopics(userMessage: string): string[] {
  const topics: string[] = [];
  const lower = userMessage.toLowerCase();

  const topicKeywords: Record<string, string[]> = {
    'work': ['work', 'job', 'career', 'office', 'boss', 'meeting', 'project'],
    'fitness': ['gym', 'workout', 'exercise', 'fitness', 'running', 'weights'],
    'music': ['music', 'song', 'artist', 'concert', 'spotify', 'playlist'],
    'travel': ['travel', 'vacation', 'trip', 'flight', 'hotel', 'country'],
    'food': ['food', 'restaurant', 'cooking', 'dinner', 'lunch', 'eating'],
    'movies': ['movie', 'film', 'netflix', 'watch', 'cinema', 'show'],
    'gaming': ['game', 'gaming', 'play', 'xbox', 'playstation', 'pc'],
    'sports': ['football', 'basketball', 'soccer', 'sport', 'team', 'match'],
    'relationships': ['dating', 'relationship', 'girlfriend', 'boyfriend', 'single'],
    'crypto': ['crypto', 'bitcoin', 'trading', 'stocks', 'invest'],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics;
}
