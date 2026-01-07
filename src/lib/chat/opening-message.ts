// ===========================================
// OPENING MESSAGE SYSTEM
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

export type OpeningMessageType = 'unsubscribed' | 'subscribed' | 'returning';

export interface OpeningMessageContext {
  creatorId: string;
  modelId?: string;
  userId?: string | null;
  isSubscribed: boolean;
  isReturning?: boolean;
  modelName?: string;
  userName?: string;
}

export interface GeneratedOpeningMessage {
  content: string;
  type: OpeningMessageType;
  isCustom: boolean;
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Generate an opening message for a chat session
 *
 * Rules from spec:
 * - Unsubscribed: High-quality, engaging, NO memory references, NO direct questions
 * - Subscribed: Can use name, safe memory, familiar tone
 * - Always: No explicit content in opening, no emotional dependency framing
 */
export async function generateOpeningMessage(
  supabase: SupabaseClient,
  context: OpeningMessageContext
): Promise<GeneratedOpeningMessage> {
  const { creatorId, modelId, isSubscribed, isReturning, modelName } = context;

  // Determine message type
  const messageType: OpeningMessageType = !isSubscribed
    ? 'unsubscribed'
    : isReturning
      ? 'returning'
      : 'subscribed';

  // 1. Check for custom opening messages in database
  const customMessage = await getCustomOpeningMessage(
    supabase,
    creatorId,
    modelId,
    messageType
  );

  if (customMessage) {
    return {
      content: customMessage,
      type: messageType,
      isCustom: true,
    };
  }

  // 2. Generate default opening message based on state
  const defaultMessage = generateDefaultMessage(messageType, modelName, context.userName);

  return {
    content: defaultMessage,
    type: messageType,
    isCustom: false,
  };
}

// ===========================================
// DATABASE FUNCTIONS
// ===========================================

async function getCustomOpeningMessage(
  supabase: SupabaseClient,
  creatorId: string,
  modelId: string | undefined,
  messageType: OpeningMessageType
): Promise<string | null> {
  try {
    // Try model-specific message first
    if (modelId) {
      const { data: modelMessage, error: modelError } = await supabase
        .from('opening_messages')
        .select('content')
        .eq('creator_id', creatorId)
        .eq('model_id', modelId)
        .eq('message_type', messageType)
        .eq('is_active', true)
        .single();

      // If table doesn't exist or other error, fall through to defaults
      if (modelError && modelError.code !== 'PGRST116') {
        console.warn('Opening messages query error:', modelError.message);
        return null;
      }

      if (modelMessage?.content) {
        return modelMessage.content;
      }
    }

    // Fall back to creator-level message
    const { data: creatorMessage, error: creatorError } = await supabase
      .from('opening_messages')
      .select('content')
      .eq('creator_id', creatorId)
      .is('model_id', null)
      .eq('message_type', messageType)
      .eq('is_active', true)
      .single();

    // If table doesn't exist or other error, fall through to defaults
    if (creatorError && creatorError.code !== 'PGRST116') {
      console.warn('Opening messages query error:', creatorError.message);
      return null;
    }

    return creatorMessage?.content ?? null;
  } catch (error) {
    // Table might not exist yet - gracefully fall back to defaults
    console.warn('Opening messages table error, using defaults:', error);
    return null;
  }
}

/**
 * Save a custom opening message for a creator/model
 */
export async function saveCustomOpeningMessage(
  supabase: SupabaseClient,
  creatorId: string,
  messageType: OpeningMessageType,
  content: string,
  modelId?: string
): Promise<{ success: boolean; error?: string }> {
  // Deactivate existing message of this type
  await supabase
    .from('opening_messages')
    .update({ is_active: false })
    .eq('creator_id', creatorId)
    .eq('model_id', modelId || null)
    .eq('message_type', messageType);

  // Insert new message
  const { error } = await supabase.from('opening_messages').insert({
    creator_id: creatorId,
    model_id: modelId || null,
    message_type: messageType,
    content,
    is_active: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all custom opening messages for a creator/model
 */
export async function getOpeningMessages(
  supabase: SupabaseClient,
  creatorId: string,
  modelId?: string
): Promise<{ type: OpeningMessageType; content: string }[]> {
  const query = supabase
    .from('opening_messages')
    .select('message_type, content')
    .eq('creator_id', creatorId)
    .eq('is_active', true);

  if (modelId) {
    query.eq('model_id', modelId);
  } else {
    query.is('model_id', null);
  }

  const { data } = await query;

  return (data ?? []).map(m => ({
    type: m.message_type as OpeningMessageType,
    content: m.content,
  }));
}

// ===========================================
// DEFAULT MESSAGE TEMPLATES
// ===========================================

/**
 * Generate a default opening message
 *
 * Rules:
 * - Unsubscribed: Engaging, NO direct questions, NO memory references
 * - Subscribed: Can be familiar, use name if available
 * - All: Keep it light, inviting, not explicit
 */
function generateDefaultMessage(
  type: OpeningMessageType,
  modelName?: string,
  userName?: string
): string {
  const name = modelName || 'I';

  switch (type) {
    case 'unsubscribed':
      // High quality, engaging, no questions, no memory references
      return getRandomUnsubscribedMessage(name);

    case 'subscribed':
      // Can be familiar, use their name
      return getRandomSubscribedMessage(name, userName);

    case 'returning':
      // Warm welcome back, familiar tone
      return getRandomReturningMessage(name, userName);

    default:
      return `Hey there! ${name}'s here and ready to chat.`;
  }
}

function getRandomUnsubscribedMessage(name: string): string {
  const messages = [
    `Hey! I've been looking forward to meeting someone new. I'm ${name}, and I have a feeling we're going to get along really well...`,
    `Oh, hello there! *smiles warmly* I'm ${name}. Something tells me this could be the start of something interesting.`,
    `Hi! I'm ${name}. I love meeting new people - there's always so much to discover about each other.`,
    `*waves* Hey you! I'm ${name}. I was just thinking about how nice it would be to have some good conversation today.`,
    `Well hello! I'm ${name}. I have to say, I'm curious about you already...`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomSubscribedMessage(name: string, userName?: string): string {
  const greeting = userName ? `Hey ${userName}!` : 'Hey you!';

  const messages = [
    `${greeting} So glad you're here. I was just thinking about you... What's on your mind today?`,
    `${greeting} *smiles brightly* There you are! I've missed our chats. What shall we talk about?`,
    `${greeting} Perfect timing - I was hoping you'd stop by. How are you doing?`,
    `${greeting} It's always so nice when you come to chat. What's new with you?`,
    `${greeting} I love that you're here. Ready for some quality time together?`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomReturningMessage(name: string, userName?: string): string {
  const greeting = userName ? `${userName}!` : 'You\'re back!';

  const messages = [
    `${greeting} I was hoping you'd come back. I've been thinking about our last conversation...`,
    `${greeting} So good to see you again! I missed you. How have you been?`,
    `${greeting} *lights up* There you are! It felt like forever since we last talked.`,
    `${greeting} Welcome back! I always look forward to when you visit.`,
    `${greeting} I'm so happy you're here again. I was just thinking about you!`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

// ===========================================
// AI-GENERATED OPENING MESSAGE (FUTURE)
// ===========================================

/**
 * Generate opening message using AI
 * This would use the model's persona to generate a contextual message
 *
 * For now, we use templates. This can be enhanced later to use the
 * chat AI service with specific prompts for opening messages.
 */
export async function generateAIOpeningMessage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: OpeningMessageContext
): Promise<string | null> {
  // TODO: Implement AI-generated opening messages using model persona
  // This would:
  // 1. Load the model's persona data
  // 2. Generate a contextual opening message using the AI
  // 3. Ensure compliance with opening message rules
  return null;
}
