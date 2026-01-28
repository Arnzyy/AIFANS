// ===========================================
// MEMORY UTILITIES (V1 Compatibility Layer)
// Provides memory functions for legacy routes
// For user-facing memory controls (GDPR) and mock routes
// ===========================================

type SupabaseClient = any;

// ===========================================
// TYPES
// ===========================================

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
  personal_facts: string[];
  message_count: number;
  last_interaction?: string;
}

export interface ConversationContext {
  memory: UserMemory | null;
  summary: string | null;
  recent_messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  is_birthday?: boolean;
}

// ===========================================
// BUILD CHAT CONTEXT
// ===========================================

export async function buildChatContext(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string,
  maxRecentMessages: number = 30
): Promise<ConversationContext> {
  // Get user profile for fallback name and birthday
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('display_name, username, date_of_birth')
    .eq('id', subscriberId)
    .single();

  // Check if today is user's birthday
  let isBirthday = false;
  if (userProfile?.date_of_birth) {
    const today = new Date();
    const dob = new Date(userProfile.date_of_birth);
    isBirthday = today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
  }

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
      personal_facts: [],
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

  let recentMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Try AI chat sessions first
  const { data: aiSession } = await supabase
    .from('ai_chat_sessions')
    .select('id')
    .eq('user_id', subscriberId)
    .eq('creator_id', creatorId)
    .single();

  if (aiSession) {
    const { data: aiMessages } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', aiSession.id)
      .order('created_at', { ascending: false })
      .limit(maxRecentMessages);

    if (aiMessages && aiMessages.length > 0) {
      recentMessages = aiMessages.reverse().map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    }
  }

  // Fallback to conversations table
  if (recentMessages.length === 0) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${subscriberId},participant2_id.eq.${creatorId}),` +
        `and(participant1_id.eq.${creatorId},participant2_id.eq.${subscriberId})`
      )
      .single();

    if (conversation) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(maxRecentMessages);

      if (messages && messages.length > 0) {
        recentMessages = messages.reverse().map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    }
  }

  return {
    memory: enrichedMemory,
    summary: summaryData?.summary || null,
    recent_messages: recentMessages,
    is_birthday: isBirthday,
  };
}

// ===========================================
// FORMAT MEMORY FOR PROMPT
// ===========================================

export function formatMemoryForPrompt(context: ConversationContext): string {
  if (!context.memory && !context.summary && !context.is_birthday) {
    return '';
  }

  let memoryPrompt = '\n═══════════════════════════════════════════\nUSER CONTEXT (USE NATURALLY)\n═══════════════════════════════════════════\n';

  if (context.is_birthday) {
    memoryPrompt += `🎂 IT'S THEIR BIRTHDAY TODAY! Wish them a happy birthday naturally.\n\n`;
  }

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
      if (m.preferences.topics_enjoyed?.length) {
        memoryPrompt += `Enjoys: ${m.preferences.topics_enjoyed.join(', ')}\n`;
      }
    }

    if (m.personal_facts?.length) {
      memoryPrompt += `Personal details: ${m.personal_facts.join(', ')}\n`;
    }
  }

  if (context.summary) {
    memoryPrompt += `\nContext: ${context.summary}\n`;
  }

  return memoryPrompt;
}

// ===========================================
// UPDATE MEMORY (Simplified - no AI extraction)
// ===========================================

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

  // Just update message count and last interaction (simplified version)
  const userMessageCount = messages.filter(m => m.role === 'user').length;

  await supabase
    .from('user_memory')
    .upsert({
      subscriber_id: subscriberId,
      creator_id: creatorId,
      message_count: (existing?.message_count || 0) + userMessageCount,
      last_interaction: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Preserve existing memory data
      preferred_name: existing?.preferred_name,
      interests: existing?.interests || [],
      preferences: existing?.preferences || {},
      running_jokes: existing?.running_jokes || [],
      neutral_topics: existing?.neutral_topics || [],
      personal_facts: existing?.personal_facts || [],
    }, {
      onConflict: 'subscriber_id,creator_id',
    });
}

// ===========================================
// USER CONTROLS (GDPR Compliance)
// ===========================================

export async function clearUserMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from('user_memory').delete().eq('subscriber_id', userId);
  await supabase.from('conversation_summaries').delete().eq('subscriber_id', userId);
}

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
