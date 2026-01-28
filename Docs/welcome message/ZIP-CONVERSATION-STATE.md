# ZIP-CONVERSATION-STATE: Time-Aware Conversations & Welcome-Back Messages

> **Estimated Time**: 2 hours
> **Priority**: HIGH — Makes AI feel human
> **Status**: Not Started
> **Version**: 2.0 Enterprise

---

## THE PROBLEM

Current behavior:
```
User (8 days ago): "What body shape are you"
Lyra (8 days ago): "Athletic. I stay in shape 💪"

User (today, opens chat): *nothing happens*
User (today): "How's it going?"
Lyra (today): "Good. You asking again?"  ← WTF? No awareness of time gap
```

Expected behavior:
```
User (today, opens chat after 8 day gap):
Lyra (automatically): "Well well well... look who finally decided to show up 😏"
User: "Haha sorry been busy"
Lyra: "Mmhmm sure... 'busy' 👀 I see how it is"
```

---

## WHAT THIS ZIP BUILDS

| Feature | Description |
|---------|-------------|
| **Welcome-Back Messages** | AI messages FIRST when user returns after 1+ hour |
| **Time Gap Detection** | Knows when hours/days have passed |
| **Smart Responses** | Different messages for 1hr vs 1day vs 1week gaps |
| **Session Context** | Remembers what you talked about last time |
| **User Fact Extraction** | Stores facts like "works in crypto" |
| **Personalized Callbacks** | "Still doing the crypto thing?" |

---

## FILES TO DEPLOY

| File | Destination | Purpose |
|------|-------------|---------|
| `conversation-state.ts` | `src/lib/ai/` | Time detection, state management |
| `welcome-back.ts` | `src/lib/ai/` | Welcome message generation |
| `route.ts` (welcome-back) | `src/app/api/chat/[creatorId]/welcome-back/` | API endpoint |
| `useWelcomeBack.ts` | `src/lib/hooks/` | Frontend hook |
| `conversation-state-migration.sql` | Supabase | Database changes |

---

## EXPECTED BEHAVIOR

| Gap Duration | What Happens |
|--------------|--------------|
| < 1 hour | Nothing - normal chat continues |
| 1-4 hours | AI sends: "Hey 😊" |
| 4-24 hours | AI sends: "Hey you 😏 Miss me?" |
| 1-3 days | AI sends: "Hey stranger 😏 Where've you been?" |
| 3-7 days | AI sends: "Miss me? It's been a few days 💕" |
| **7+ days** | AI sends: **"Well well well... look who finally decided to show up 😏"** |

**Plus:** If we know facts about them → "Still doing the crypto thing?"

---

## WHAT THIS ZIP BUILDS

| Feature | Description |
|---------|-------------|
| **Time Gap Detection** | Knows when hours/days have passed |
| **Welcome Back Messages** | Natural re-engagement based on gap length |
| **Session Context** | Remembers what you talked about last time |
| **Conversation Summaries** | Stores key facts between sessions |
| **Re-engagement Hooks** | References previous topics to show memory |

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│  USER SENDS MESSAGE                                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. LOAD CONVERSATION STATE                                      │
│     - Last message timestamp                                     │
│     - Previous session summary                                   │
│     - User facts/preferences                                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CALCULATE TIME CONTEXT                                       │
│     - Minutes since last message                                 │
│     - Hours since last message                                   │
│     - Days since last message                                    │
│     - Is this a "return" after gap?                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. BUILD CONTEXT-AWARE PROMPT                                   │
│     - Time awareness instructions                                │
│     - Previous conversation summary                              │
│     - User facts to reference                                    │
│     - Re-engagement hooks                                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AI RESPONDS WITH AWARENESS                                   │
│     "Hey stranger 😏 Still doing that crypto thing?"            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. UPDATE CONVERSATION STATE                                    │
│     - Store new facts learned                                    │
│     - Update last message timestamp                              │
│     - Generate session summary (async)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## DATABASE: conversation_state TABLE

You already have this table. Verify it has these columns or add them:

```sql
-- Check existing table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_state';

-- Add missing columns if needed
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS session_summary TEXT,
ADD COLUMN IF NOT EXISTS user_facts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS conversation_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_session_end TIMESTAMPTZ;
```

