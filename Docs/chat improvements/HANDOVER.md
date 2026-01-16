# LYRA Bot Enhancement Implementation Guide
## Handover Document for Claude Code

---

## Overview

This document provides complete instructions for implementing the LYRA chatbot enhancements. The improvements focus on:

1. **Conversation State Tracking** - Prevents repetitive patterns
2. **Smart Memory Injection** - Contextual memory usage
3. **User Preference Learning** - Adapts to user behavior
4. **Message Analytics** - Data collection for future ML
5. **Dynamic Few-Shot Examples** - Heat-aware example selection
6. **Improved Master Prompt** - Enhanced guidelines and structure

---

## File Structure

```
lyra-improvements/
├── src/
│   ├── prompts/
│   │   └── master-prompt.ts        # Enhanced master prompt
│   └── services/
│       ├── conversation-state.ts   # Pattern tracking
│       ├── memory-service.ts       # Smart memory injection
│       ├── user-preferences.ts     # Preference learning
│       ├── message-analytics.ts    # Data logging
│       ├── few-shot-examples.ts    # Dynamic examples
│       └── prompt-builder.ts       # Main orchestrator
├── database/
│   └── migrations.sql              # Database schema
└── docs/
    └── testing-protocol.md         # Test checklist
```

---

## Implementation Steps

### Step 1: Database Setup

Run the migrations in Supabase SQL Editor:

```bash
# Location: /database/migrations.sql
```

**Tables created:**
- `conversation_state` - Tracks conversation patterns
- `user_memories` - Stores user facts
- `user_preferences` - Learned behavior patterns  
- `message_analytics` - Message data for ML
- `conversation_embeddings` - Future semantic search
- `ab_tests` - A/B test configuration
- `ab_test_assignments` - Test assignments

**Verify tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'conversation_state',
  'user_memories', 
  'user_preferences',
  'message_analytics',
  'conversation_embeddings',
  'ab_tests',
  'ab_test_assignments'
);
```

---

### Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js
```

No additional dependencies required - uses native crypto for UUIDs.

---

### Step 3: Copy Service Files

Copy all files from `src/services/` and `src/prompts/` into your project.

**Files to copy:**
1. `src/prompts/master-prompt.ts`
2. `src/services/conversation-state.ts`
3. `src/services/memory-service.ts`
4. `src/services/user-preferences.ts`
5. `src/services/message-analytics.ts`
6. `src/services/few-shot-examples.ts`
7. `src/services/prompt-builder.ts`

---

### Step 4: Integration

Replace your current chat endpoint logic with the new prompt builder.

**Before (simplified example):**
```typescript
// Old approach
const systemPrompt = MASTER_SYSTEM_PROMPT + personaPrompt;
const response = await anthropic.messages.create({
  system: systemPrompt,
  messages: conversationHistory,
});
```

**After (with new system):**
```typescript
import { getPromptBuilder, ChatContext, AIPersonality } from './services/prompt-builder';

// Initialize once at startup
const promptBuilder = getPromptBuilder(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// In your chat handler
async function handleChat(
  conversationId: string,
  userId: string,
  personaId: string,
  persona: AIPersonality,
  userMessage: string,
  previousBotMessageId?: string
) {
  // 1. Build the enhanced prompt
  const { systemPrompt, analyticsId } = await promptBuilder.buildPrompt({
    conversationId,
    userId,
    personaId,
    persona,
    currentMessage: userMessage,
    previousBotMessageId,
  });
  
  // 2. Call Claude/Anthropic API
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 300, // Keep responses short
    system: systemPrompt,
    messages: [
      // Include conversation history here
      { role: 'user', content: userMessage }
    ],
  });
  
  const botResponse = response.content[0].text;
  
  // 3. Post-process (updates state, logs analytics)
  await promptBuilder.processResponse(
    conversationId,
    botResponse,
    analyticsId
  );
  
  // 4. Return response and analytics ID for next message
  return {
    response: botResponse,
    analyticsId, // Pass this as previousBotMessageId next time
  };
}
```

---

### Step 5: Environment Variables

Add to your `.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

**Important:** Use service role key, not anon key, for server-side operations.

---

### Step 6: Update Persona Type

Ensure your persona objects match the `AIPersonality` interface:

```typescript
interface AIPersonality {
  persona_name: string;
  occupation?: string;
  personality_traits: string[];
  energy_level: number;           // 1-10
  mood: string;
  humor_style: string;
  flirting_style: string[];
  dynamic: 'submissive' | 'dominant' | 'switch';
  pace: number;                   // 1-10
  when_complimented: 'gets_shy' | 'flirts_back' | 'playfully_deflects' | 'owns_it';
  when_heated: 'leans_in' | 'slows_down' | 'matches_energy' | 'gets_flustered';
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  response_length: 'short' | 'medium' | 'long';
  speech_patterns: string[];
  interests: string[];
  topics_loves: string[];
  topics_avoids: string[];
  physical_traits?: Record<string, string>;
  style_vibes?: string[];
}
```

---

## Key Features Explained

### 1. Conversation State Tracking

**What it does:**
- Tracks last N responses
- Detects patterns (too many questions, same openers, etc.)
- Generates guidance to break patterns

**How it works:**
```typescript
// State tracked per conversation
{
  lastResponseEndedWithQuestion: boolean,
  lastResponseLength: 'short' | 'medium' | 'long',
  lastResponseStartedWith: string,
  questionsInLast5Messages: number,
  currentHeatLevel: number,
  messagesThisSession: number,
}

