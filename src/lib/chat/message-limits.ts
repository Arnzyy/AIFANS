// =====================================================
// MESSAGE LIMITS UTILITY
// Manages monthly message allowances for chat
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js';

export interface MessageUsage {
  messages_used: number;
  messages_included: number;
  messages_purchased: number;
  messages_remaining: number;
  is_low: boolean; // ≤20 messages left
  is_depleted: boolean; // 0 messages left
}

/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-01"
}

/**
 * Check message usage for current month
 * Creates record if doesn't exist
 */
export async function checkMessageUsage(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string
): Promise<MessageUsage | null> {
  try {
    const currentMonth = getCurrentMonth();

    // Try to get existing usage
    const { data: usage, error } = await supabase
      .from('monthly_message_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('creator_id', creatorId)
      .eq('month', currentMonth)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[MessageLimits] Error fetching usage:', error);
      return null;
    }

    // If no record exists, create one with default values
    if (!usage) {
      const { data: newUsage, error: insertError } = await supabase
        .from('monthly_message_usage')
        .insert({
          user_id: userId,
          creator_id: creatorId,
          month: currentMonth,
          messages_used: 0,
          messages_included: 100,
          messages_purchased: 0,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[MessageLimits] Error creating usage:', insertError);
        return null;
      }

      return calculateUsageStats(newUsage);
    }

    return calculateUsageStats(usage);
  } catch (error) {
    console.error('[MessageLimits] Error checking usage:', error);
    return null;
  }
}

/**
 * Decrement message count (use one message)
 * Returns updated usage or null if no messages left
 */
export async function decrementMessageCount(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string
): Promise<MessageUsage | null> {
  try {
    const currentMonth = getCurrentMonth();

    // Get current usage
    const { data: usage } = await supabase
      .from('monthly_message_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('creator_id', creatorId)
      .eq('month', currentMonth)
      .maybeSingle();

    if (!usage) {
      // No record - create one and decrement
      const { data: newUsage, error: insertError } = await supabase
        .from('monthly_message_usage')
        .insert({
          user_id: userId,
          creator_id: creatorId,
          month: currentMonth,
          messages_used: 1,
          messages_included: 100,
          messages_purchased: 0,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[MessageLimits] Error creating usage:', insertError);
        return null;
      }

      return calculateUsageStats(newUsage);
    }

    // Check if user has messages left
    const totalMessages = usage.messages_included + usage.messages_purchased;
    const messagesRemaining = totalMessages - usage.messages_used;

    if (messagesRemaining <= 0) {
      console.warn('[MessageLimits] No messages remaining');
      return null; // No messages left
    }

    // Increment messages_used
    const { data: updatedUsage, error: updateError } = await supabase
      .from('monthly_message_usage')
      .update({
        messages_used: usage.messages_used + 1,
      })
      .eq('user_id', userId)
      .eq('creator_id', creatorId)
      .eq('month', currentMonth)
      .select('*')
      .single();

    if (updateError) {
      console.error('[MessageLimits] Error updating usage:', updateError);
      return null;
    }

    return calculateUsageStats(updatedUsage);
  } catch (error) {
    console.error('[MessageLimits] Error decrementing:', error);
    return null;
  }
}

/**
 * Calculate usage statistics from raw data
 */
function calculateUsageStats(usage: any): MessageUsage {
  const totalMessages = usage.messages_included + usage.messages_purchased;
  const messagesRemaining = Math.max(0, totalMessages - usage.messages_used);

  return {
    messages_used: usage.messages_used,
    messages_included: usage.messages_included,
    messages_purchased: usage.messages_purchased,
    messages_remaining: messagesRemaining,
    is_low: messagesRemaining <= 20 && messagesRemaining > 0,
    is_depleted: messagesRemaining === 0,
  };
}

/**
 * Add purchased messages to user's allowance
 */
export async function addPurchasedMessages(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  messagesToAdd: number
): Promise<MessageUsage | null> {
  try {
    const currentMonth = getCurrentMonth();

    // Get or create usage record
    const { data: usage } = await supabase
      .from('monthly_message_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('creator_id', creatorId)
      .eq('month', currentMonth)
      .maybeSingle();

    if (!usage) {
      // Create new record with purchased messages
      const { data: newUsage, error: insertError } = await supabase
        .from('monthly_message_usage')
        .insert({
          user_id: userId,
          creator_id: creatorId,
          month: currentMonth,
          messages_used: 0,
          messages_included: 100,
          messages_purchased: messagesToAdd,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[MessageLimits] Error creating usage:', insertError);
        return null;
      }

      return calculateUsageStats(newUsage);
    }

    // Add to existing purchased messages
    const { data: updatedUsage, error: updateError } = await supabase
      .from('monthly_message_usage')
      .update({
        messages_purchased: usage.messages_purchased + messagesToAdd,
      })
      .eq('user_id', userId)
      .eq('creator_id', creatorId)
      .eq('month', currentMonth)
      .select('*')
      .single();

    if (updateError) {
      console.error('[MessageLimits] Error updating purchased:', updateError);
      return null;
    }

    return calculateUsageStats(updatedUsage);
  } catch (error) {
    console.error('[MessageLimits] Error adding messages:', error);
    return null;
  }
}