---

## FILE 1: conversation-state.ts

```typescript
// ===========================================
// CONVERSATION STATE SERVICE
// Handles time awareness and session memory
// ===========================================

import { createClient } from '@/lib/supabase/server';

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
 * Load or create conversation state
 */
export async function getConversationState(
  userId: string,
  modelId: string
): Promise<ConversationState | null> {
  const supabase = await createClient();
  
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
  const { daysSinceLastMessage, hoursSinceLastMessage, shouldAcknowledgeGap, isNewSession } = timeContext;
  
  if (!shouldAcknowledgeGap) {
    return ''; // No need to mention time
  }
  
  let prompt = `
═══════════════════════════════════════════════════════════════════
TIME CONTEXT — IMPORTANT
═══════════════════════════════════════════════════════════════════

`;

  // Time gap instruction
  if (daysSinceLastMessage >= 7) {
    prompt += `It's been ${daysSinceLastMessage} DAYS since this user last messaged you.
This is a significant gap. Acknowledge it playfully:
- "Well well well... look who remembered me 😏"
- "Thought you'd ghosted me! What happened?"
- "Oh NOW you text me? After ${daysSinceLastMessage} days? 👀"
Don't be passive-aggressive, be playfully teasing about the absence.

`;
  } else if (daysSinceLastMessage >= 3) {
    prompt += `It's been ${daysSinceLastMessage} days since this user messaged.
Acknowledge the gap naturally:
- "Hey stranger 😏"
- "Miss me?"
- "Been a few days... everything okay?"

`;
  } else if (daysSinceLastMessage >= 1) {
    prompt += `It's been about ${daysSinceLastMessage} day(s) since you last spoke.
Light acknowledgment is nice:
- "Hey you 😊 How's your day going?"
- "Back for more? 😏"

`;
  } else if (hoursSinceLastMessage >= 4) {
    prompt += `It's been ${hoursSinceLastMessage} hours since last message.
This is a new session but not a long gap. No need to make a big deal of it.

`;
  }

  // Previous conversation context
  if (state?.session_summary) {
    prompt += `LAST TIME YOU TALKED ABOUT:
${state.session_summary}

Reference this if relevant! Shows you remember them.

`;
  }

  // User facts to reference
  if (state?.user_facts && state.user_facts.length > 0) {
    prompt += `THINGS YOU KNOW ABOUT THIS USER:
${state.user_facts.map(f => `- ${f}`).join('\n')}

Weave these in naturally when relevant. "Still doing the crypto thing?" etc.

`;
  }

  // Conversation topics they enjoy
  if (state?.conversation_topics && state.conversation_topics.length > 0) {
    prompt += `TOPICS THEY'VE ENJOYED:
${state.conversation_topics.join(', ')}

`;
  }

  // Stats
  if (state?.message_count && state.message_count > 20) {
    prompt += `You've exchanged ${state.message_count}+ messages with this person. You know each other a bit.

