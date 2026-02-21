// ===========================================
// WELCOME BACK MESSAGE SERVICE
// AI sends first when user returns after being away
// Enhanced with cooldown, logging, and AI generation
// Enterprise grade - LYRA Platform
// ===========================================

import {
  getConversationState,
  calculateTimeContext,
  updateConversationState,
  ConversationState,
  TimeContext
} from './conversation-state';
import { RelationshipStage, getRelationshipStage, incrementSessionCount } from './relationship-stage';
import { callFastModel } from './providers';
import { UserMemory } from './enhanced-chat/memory-service';

// ===========================================
// THRESHOLDS
// ===========================================

const WELCOME_BACK_THRESHOLDS = {
  MIN_GAP_HOURS: 1,           // Minimum gap to trigger welcome back
  CASUAL_HOURS: 4,            // 1-4 hours: casual "hey"
  NOTICEABLE_HOURS: 24,       // 4-24 hours: "been a minute"
  MISSED_YOU_DAYS: 3,         // 1-3 days: "missed you"
  WHERE_WERE_YOU_DAYS: 7,     // 3-7 days: "where've you been"
  GUILT_TRIP_DAYS: 7,         // 7+ days: playful guilt trip
  AI_GENERATION_HOURS: 24,    // Use AI generation for gaps 24+ hours
  COOLDOWN_MINUTES: 30,       // Minimum time between welcome-backs
};

// ===========================================
// TYPES
// ===========================================

export interface WelcomeBackResult {
  shouldSendWelcome: boolean;
  message: string | null;
  gapDescription: string;
  hoursSinceLastMessage: number;
  wasAiGenerated?: boolean;
  relationshipStage?: RelationshipStage;
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Check if we should send a welcome-back message and generate it
 * Call this when user opens the chat
 * Enhanced with cooldown, stage awareness, and AI generation
 */
export async function getWelcomeBackMessage(
  supabase: any,
  userId: string,
  creatorId: string,
  personality: {
    persona_name?: string;
    personality_traits?: string[];
    emoji_usage?: string;
    when_complimented?: string;
  },
  memories?: UserMemory[]
): Promise<WelcomeBackResult> {
  try {
    // Get conversation state
    const state = await getConversationState(supabase, userId, creatorId);

    // If no previous conversation, no welcome back needed
    if (!state || !state.last_message_at) {
      return {
        shouldSendWelcome: false,
        message: null,
        gapDescription: 'new user',
        hoursSinceLastMessage: 0,
      };
    }

    // Calculate time gap
    const timeContext = calculateTimeContext(state.last_message_at);

    // Check if gap is long enough
    if (timeContext.hoursSinceLastMessage < WELCOME_BACK_THRESHOLDS.MIN_GAP_HOURS) {
      return {
        shouldSendWelcome: false,
        message: null,
        gapDescription: timeContext.gapDescription,
        hoursSinceLastMessage: timeContext.hoursSinceLastMessage,
      };
    }

    // Check cooldown (30 min since last welcome-back)
    const onCooldown = await checkWelcomeBackCooldown(supabase, userId, creatorId);
    if (onCooldown) {
      console.log('[WelcomeBack] Skipping - on cooldown');
      return {
        shouldSendWelcome: false,
        message: null,
        gapDescription: 'cooldown',
        hoursSinceLastMessage: timeContext.hoursSinceLastMessage,
      };
    }

    // Get relationship stage for tone adjustment
    const relationshipStage = await getRelationshipStage(supabase, userId, creatorId);

    // Determine if we should use AI generation (24+ hour gaps)
    const shouldUseAI = timeContext.hoursSinceLastMessage >= WELCOME_BACK_THRESHOLDS.AI_GENERATION_HOURS;

    let message: string;
    let wasAiGenerated = false;

    if (shouldUseAI && memories && memories.length > 0) {
      // Use AI generation for longer gaps with memory context
      try {
        message = await generateAIWelcomeBack(
          timeContext,
          state,
          personality,
          relationshipStage,
          memories
        );
        wasAiGenerated = true;
      } catch (aiError) {
        console.error('[WelcomeBack] AI generation failed, using template:', aiError);
        message = generateWelcomeBackMessage(timeContext, state, personality, relationshipStage);
      }
    } else {
      // Use template generation for shorter gaps
      message = generateWelcomeBackMessage(timeContext, state, personality, relationshipStage);
    }

    // Log the welcome-back (non-blocking)
    logWelcomeBack(supabase, userId, creatorId, message, timeContext.hoursSinceLastMessage, memories || [], relationshipStage)
      .catch(err => console.error('[WelcomeBack] Log error:', err));

    // Increment session count (non-blocking)
    incrementSessionCount(supabase, userId, creatorId)
      .catch(err => console.error('[WelcomeBack] Session increment error:', err));

    return {
      shouldSendWelcome: true,
      message,
      gapDescription: timeContext.gapDescription,
      hoursSinceLastMessage: timeContext.hoursSinceLastMessage,
      wasAiGenerated,
      relationshipStage,
    };

  } catch (error) {
    console.error('Welcome back check error (non-fatal):', error);
    return {
      shouldSendWelcome: false,
      message: null,
      gapDescription: 'error',
      hoursSinceLastMessage: 0,
    };
  }
}

// ===========================================
// COOLDOWN CHECK
// ===========================================

async function checkWelcomeBackCooldown(
  supabase: any,
  subscriberId: string,
  creatorId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_welcome_back_cooldown', {
      p_subscriber_id: subscriberId,
      p_creator_id: creatorId,
    });

    if (error) {
      // If RPC doesn't exist, do manual check
      const { data: lastLog } = await supabase
        .from('welcome_back_log')
        .select('created_at')
        .eq('subscriber_id', subscriberId)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastLog) return false;

      const lastTime = new Date(lastLog.created_at).getTime();
      const now = Date.now();
      const cooldownMs = WELCOME_BACK_THRESHOLDS.COOLDOWN_MINUTES * 60 * 1000;
      return now - lastTime < cooldownMs;
    }

    return data === true;
  } catch (err) {
    console.log('[WelcomeBack] Cooldown check failed (allowing):', err);
    return false; // Allow on error
  }
}

