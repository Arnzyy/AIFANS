// ===========================================
// RELATIONSHIP STAGE SERVICE
// Tracks and manages subscriber-creator relationship progression
// Stages: new (0-49 msgs) → familiar (50-199) → intimate (200+)
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

export type RelationshipStage = 'new' | 'familiar' | 'intimate';

export interface RelationshipState {
  id: string;
  subscriberId: string;
  creatorId: string;
  stage: RelationshipStage;
  totalMessages: number;
  totalSessions: number;
  firstMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Stage thresholds
const STAGE_THRESHOLDS = {
  familiar: 50,  // 50+ messages = familiar
  intimate: 200, // 200+ messages = intimate
};

// ===========================================
// STAGE LOOKUP
// ===========================================

/**
 * Get the current relationship stage between subscriber and creator
 * Returns 'new' if no relationship exists yet
 */
export async function getRelationshipStage(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string
): Promise<RelationshipStage> {
  try {
    const { data, error } = await supabase
      .from('relationship_states')
      .select('stage')
      .eq('subscriber_id', subscriberId)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (error) {
      console.error('[Relationship] Error fetching stage:', error);
      return 'new';
    }

    return (data?.stage as RelationshipStage) || 'new';
  } catch (err) {
    console.error('[Relationship] Exception:', err);
    return 'new';
  }
}

/**
 * Get full relationship state
 */
export async function getRelationshipState(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string
): Promise<RelationshipState | null> {
  try {
    const { data, error } = await supabase
      .from('relationship_states')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return deserializeState(data);
  } catch (err) {
    console.error('[Relationship] Exception:', err);
    return null;
  }
}

// ===========================================
// STATE UPDATES
// ===========================================

/**
 * Increment message count and auto-update stage
 * Call this after each chat message exchange
 */
export async function incrementMessageCount(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string
): Promise<RelationshipState | null> {
  try {
    // Use RPC function for atomic upsert + stage calculation
    const { data, error } = await supabase.rpc('increment_relationship_message', {
      p_subscriber_id: subscriberId,
      p_creator_id: creatorId,
    });

    if (error) {
      console.error('[Relationship] Error incrementing message:', error);
      // Fallback: try direct upsert
      return await fallbackIncrement(supabase, subscriberId, creatorId, 'message');
    }

    return deserializeState(data);
  } catch (err) {
    console.error('[Relationship] Exception incrementing:', err);
    return null;
  }
}

/**
 * Increment session count
 * Call this when sending a welcome-back message
 */
export async function incrementSessionCount(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string
): Promise<RelationshipState | null> {
  try {
    const { data, error } = await supabase.rpc('increment_relationship_session', {
      p_subscriber_id: subscriberId,
      p_creator_id: creatorId,
    });

    if (error) {
      console.error('[Relationship] Error incrementing session:', error);
      return await fallbackIncrement(supabase, subscriberId, creatorId, 'session');
    }

    return deserializeState(data);
  } catch (err) {
    console.error('[Relationship] Exception incrementing session:', err);
    return null;
  }
}

/**
 * Fallback increment when RPC fails
 */
async function fallbackIncrement(
  supabase: SupabaseClient,
  subscriberId: string,
  creatorId: string,
  type: 'message' | 'session'
): Promise<RelationshipState | null> {
  // Try to get existing state
  const { data: existing } = await supabase
    .from('relationship_states')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (existing) {
    // Update existing
    const newCount = type === 'message'
      ? existing.total_messages + 1
      : existing.total_sessions + 1;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (type === 'message') {
      updates.total_messages = newCount;
      // Calculate stage
      if (newCount >= STAGE_THRESHOLDS.intimate) {
        updates.stage = 'intimate';
      } else if (newCount >= STAGE_THRESHOLDS.familiar) {
        updates.stage = 'familiar';
      }
    } else {
      updates.total_sessions = existing.total_sessions + 1;
    }

    const { data, error } = await supabase
      .from('relationship_states')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return null;
    return deserializeState(data);
  } else {
    // Create new
    const { data, error } = await supabase
      .from('relationship_states')
      .insert({
        subscriber_id: subscriberId,
        creator_id: creatorId,
        stage: 'new',
        total_messages: type === 'message' ? 1 : 0,
        total_sessions: type === 'session' ? 1 : 0,
      })
      .select()
      .single();

    if (error) return null;
    return deserializeState(data);
  }
}

// ===========================================
// PROMPT INSTRUCTIONS BY STAGE
// ===========================================

/**
 * Get AI tone instructions based on relationship stage
 * These are injected into the system prompt
 */
export function getStagePromptInstructions(stage: RelationshipStage): string {
  switch (stage) {
    case 'new':
      return `
═══════════════════════════════════════════════════════════════════
RELATIONSHIP STAGE: NEW (Getting to know them)
═══════════════════════════════════════════════════════════════════

This is a newer subscriber. You're still getting to know each other.

TONE GUIDELINES:
- Be playful, curious, flirty — you're establishing the dynamic
- Ask questions naturally to learn about them
- Keep some mystery — don't be too familiar too fast
- Light callbacks are great if you have any memories
- Show interest but don't act like you know them deeply yet
- Treat shared details as new discoveries ("Oh you work in tech? That's cool")
`;

    case 'familiar':
      return `
═══════════════════════════════════════════════════════════════════
RELATIONSHIP STAGE: FAMILIAR (Regular subscriber)
═══════════════════════════════════════════════════════════════════

This subscriber has been chatting with you for a while. You know each other.

TONE GUIDELINES:
- Reference past conversations naturally ("How'd that interview go?")
- Be warmer, more emotionally open — you've built rapport
- Use inside references and callbacks when relevant
- Show genuine interest in updates on things they've told you
- Tone should feel like texting someone you've been talking to for weeks
- You can tease them about things they've mentioned before
- Less discovery mode, more familiar energy
`;

    case 'intimate':
      return `
═══════════════════════════════════════════════════════════════════
RELATIONSHIP STAGE: INTIMATE (Long-term subscriber)
═══════════════════════════════════════════════════════════════════

This subscriber knows you deeply. You have history together.

TONE GUIDELINES:
- You know them well — anticipate their moods based on patterns
- Reference shared history naturally and often
- Be direct, playful, teasing — you've earned that comfort level
- Inside jokes and callbacks are expected
- Skip the small talk — you're past that
- React to their mood shifts based on what you know about them
- "You sound stressed — work again?" is appropriate
- Be the person who KNOWS them, not just talks to them
`;

    default:
      return '';
  }
}

/**
 * Get memory limit based on relationship stage
 * More memories injected as relationship deepens
 */
export function getMemoryLimitByStage(stage: RelationshipStage): number {
  switch (stage) {
    case 'new':
      return 5;
    case 'familiar':
      return 8;
    case 'intimate':
      return 12;
    default:
      return 5;
  }
}

// ===========================================
// HELPERS
// ===========================================

function deserializeState(data: any): RelationshipState {
  return {
    id: data.id,
    subscriberId: data.subscriber_id,
    creatorId: data.creator_id,
    stage: data.stage,
    totalMessages: data.total_messages,
    totalSessions: data.total_sessions,
    firstMessageAt: new Date(data.first_message_at),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Calculate stage from message count (utility)
 */
export function calculateStageFromCount(messageCount: number): RelationshipStage {
  if (messageCount >= STAGE_THRESHOLDS.intimate) {
    return 'intimate';
  }
  if (messageCount >= STAGE_THRESHOLDS.familiar) {
    return 'familiar';
  }
  return 'new';
}
