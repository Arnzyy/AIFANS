# LYRA Bot Enhancement Implementation Guide
## Handover Document for Claude Code

---

## ⚠️ CRITICAL INSTRUCTIONS FOR CLAUDE CODE

**DO NOT:**
- Delete or replace the existing `chat-service.ts` 
- Remove any existing functionality
- Make changes without the feature flag

**DO:**
- Add new files alongside existing ones
- Use the feature flag to toggle between old and new
- Test on ONE persona first before enabling globally

---

## Overview

This document provides complete instructions for implementing the LYRA chatbot enhancements. The improvements focus on:

1. **Conversation State Tracking** - Prevents repetitive patterns
2. **Smart Memory Injection** - Contextual memory usage
3. **User Preference Learning** - Adapts to user behavior
4. **Message Analytics** - Data collection for future ML
5. **Dynamic Few-Shot Examples** - Heat-aware example selection
6. **Feature Flag System** - Safe rollout without breaking production

---

## File Structure

```
lyra-improvements/
├── src/
│   ├── config/
│   │   └── feature-flags.ts        # Toggle new features on/off
│   ├── lib/ai/
│   │   └── chat-service-enhanced.ts # Drop-in replacement with feature flag
│   ├── prompts/
│   │   └── master-prompt.ts        # Enhanced master prompt (UNCHANGED from original)
│   └── services/
│       ├── conversation-state.ts   # Pattern tracking
│       ├── memory-service.ts       # Smart memory injection
│       ├── user-preferences.ts     # Preference learning
│       ├── message-analytics.ts    # Data logging
│       ├── few-shot-examples.ts    # Dynamic examples
│       └── prompt-builder.ts       # Main orchestrator
├── database/
│   ├── migrations.sql              # Database schema
│   └── rls-policies.sql            # Security policies
└── docs/
    └── testing-protocol.md         # Test checklist
```

---

## Implementation Steps

### Step 1: Database Setup

Run the migrations in Supabase SQL Editor **IN THIS ORDER**:

```
1. migrations.sql      (creates tables)
2. rls-policies.sql    (secures them)
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
  'message_analytics'
);
```

**⚠️ IMPORTANT:** Update `rls-policies.sql` to match your actual table names:
- The file assumes a `personas` table with `creator_id` column
- Adjust if your schema uses different names

---

### Step 2: Copy Files to Project

Copy these files to your existing project structure:

```
# Config
src/config/feature-flags.ts → lib/config/feature-flags.ts

# Services (new folder)
src/services/conversation-state.ts → lib/services/conversation-state.ts
src/services/memory-service.ts → lib/services/memory-service.ts  
src/services/user-preferences.ts → lib/services/user-preferences.ts
src/services/message-analytics.ts → lib/services/message-analytics.ts
src/services/few-shot-examples.ts → lib/services/few-shot-examples.ts

# Enhanced chat service (alongside existing)
src/lib/ai/chat-service-enhanced.ts → lib/ai/chat-service-enhanced.ts
```

**DO NOT** replace or delete:
- `lib/ai/chat-service.ts` (your existing file)
- `lib/compliance/constants.ts` (your master prompt)

---

### Step 3: Update Import Paths

In `chat-service-enhanced.ts`, update these imports to match your project:

```typescript
// Update these paths to match your project structure:
import { MASTER_SYSTEM_PROMPT, FORBIDDEN_PATTERNS } from './master-prompt';
import { buildPersonalityPrompt, AIPersonalityFull } from './personality/prompt-builder';
import { buildChatContext, formatMemoryForPrompt, updateMemory } from './memory-system/memory-service';
import { detectContentReference, findMatchingContent, buildContentContext } from './content-awareness/content-service';

// These are the new services:
import { ConversationStateService, detectHeatLevel } from '../services/conversation-state';
import { MemoryService } from '../services/memory-service';
import { UserPreferencesService } from '../services/user-preferences';
import { MessageAnalyticsService, countEmojis } from '../services/message-analytics';
import { getFewShotExamples, ANTI_PATTERN_EXAMPLES, LENGTH_GUIDE } from '../services/few-shot-examples';
```

---

### Step 4: Integration into Route

**Your current route (`/api/chat/[creatorId]/route.ts`):**

```typescript
// Currently calls:
const result = await generateChatResponse(supabase, {...}, personality);
```

**Change to:**

```typescript
// Import the new function
import { generateChatResponseEnhanced } from '@/lib/ai/chat-service-enhanced';

// Replace the call (feature flag is handled inside):
const result = await generateChatResponseEnhanced(supabase, {...}, personality);
```

That's it. The `generateChatResponseEnhanced` function:
- Checks the feature flag internally
- If flag is OFF → uses your existing logic (unchanged)
- If flag is ON → uses the new enhanced system

---

### Step 5: Test with Feature Flag

**In `lib/config/feature-flags.ts`:**

```typescript
export const FEATURE_FLAGS = {
  // Start with everything OFF
  ENHANCED_CHAT_ENABLED: false,
  ANALYTICS_LOGGING_ENABLED: true, // Safe to enable - just logs data
  
  // Test with ONE creator first
  ENHANCED_CHAT_CREATOR_WHITELIST: ['your-test-creator-uuid'],
  ENHANCED_CHAT_USER_WHITELIST: [],
  
  ENHANCED_CHAT_ROLLOUT_PERCENT: 0,
};
```

**Testing steps:**
1. Enable analytics logging only (safe)
2. Add ONE test creator to whitelist
3. Test thoroughly using `testing-protocol.md`
4. If working, expand whitelist or increase rollout percent
5. If issues, set `ENHANCED_CHAT_ENABLED: false` (instant rollback)

---

### Step 6: Full Rollout

Once testing passes:

```typescript
export const FEATURE_FLAGS = {
  ENHANCED_CHAT_ENABLED: true,
  ANALYTICS_LOGGING_ENABLED: true,
  
  // Clear whitelists for global rollout
  ENHANCED_CHAT_CREATOR_WHITELIST: [],
  ENHANCED_CHAT_USER_WHITELIST: [],
  
  // Or gradual: 10%, then 50%, then 100%
  ENHANCED_CHAT_ROLLOUT_PERCENT: 100,
};
```

---

## Environment Variables

You should already have these, but verify:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
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