// ===========================================
// WELCOME BACK LOGGING
// ===========================================

async function logWelcomeBack(
  supabase: any,
  subscriberId: string,
  creatorId: string,
  message: string,
  gapHours: number,
  memoriesUsed: UserMemory[],
  relationshipStage: RelationshipStage
): Promise<void> {
  try {
    await supabase.from('welcome_back_log').insert({
      subscriber_id: subscriberId,
      creator_id: creatorId,
      message,
      gap_hours: gapHours,
      memories_used: memoriesUsed.map(m => ({ category: m.category, fact: m.fact })),
      relationship_stage: relationshipStage,
    });
  } catch (err) {
    // Non-fatal - logging failure shouldn't break welcome-back
    console.error('[WelcomeBack] Failed to log:', err);
  }
}

// ===========================================
// AI GENERATION FOR LONG GAPS
// ===========================================

async function generateAIWelcomeBack(
  timeContext: TimeContext,
  state: ConversationState,
  personality: {
    persona_name?: string;
    personality_traits?: string[];
    emoji_usage?: string;
  },
  relationshipStage: RelationshipStage,
  memories: UserMemory[]
): Promise<string> {
  const useEmoji = personality.emoji_usage !== 'none';
  const traits = personality.personality_traits?.join(', ') || 'friendly, flirty';

  // Format memories for context
  const memoryContext = memories
    .slice(0, 5)
    .map(m => `- ${m.fact}`)
    .join('\n');

  const prompt = `You are ${personality.persona_name || 'an AI companion'}.
Your personality: ${traits}
Emoji usage: ${useEmoji ? 'use emojis naturally' : 'no emojis'}
Relationship stage with user: ${relationshipStage}

What you know about this user:
${memoryContext || 'No specific memories yet.'}

The user hasn't messaged you in ${formatGap(timeContext)}.

Write a SHORT (1-2 sentences max) welcome-back message that:
- Acknowledges the gap playfully${relationshipStage === 'intimate' ? ' (you can be more direct/teasing with long-term subscribers)' : ''}
- References a memory if relevant (but don't force it)
- Matches your personality
- Invites them to chat

Just respond with the message, nothing else.`;

  const response = await callFastModel({
    systemPrompt: 'You are generating a welcome-back message. Be brief, warm, and natural.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 100,
  });

  // Clean up the response
  let message = response.content.trim();

  // Remove quotes if AI wrapped it
  if ((message.startsWith('"') && message.endsWith('"')) ||
      (message.startsWith("'") && message.endsWith("'"))) {
    message = message.slice(1, -1);
  }

  return message;
}

