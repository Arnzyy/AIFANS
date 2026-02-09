// ===========================================
// AI TIP ACKNOWLEDGEMENT
// Safe, one-time acknowledgement prompt injection
// ===========================================

/**
 * TIP_RECEIVED Prompt Injection
 * 
 * When a user sends a tip, this prompt is injected into the NEXT assistant turn ONLY.
 * It ensures the AI acknowledges the tip gracefully without:
 * - Asking for more tips
 * - Promising anything in exchange
 * - Escalating sexual content
 * - Using dependence/exclusivity language
 */

export const TIP_ACKNOWLEDGEMENT_PROMPT = `
[SYSTEM NOTE: USER JUST TIPPED YOU]
Work a BRIEF acknowledgement into your response naturally, then CONTINUE the conversation.
Don't make the whole message about the tip — it's a quick aside, not the focus.

HOW TO ACKNOWLEDGE:
- Weave it in naturally at the start, then continue
- Match your personality's reaction style
- Keep the tip mention to ONE quick phrase
- Then respond to their message OR continue what you were discussing

GOOD EXAMPLES (brief + continues):
✅ "You're spoiling me 😏 Now where were we..."
✅ "Aw you're sweet 💕 So you were saying?"
✅ "Look who's being generous... I see you 😏 Anyway—"
✅ "Mm, I like that energy. Now, what were you saying about..."
✅ "Someone's trying to get on my good side 😏 It's working..."

BAD EXAMPLES (kills flow):
❌ "Thank you so much! You're so generous! 💕" (whole message is just thanks)
❌ "Omg thank you!! That means so much to me!!" (over the top)
❌ "Thanks for the tip! What would you like to talk about?" (transactional)
❌ Making the entire response about gratitude

CRITICAL: Quick acknowledgement → continue conversation. Don't derail the flow.
[END TIP NOTE]
`;

/**
 * Check if a message should trigger tip acknowledgement
 */
export interface TipEvent {
  tipId: string;
  userId: string;
  creatorId: string;
  amountTokens: number;
  threadId?: string;
  timestamp: string;
}

/**
 * Build system prompt addition for tip acknowledgement
 * Returns empty string if no pending tip
 */
export function buildTipAcknowledgementPrompt(pendingTip: TipEvent | null): string {
  if (!pendingTip) {
    return '';
  }

  return `
${TIP_ACKNOWLEDGEMENT_PROMPT}

[TIP DETAILS]
Amount: ${pendingTip.amountTokens} tokens
[END TIP DETAILS]
`;
}

/**
 * Example usage in chat service:
 * 
 * ```ts
 * // In your chat message handler:
 * 
 * // Check for pending tip event for this thread
 * const pendingTip = await getPendingTipEvent(threadId);
 * 
 * // Build system prompt
 * let systemPrompt = buildNSFWSystemPrompt(config); // or SFW
 * 
 * // Add tip acknowledgement if pending
 * if (pendingTip) {
 *   systemPrompt += buildTipAcknowledgementPrompt(pendingTip);
 *   
 *   // Mark tip as acknowledged (so it doesn't repeat)
 *   await markTipAcknowledged(pendingTip.tipId);
 * }
 * 
 * // Continue with AI call...
 * ```
 */

// ===========================================
// TIP EVENT HANDLING
// ===========================================

/**
 * Store a tip event for acknowledgement
 * Called when tip is successfully sent
 */
export async function storeTipEvent(
  supabase: any,
  tipEvent: TipEvent
): Promise<void> {
  // Store in a simple key-value or use Redis in production
  // For now, we'll use a simple approach with the tips table
  
  await supabase
    .from('tips')
    .update({ 
      metadata: { 
        needs_acknowledgement: true,
        acknowledged_at: null 
      } 
    })
    .eq('id', tipEvent.tipId);
}

/**
 * Get pending tip event for a thread
 * Returns the most recent unacknowledged tip
 */
export async function getPendingTipEvent(
  supabase: any,
  threadId: string
): Promise<TipEvent | null> {
  const { data, error } = await supabase
    .from('tips')
    .select('id, user_id, creator_id, amount_tokens, thread_id, created_at')
    .eq('thread_id', threadId)
    .eq('status', 'SUCCEEDED')
    .is('metadata->needs_acknowledgement', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    tipId: data.id,
    userId: data.user_id,
    creatorId: data.creator_id,
    amountTokens: data.amount_tokens,
    threadId: data.thread_id,
    timestamp: data.created_at,
  };
}

/**
 * Mark tip as acknowledged
 * Prevents repeat acknowledgements
 */
export async function markTipAcknowledged(
  supabase: any,
  tipId: string
): Promise<void> {
  await supabase
    .from('tips')
    .update({
      metadata: {
        needs_acknowledgement: false,
        acknowledged_at: new Date().toISOString(),
      },
    })
    .eq('id', tipId);
}