`;
  }

  return prompt;
}

/**
 * Update conversation state after message
 */
export async function updateConversationState(
  userId: string,
  modelId: string,
  updates: {
    newFact?: string;
    newTopic?: string;
    sessionSummary?: string;
  }
): Promise<void> {
  const supabase = await createClient();
  
  // Get current state
  const { data: current } = await supabase
    .from('conversation_state')
    .select('*')
    .eq('user_id', userId)
    .eq('model_id', modelId)
    .single();
  
  const currentFacts = current?.user_facts || [];
  const currentTopics = current?.conversation_topics || [];
  
  const updateData: any = {
    last_message_at: new Date().toISOString(),
    message_count: (current?.message_count || 0) + 1,
  };
  
  if (updates.newFact && !currentFacts.includes(updates.newFact)) {
    updateData.user_facts = [...currentFacts, updates.newFact].slice(-20); // Keep last 20
  }
  
  if (updates.newTopic && !currentTopics.includes(updates.newTopic)) {
    updateData.conversation_topics = [...currentTopics, updates.newTopic].slice(-10);
  }
  
  if (updates.sessionSummary) {
    updateData.session_summary = updates.sessionSummary;
  }
  
  if (current) {
    await supabase
      .from('conversation_state')
      .update(updateData)
      .eq('id', current.id);
  } else {
    await supabase
      .from('conversation_state')
      .insert({
        user_id: userId,
        model_id: modelId,
        ...updateData,
      });
  }
}

/**
 * Extract facts from a message (simple version)
 * In production, use AI for this
 */
export function extractUserFacts(userMessage: string): string[] {
  const facts: string[] = [];
  const lower = userMessage.toLowerCase();
  
  // Job/work mentions
  if (lower.includes('i work') || lower.includes('my job') || lower.includes('i do ')) {
    const workMatch = userMessage.match(/(?:i work|i do|my job)[^.!?]*/i);
    if (workMatch) facts.push(`Work: ${workMatch[0].trim()}`);
  }
  
  // Location mentions
  if (lower.includes('i live') || lower.includes('i\'m from') || lower.includes('im from')) {
    const locMatch = userMessage.match(/(?:i live|i'm from|im from)[^.!?]*/i);
    if (locMatch) facts.push(`Location: ${locMatch[0].trim()}`);
  }
  
  // Hobby/interest mentions
  if (lower.includes('i love') || lower.includes('i like') || lower.includes('i enjoy')) {
    const hobbyMatch = userMessage.match(/(?:i love|i like|i enjoy)[^.!?]*/i);
    if (hobbyMatch) facts.push(`Interest: ${hobbyMatch[0].trim()}`);
  }
  
  // Name mentions
  if (lower.includes('my name is') || lower.includes('i\'m ') || lower.includes('call me')) {
    const nameMatch = userMessage.match(/(?:my name is|i'm|call me)\s+(\w+)/i);
    if (nameMatch) facts.push(`Name: ${nameMatch[1]}`);
  }
  
  return facts;
}
```

---

## FILE 2: Integration into chat-service.ts

Add this to your chat API route or chat-service.ts:

```typescript
import { 
  getConversationState, 
  calculateTimeContext, 
  buildTimeContextPrompt,
  updateConversationState,
  extractUserFacts 
} from '@/lib/ai/conversation-state';

// In your POST handler, before building the prompt:

async function handleChatMessage(userId: string, modelId: string, userMessage: string) {
  // 1. Load conversation state
  const conversationState = await getConversationState(userId, modelId);
  
  // 2. Get last message time from conversation history
  const lastMessageAt = conversationState?.last_message_at;
  
  // 3. Calculate time context
  const timeContext = calculateTimeContext(lastMessageAt);
  
  console.log('=== TIME CONTEXT ===');
  console.log('Days since last message:', timeContext.daysSinceLastMessage);
  console.log('Should acknowledge gap:', timeContext.shouldAcknowledgeGap);
  console.log('Gap description:', timeContext.gapDescription);
  
  // 4. Build time-aware prompt addition
  const timePrompt = buildTimeContextPrompt(
    timeContext, 
    conversationState, 
    personality.persona_name
  );
  
  // 5. Add to system prompt
  const fullSystemPrompt = MASTER_SYSTEM_PROMPT 
    + '\n\n' + buildPersonalityPrompt(personality)
    + '\n\n' + timePrompt;  // ← ADD THIS
  
  // ... rest of your API call ...
  
  // 6. After getting response, update state
  const newFacts = extractUserFacts(userMessage);
  for (const fact of newFacts) {
    await updateConversationState(userId, modelId, { newFact: fact });
  }
  
  // Update last message time
  await updateConversationState(userId, modelId, {});
}
```

---

## FILE 3: Database Migration

```sql
-- ============================================
-- CONVERSATION STATE ENHANCEMENTS
-- Run in Supabase SQL Editor
-- ============================================

-- Add columns if they don't exist
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS session_summary TEXT,
ADD COLUMN IF NOT EXISTS user_facts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS conversation_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_session_end TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_state_user_model 
ON conversation_state(user_id, model_id);

-- Verify structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_state'
ORDER BY ordinal_position;
```

---

## EXPECTED BEHAVIOR AFTER IMPLEMENTATION