function formatGap(timeContext: TimeContext): string {
  if (timeContext.daysSinceLastMessage >= 7) {
    return `over a week (${timeContext.daysSinceLastMessage} days)`;
  } else if (timeContext.daysSinceLastMessage >= 1) {
    return `${timeContext.daysSinceLastMessage} day${timeContext.daysSinceLastMessage > 1 ? 's' : ''}`;
  } else {
    return `${Math.round(timeContext.hoursSinceLastMessage)} hours`;
  }
}

/**
 * Generate the welcome back message based on gap and context
 * Now stage-aware for appropriate intimacy level
 */
function generateWelcomeBackMessage(
  timeContext: TimeContext,
  state: ConversationState,
  personality: {
    persona_name?: string;
    personality_traits?: string[];
    emoji_usage?: string;
  },
  relationshipStage: RelationshipStage = 'new'
): string {
  const { hoursSinceLastMessage, daysSinceLastMessage } = timeContext;
  const name = personality.persona_name || 'AI';
  const useEmoji = personality.emoji_usage !== 'none';

  // Get user facts for personalization
  const userFacts = state.user_facts || [];
  const userName = extractUserName(userFacts);
  const userInterest = extractUserInterest(userFacts);

  // Build message based on gap length AND relationship stage
  let messages: string[];

  if (daysSinceLastMessage >= 7) {
    // 7+ days - playful guilt trip (more teasing for intimate)
    if (relationshipStage === 'intimate') {
      messages = [
        `Okay ${userName || 'babe'}, ${daysSinceLastMessage} days? Really? ${useEmoji ? '😤' : ''}`,
        `You better have a good excuse for ghosting me ${useEmoji ? '😏' : ''}`,
        `Finally! I was about to send a search party ${useEmoji ? '💔' : ''}`,
        `Oh so NOW you remember I exist ${useEmoji ? '🙄' : ''} Missed you though`,
      ];
    } else {
      messages = [
        `Well well well... look who finally decided to show up ${useEmoji ? '😏' : ''}`,
        `Oh wow, you're alive! Thought you forgot about me ${useEmoji ? '👀' : ''}`,
        `${daysSinceLastMessage} days?? Did you miss me or what ${useEmoji ? '😏' : ''}`,
        `Finally! I was starting to think you ghosted me ${useEmoji ? '💔' : ''}`,
        `Look who remembered I exist ${useEmoji ? '😏' : ''} Where've you been?`,
      ];
    }
  } else if (daysSinceLastMessage >= 3) {
    // 3-7 days - "where've you been"
    if (relationshipStage === 'intimate') {
      messages = [
        `There you are ${useEmoji ? '💕' : ''} Missed your face`,
        `Finally! Was wondering when you'd come back to me ${useEmoji ? '😌' : ''}`,
        `Hey you ${useEmoji ? '😏' : ''} Thought about you...`,
      ];
    } else if (relationshipStage === 'familiar') {
      messages = [
        `Hey stranger ${useEmoji ? '😏' : ''} Been a few days...`,
        `Miss me? ${useEmoji ? '😊' : ''} It's been a minute`,
        `There you are ${useEmoji ? '💕' : ''} Where've you been hiding?`,
      ];
    } else {
      messages = [
        `Hey ${useEmoji ? '👋' : ''} Good to see you back`,
        `Oh hey you ${useEmoji ? '😊' : ''} Been a little while`,
        `Hey there ${useEmoji ? '✨' : ''} How have you been?`,
      ];
    }
  } else if (daysSinceLastMessage >= 1) {
    // 1-3 days - "missed you"
    messages = [
      `Hey you ${useEmoji ? '😊' : ''} How's your day going?`,
      `Hey ${useEmoji ? '💕' : ''} Missed our chats`,
      `There you are ${useEmoji ? '😏' : ''} What's up?`,
      `Hey! Back for more? ${useEmoji ? '😏' : ''}`,
      `Hi ${useEmoji ? '✨' : ''} Good to see you`,
    ];
  } else if (hoursSinceLastMessage >= 4) {
    // 4-24 hours - "been a minute"
    messages = [
      `Hey ${useEmoji ? '😊' : ''} How's it going?`,
      `Hi again ${useEmoji ? '💕' : ''}`,
      `Hey you ${useEmoji ? '😏' : ''} Miss me?`,
      `What's up? ${useEmoji ? '✨' : ''}`,
      `Hey ${useEmoji ? '👋' : ''} Good timing`,
    ];
  } else {
    // 1-4 hours - casual
    messages = [
      `Hey ${useEmoji ? '😊' : ''}`,
      `Hi ${useEmoji ? '💕' : ''}`,
      `What's up? ${useEmoji ? '😏' : ''}`,
      `Hey you ${useEmoji ? '✨' : ''}`,
    ];
  }

  // Pick random message
  let message = messages[Math.floor(Math.random() * messages.length)];

  // Personalize with user name if we have it (more likely for familiar/intimate)
  const nameChance = relationshipStage === 'new' ? 0.3 : relationshipStage === 'familiar' ? 0.5 : 0.7;
  if (userName && Math.random() < nameChance && !message.includes(userName)) {
    message = message.replace(/^(Hey|Hi|Oh hey|There)/, `$1 ${userName}`);
  }

  // Add interest callback for longer gaps (more likely for established relationships)
  const callbackChance = relationshipStage === 'new' ? 0.3 : relationshipStage === 'familiar' ? 0.5 : 0.6;
  if (userInterest && daysSinceLastMessage >= 1 && Math.random() < callbackChance) {
    const callbacks = [
      ` Still ${userInterest}?`,
      ` How's the ${userInterest} going?`,
      ` ${userInterest.charAt(0).toUpperCase() + userInterest.slice(1)} keeping you busy?`,
    ];
    message += callbacks[Math.floor(Math.random() * callbacks.length)];
  }

  return message;
}

/**
 * Extract user's name from facts
 */
function extractUserName(facts: string[]): string | null {
  for (const fact of facts) {
    if (fact.toLowerCase().startsWith('name:')) {
      return fact.split(':')[1]?.trim() || null;
    }
  }
  return null;
}

/**
 * Extract user's main interest from facts
 */
function extractUserInterest(facts: string[]): string | null {
  for (const fact of facts) {
    const lower = fact.toLowerCase();
    if (lower.includes('works:') || lower.includes('work:')) {
      const work = fact.split(':')[1]?.trim();
      if (work?.toLowerCase().includes('crypto')) return 'crypto';
      if (work?.toLowerCase().includes('trading')) return 'trading';
      return 'work';
    }
    if (lower.includes('interested in:') || lower.includes('likes:')) {
      return fact.split(':')[1]?.trim()?.toLowerCase() || null;
    }
  }
  return null;
}
