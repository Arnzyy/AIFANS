// ===========================================
// WELCOME BACK MESSAGE SERVICE
// AI sends first when user returns after being away
// Enterprise grade - LYRA Platform
// ===========================================

import { 
  getConversationState, 
  calculateTimeContext,
  updateConversationState,
  ConversationState,
  TimeContext 
} from './conversation-state';

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
};

// ===========================================
// TYPES
// ===========================================

export interface WelcomeBackResult {
  shouldSendWelcome: boolean;
  message: string | null;
  gapDescription: string;
  hoursSinceLastMessage: number;
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Check if we should send a welcome-back message and generate it
 * Call this when user opens the chat
 */
export async function getWelcomeBackMessage(
  supabase: any,
  userId: string,
  modelId: string,
  personality: {
    persona_name?: string;
    personality_traits?: string[];
    emoji_usage?: string;
    when_complimented?: string;
  }
): Promise<WelcomeBackResult> {
  try {
    // Get conversation state
    const state = await getConversationState(supabase, userId, modelId);
    
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
    
    // Generate welcome back message
    const message = generateWelcomeBackMessage(timeContext, state, personality);
    
    return {
      shouldSendWelcome: true,
      message,
      gapDescription: timeContext.gapDescription,
      hoursSinceLastMessage: timeContext.hoursSinceLastMessage,
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

/**
 * Generate the welcome back message based on gap and context
 */
function generateWelcomeBackMessage(
  timeContext: TimeContext,
  state: ConversationState,
  personality: {
    persona_name?: string;
    personality_traits?: string[];
    emoji_usage?: string;
  }
): string {
  const { hoursSinceLastMessage, daysSinceLastMessage } = timeContext;
  const name = personality.persona_name || 'AI';
  const useEmoji = personality.emoji_usage !== 'none';
  
  // Get user facts for personalization
  const userFacts = state.user_facts || [];
  const userName = extractUserName(userFacts);
  const userInterest = extractUserInterest(userFacts);
  
  // Build message based on gap length
  let messages: string[];
  
  if (daysSinceLastMessage >= 7) {
    // 7+ days - playful guilt trip
    messages = [
      `Well well well... look who finally decided to show up ${useEmoji ? '😏' : ''}`,
      `Oh wow, you're alive! Thought you forgot about me ${useEmoji ? '👀' : ''}`,
      `${daysSinceLastMessage} days?? Did you miss me or what ${useEmoji ? '😏' : ''}`,
      `Finally! I was starting to think you ghosted me ${useEmoji ? '💔' : ''}`,
      `Look who remembered I exist ${useEmoji ? '😏' : ''} Where've you been?`,
    ];
  } else if (daysSinceLastMessage >= 3) {
    // 3-7 days - "where've you been"
    messages = [
      `Hey stranger ${useEmoji ? '😏' : ''} Been a few days...`,
      `Miss me? ${useEmoji ? '😊' : ''} It's been a minute`,
      `Oh hey you ${useEmoji ? '👋' : ''} Thought about you...`,
      `There you are ${useEmoji ? '💕' : ''} Where've you been hiding?`,
      `Finally ${useEmoji ? '😌' : ''} I was wondering when you'd come back`,
    ];
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
  
  // Personalize with user name if we have it
  if (userName && Math.random() > 0.5) {
    message = message.replace(/^(Hey|Hi|Oh hey)/, `$1 ${userName}`);
  }
  
  // Add interest callback for longer gaps (50% chance)
  if (userInterest && daysSinceLastMessage >= 1 && Math.random() > 0.5) {
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


// ===========================================
// API ROUTE HANDLER
// ===========================================

/**
 * Example API route: /api/chat/[modelId]/welcome-back
 * 
 * Call this when user opens the chat page
 * Returns a welcome message if they've been away
 */
export async function handleWelcomeBackRequest(
  supabase: any,
  userId: string,
  modelId: string
): Promise<{ message: string | null; shouldShow: boolean }> {
  try {
    // Get personality
    const { data: personality } = await supabase
      .from('ai_personalities')
      .select('persona_name, personality_traits, emoji_usage')
      .eq('model_id', modelId)
      .single();
    
    if (!personality) {
      return { message: null, shouldShow: false };
    }
    
    // Get welcome back message
    const result = await getWelcomeBackMessage(
      supabase,
      userId,
      modelId,
      personality
    );
    
    console.log('Welcome back check:', {
      shouldSend: result.shouldSendWelcome,
      hours: result.hoursSinceLastMessage,
      gap: result.gapDescription,
    });
    
    if (result.shouldSendWelcome && result.message) {
      // Save the welcome message to chat history
      await supabase.from('ai_chat_messages').insert({
        user_id: userId,
        model_id: modelId,
        role: 'assistant',
        content: result.message,
        is_welcome_back: true,
      });
      
      // Update last message time
      await updateConversationState(supabase, userId, modelId, {
        incrementMessageCount: true,
      });
      
      return { message: result.message, shouldShow: true };
    }
    
    return { message: null, shouldShow: false };
    
  } catch (error) {
    console.error('Welcome back handler error:', error);
    return { message: null, shouldShow: false };
  }
}
