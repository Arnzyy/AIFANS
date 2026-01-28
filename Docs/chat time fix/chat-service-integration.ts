// ============================================
// CHAT SERVICE INTEGRATION
// Add this code to your existing chat-service.ts
// ============================================

// 1. ADD IMPORTS AT TOP OF FILE
// ============================================

import { 
  getConversationState, 
  calculateTimeContext, 
  buildTimeContextPrompt,
  updateConversationState,
  extractUserFacts,
  detectConversationTopics
} from '@/lib/ai/conversation-state';


// 2. INSIDE YOUR MAIN CHAT HANDLER FUNCTION
// ============================================
// Add this BEFORE you build the system prompt

async function handleChatMessage(
  supabase: any,
  userId: string,
  modelId: string,
  userMessage: string,
  conversationHistory: any[],
  personality: any
) {
  // ========================================
  // STEP 1: Load conversation state
  // ========================================
  const conversationState = await getConversationState(supabase, userId, modelId);
  
  console.log('=== CONVERSATION STATE ===');
  console.log('State exists:', !!conversationState);
  console.log('Last message:', conversationState?.last_message_at);
  console.log('Message count:', conversationState?.message_count);
  console.log('User facts:', conversationState?.user_facts);

  // ========================================
  // STEP 2: Calculate time context
  // ========================================
  const timeContext = calculateTimeContext(conversationState?.last_message_at);
  
  console.log('=== TIME CONTEXT ===');
  console.log('Days since last:', timeContext.daysSinceLastMessage);
  console.log('Hours since last:', timeContext.hoursSinceLastMessage);
  console.log('Should acknowledge gap:', timeContext.shouldAcknowledgeGap);
  console.log('Gap description:', timeContext.gapDescription);

  // ========================================
  // STEP 3: Build time-aware prompt
  // ========================================
  const timeContextPrompt = buildTimeContextPrompt(
    timeContext, 
    conversationState, 
    personality.persona_name || 'AI'
  );

  // ========================================
  // STEP 4: Combine into full system prompt
  // ========================================
  const fullSystemPrompt = [
    MASTER_SYSTEM_PROMPT,
    buildPersonalityPrompt(personality),
    timeContextPrompt,  // <-- ADD THIS
  ].filter(Boolean).join('\n\n');

  console.log('=== SYSTEM PROMPT ===');
  console.log('Total length:', fullSystemPrompt.length);
  console.log('Has time context:', timeContextPrompt.length > 0);

  // ========================================
  // STEP 5: Make your API call as normal
  // ========================================
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: fullSystemPrompt,
      messages: conversationHistory,
    }),
  });

  const data = await response.json();
  const aiResponse = data.content[0].text;

  // ========================================
  // STEP 6: Update conversation state (async, non-blocking)
  // ========================================
  
  // Extract any new facts from user's message
  const newFacts = extractUserFacts(userMessage);
  const newTopics = detectConversationTopics(userMessage);
  
  console.log('=== EXTRACTED FROM MESSAGE ===');
  console.log('New facts:', newFacts);
  console.log('New topics:', newTopics);

  // Update state in background (don't await - non-critical)
  updateConversationState(supabase, userId, modelId, {
    incrementMessageCount: true,
  }).catch(err => console.error('State update error:', err));

  // Store any new facts found
  for (const fact of newFacts) {
    updateConversationState(supabase, userId, modelId, {
      newFact: fact,
      incrementMessageCount: false,
    }).catch(err => console.error('Fact update error:', err));
  }

  // Store any topics detected
  for (const topic of newTopics) {
    updateConversationState(supabase, userId, modelId, {
      newTopic: topic,
      incrementMessageCount: false,
    }).catch(err => console.error('Topic update error:', err));
  }

  return aiResponse;
}


// ============================================
// ALTERNATIVE: SIMPLER INTEGRATION
// If you don't want to restructure, just add this
// before your API call:
// ============================================

/*
// Get last message timestamp from conversation history
const lastMessage = conversationHistory[conversationHistory.length - 2]; // -2 because -1 is current
const lastMessageTime = lastMessage?.created_at || lastMessage?.timestamp;

// Calculate gap
const timeContext = calculateTimeContext(lastMessageTime);

// Build time prompt
const timePrompt = buildTimeContextPrompt(timeContext, null, personality.persona_name);

// Add to system prompt
const systemPromptWithTime = systemPrompt + '\n\n' + timePrompt;
*/


// ============================================
// EXAMPLE: FULL ROUTE HANDLER
// ============================================

/*
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message, modelId } = await request.json();

  // Load personality
  const { data: personality } = await supabase
    .from('ai_personalities')
    .select('*')
    .eq('model_id', modelId)
    .single();

  // Load conversation history
  const { data: history } = await supabase
    .from('ai_chat_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .eq('model_id', modelId)
    .order('created_at', { ascending: true })
    .limit(50);

  // Handle message with time awareness
  const response = await handleChatMessage(
    supabase,
    user.id,
    modelId,
    message,
    history || [],
    personality
  );

  // Save messages to DB...
  
  return NextResponse.json({ response });
}
*/