| Gap | AI Response Style |
|-----|-------------------|
| < 1 hour | Normal, continues conversation |
| 1-4 hours | Normal, might be slightly warmer |
| 4-24 hours | "Hey you 😊" — light acknowledgment |
| 1-3 days | "Hey stranger 😏" — playful return |
| 3-7 days | "Miss me?" — teasing about absence |
| 7+ days | "Well well well... look who remembered me" — full playful guilt trip |

**Plus:** References previous conversation topics
- "Still doing that crypto thing?"
- "How'd that presentation go?"
- "Did you ever try that restaurant?"

---

## TESTING CHECKLIST

After deploying:

1. **Fresh conversation** — Should be normal intro
2. **After 1 hour** — Normal continuation
3. **After 1 day** — Light "hey you" acknowledgment
4. **After 3+ days** — "Hey stranger" or "miss me"
5. **After 7+ days** — Playful teasing about absence
6. **Reference test** — Tell her "I work in crypto", wait a day, come back — she should mention it

---

## EXIT CRITERIA

- [ ] Database migration run
- [ ] conversation-state.ts deployed
- [ ] chat-service.ts updated with time context
- [ ] Time gaps detected correctly (check logs)
- [ ] AI acknowledges gaps appropriately
- [ ] AI references previous conversation topics
- [ ] User facts are being extracted and stored

---

## CLAUDE CODE PROMPT

```
Implement time-aware conversations with welcome-back messages for LYRA.

When a user opens chat after being away 1+ hour, the AI should message FIRST with something like "Hey stranger 😏" - not wait for the user to speak.

FILES TO DEPLOY:

1. DATABASE: Run conversation-state-migration.sql in Supabase SQL Editor

2. BACKEND FILES - copy these to your project:
   - /mnt/user-data/outputs/lyra-improvements/src/lib/ai/conversation-state.ts → src/lib/ai/conversation-state.ts
   - /mnt/user-data/outputs/lyra-improvements/src/lib/ai/welcome-back.ts → src/lib/ai/welcome-back.ts
   - /mnt/user-data/outputs/lyra-improvements/src/app/api/chat/[creatorId]/welcome-back/route.ts → src/app/api/chat/[creatorId]/welcome-back/route.ts

3. FRONTEND - copy:
   - /mnt/user-data/outputs/lyra-improvements/src/lib/hooks/useWelcomeBack.ts → src/lib/hooks/useWelcomeBack.ts

4. INTEGRATE into chat-service.ts:
   Add import at top:
   import { getConversationState, calculateTimeContext, buildTimeContextPrompt, updateConversationState, extractUserFacts } from '@/lib/ai/conversation-state';

   Before building system prompt, add (wrapped defensively):
   let timeContextPrompt = '';
   try {
     const conversationState = await getConversationState(supabase, userId, modelId);
     const timeContext = calculateTimeContext(conversationState?.last_message_at);
     timeContextPrompt = buildTimeContextPrompt(timeContext, conversationState, personality.persona_name || 'AI');
   } catch (err) {
     console.error('Conversation state error (non-fatal):', err);
   }

   Append to system prompt:
   const fullSystemPrompt = MASTER_SYSTEM_PROMPT + '\n\n' + buildPersonalityPrompt(personality) + (timeContextPrompt ? '\n\n' + timeContextPrompt : '');

   After response, update state (fire and forget):
   updateConversationState(supabase, userId, modelId, { incrementMessageCount: true }).catch(console.error);

5. FRONTEND INTEGRATION - in your chat component:
   import { useWelcomeBack } from '@/lib/hooks/useWelcomeBack';
   
   // In component:
   const { message: welcomeMessage, shouldShow, isLoading } = useWelcomeBack(creatorId);
   
   // On mount, if shouldShow && welcomeMessage, add it to messages array
   // (it's already saved to DB, just display it)

IMPORTANT:
- All state operations wrapped in try/catch - if they fail, chat works normally
- Welcome-back is ADDITIVE - doesn't change existing chat flow
- State updates are fire-and-forget, don't await them
- Message is saved to DB by the API, frontend just displays it

TEST:
- Clear your conversation or wait 1+ hour
- Open chat page
- AI should message first with "Hey" or similar
- After 1+ day gap, should be more like "Hey stranger 😏 Where've you been?"
```