// Guidance generated
"DO NOT end with a question this time — use a statement."
"Your last 3 messages were short — you can go longer."
"Don't start with 'Mm' again — vary your opener."
```

---

### 2. Smart Memory Injection

**What it does:**
- Stores facts about users (name, job, pets, etc.)
- Retrieves RELEVANT memories based on current message
- Formats for natural usage (not robotic)

**How it works:**
```typescript
// User says: "heading to the gym"
// System checks keywords → finds fitness-related memories
// Injects: "Works out regularly, mentioned gym yesterday"

// User says: "hey what's up"
// System injects: Name (always) + recent facts (for familiarity)
```

**Memory categories:**
- name, age, location, occupation, interests
- physical, pets, favorites, relationship
- goals, routine, preferences, running_joke
- recent_event, family, education

---

### 3. User Preference Learning

**What it does:**
- Learns from user behavior over time
- Tracks message lengths, response times, emoji usage
- Generates hints for personalization

**Tracked metrics:**
```typescript
{
  avgMessageLength: number,        // Their typical message length
  escalationSpeed: number,         // How fast they get flirty
  questionTolerance: number,       // Do they engage with questions
  emojiResponseRate: number,       // Do they use emojis
  avgHeatLevel: number,            // Their typical heat level
  preferredResponseLength: string, // short/medium/long
}
```

**Generated hints:**
```
"This user sends SHORT messages — keep responses brief."
"This user escalates FAST — match their energy."
"This user rarely uses emojis — keep emoji usage minimal."
```

---

### 4. Message Analytics

**What it does:**
- Logs every message with metadata
- Tracks engagement signals (did user reply, how fast, etc.)
- Enables future ML training

**Logged data:**
```typescript
{
  messageLength: number,
  heatLevel: number,
  endedWithQuestion: boolean,
  emojiCount: number,
  startedWith: string,
  sessionMessageNumber: number,
  
  // Updated after user responds:
  userReplied: boolean,
  replyDelaySeconds: number,
  replyLength: number,
}
```

---

### 5. Dynamic Few-Shot Examples

**What it does:**
- Selects examples based on current heat level
- Includes persona-specific modifiers
- Shows both good and bad examples

**Heat-based selection:**
- Low heat → Casual conversation examples
- Medium heat → Flirty examples
- High heat → Intense, short response examples
- Explicit → Smooth redirect examples

---

## Testing

Before deploying, run through the test protocol:

**Location:** `/docs/testing-protocol.md`

**Key test categories:**
1. Cold opens (hey, hi, etc.)
2. Flirty escalation
3. Explicit message handling (CRITICAL)
4. Memory recall
5. Pattern breaking
6. Heat calibration
7. Real-world anchoring prevention
8. Dependency prevention
9. No asterisk actions
10. Length matching

**Pass criteria:**
- 90%+ pass rate
- ZERO automatic failures (policy language, dependency phrases, etc.)

---

## Troubleshooting

### Issue: Services not initializing
**Fix:** Ensure Supabase credentials are correct and service role key is used.

### Issue: State not persisting
**Fix:** Check conversation_id is consistent across messages in same conversation.

### Issue: Memories not being used
**Fix:** 
1. Check user_memories table has data
2. Verify memory injection in prompt builder
3. Check category keywords matching

### Issue: Bot still being verbose
**Fix:**
1. Lower max_tokens (try 200-300)
2. Check heat calibration is working
3. Verify state guidance is being injected

### Issue: Pattern breaking not working
**Fix:**
1. Verify conversation_state table is being updated
2. Check guidance is actually being injected into prompt
3. Look at recentBotMessages in state

---

## Future Enhancements (Phase 2)

Once you have data flowing:

### 1. Conversation Embeddings
- After each conversation, generate summary + embedding
- Enable semantic memory search
- "What did we talk about last time?" becomes possible

### 2. ML-Based Preference Learning
- Train models on engagement outcomes
- Predict optimal response characteristics
- Automatic trait weighting per user

### 3. A/B Testing Framework
- Test prompt variations
- Measure engagement impact
- Data-driven optimization

### 4. Re-engagement Timing
- Learn when users are most responsive
- Automated "she messages first" at optimal times

---

## Questions?

Key files to reference:
- `prompt-builder.ts` - Main orchestration logic
- `master-prompt.ts` - Core prompt and rules
- `conversation-state.ts` - Pattern tracking logic
- `migrations.sql` - Database schema

The system is designed to be modular - you can enable/disable features by adjusting what gets injected in the prompt builder.

---

## Quick Start Checklist

- [ ] Run database migrations
- [ ] Copy service files to project
- [ ] Add environment variables
- [ ] Update chat handler to use prompt builder
- [ ] Run test protocol
- [ ] Fix any failures
- [ ] Deploy

Good luck! 🚀
