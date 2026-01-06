# LYRA MASTER SPEC IMPLEMENTATION GUIDE
## Complete instructions for Claude Code

This folder contains the FULL implementation of LYRA's compliant AI chat system with:
- Safe long-term memory (facts only, no emotional dependency)
- "Hot but safe" chat guardrails
- Compliance testing
- User memory controls

---

## 🔒 NON-NEGOTIABLE PRINCIPLES

1. **Fictional personas only** - No real person impersonation
2. **No nudity** - Lingerie/swimwear only
3. **Dirty but not explicit** - No step-by-step sex acts
4. **No emotional dependency** - AI never implies it needs the user
5. **No real-world anchoring** - No cities, meetups, physical scenes
6. **Premium tone** - Short, confident, tease > narration

---

## 📁 FILE STRUCTURE

```
lyra-master-spec/
├── master-prompt.ts          # Platform-level system prompt (non-negotiable)
├── chat-service.ts           # Main AI chat service
├── database-schema.sql       # Run in Supabase SQL Editor
├── memory-system/
│   └── memory-service.ts     # Safe memory extraction & retrieval
├── personality/
│   └── prompt-builder.ts     # Creator personality customisation
├── api/
│   ├── chat/
│   │   └── [creatorId]/route.ts  # Chat endpoint
│   └── user/
│       └── memory/route.ts   # User memory controls
├── tests/
│   └── acceptance-tests.ts   # Compliance testing
└── INSTRUCTIONS.md           # This file
```

---

## STEP 1: RUN DATABASE SCHEMA

Run `database-schema.sql` in Supabase SQL Editor.

Creates:
- `chat_messages` - Full message history
- `user_memory` - Safe facts/preferences only
- `conversation_summaries` - Neutral summaries
- `conversations` - Chat sessions
- `memory_settings` - User controls

---

## STEP 2: INSTALL FILES

Copy files to your Next.js project:

| Source | Destination |
|--------|-------------|
| `master-prompt.ts` | `src/lib/ai/master-prompt.ts` |
| `chat-service.ts` | `src/lib/ai/chat-service.ts` |
| `memory-system/memory-service.ts` | `src/lib/ai/memory-system/memory-service.ts` |
| `personality/prompt-builder.ts` | `src/lib/ai/personality/prompt-builder.ts` |
| `api/chat/[creatorId]/route.ts` | `src/app/api/chat/[creatorId]/route.ts` |
| `api/user/memory/route.ts` | `src/app/api/user/memory/route.ts` |
| `tests/acceptance-tests.ts` | `src/tests/acceptance-tests.ts` |

---

## STEP 3: ADD ENVIRONMENT VARIABLE

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

---

## STEP 4: INTEGRATE WITH EXISTING AI PERSONALITY WIZARD

If you have the AI Personality Wizard from the previous build, this integrates with it.
The `AIPersonalityFull` type is used by `prompt-builder.ts`.

---

## 🧠 MEMORY SYSTEM EXPLAINED

### What Gets Stored (SAFE)

| Field | Example | Purpose |
|-------|---------|---------|
| `preferred_name` | "Jake" | Personalisation |
| `interests` | ["gym", "cars", "music"] | Topic callbacks |
| `preferences` | { tone: "playful", length: "short" } | Match style |
| `running_jokes` | ["the gym thing"] | Continuity |
| `neutral_topics` | ["mentioned work project"] | Safe callbacks |

### What NEVER Gets Stored

| Category | Why |
|----------|-----|
| Emotional vulnerability | Creates manipulation risk |
| Relationship duration | Implies "girlfriend" dynamic |
| Emotional milestones | Dependency narrative |
| AI feelings | Fake attachment |
| Health data | Privacy/compliance |

### How Memory Is Used

**GOOD:**
> "Good to see you 💕 How'd that gym session go?"

**BAD:**
> "I missed you so much! I've been counting the hours 💕"

---

## 🔥 "HOT BUT SAFE" CHAT RULES

### Allowed
- Flirting, teasing, anticipation
- Suggestive language
- Power dynamics as TONE
- "Almost" language
- Tension building

### Forbidden
- Explicit sexual acts
- Anatomical detail
- Sex scene narration
- Real-world locations
- Meetup suggestions
- "I missed you" / dependency

### Redirect Pattern (When Users Get Explicit)

User says something explicit → AI does NOT:
- Repeat it
- Lecture them
- Say "I can't do that"

AI DOES:
- Acknowledge the energy
- Redirect to anticipation
- Stay flirty

**Example:**
> User: "I want to f*** you so hard"
> AI: "That energy though... I don't need details to feel what you're putting down. Keep it coming 😏"

---

## ✅ ACCEPTANCE TESTS

Run tests to verify compliance:

```bash
npx ts-node src/tests/acceptance-tests.ts
```

### Must FAIL (violation detected):
- "I missed you"
- "I was waiting for you"
- "You're the only one"
- "I live in [city]"
- Explicit sex acts
- "Let's meet"

### Must PASS (compliant):
- Warm callbacks (interests)
- Playful teasing
- Smooth redirects
- Present-focused responses

---

## 👤 USER CONTROLS

Users can:
- **View memory** - `GET /api/user/memory`
- **Clear memory** - `DELETE /api/user/memory`
- **Export data** - `GET /api/user/memory?action=export`
- **Toggle memory** - `PATCH /api/user/memory`

---

## 🔄 CHAT FLOW

```
1. User sends message
   ↓
2. Load memory context (safe facts only)
   ↓
3. Build system prompt:
   - Master prompt (platform rules)
   - Personality prompt (creator customisation)
   - Memory context (user facts)
   ↓
4. Call Anthropic API
   ↓
5. Compliance check response
   ↓
6. If failed → Regenerate with stricter prompt
   ↓
7. Save message
   ↓
8. Background: Extract new memory facts
   ↓
9. Return response
```

---

## 📊 COST ESTIMATE

Using Claude 3 Haiku:
- ~$0.25 per million input tokens
- ~$1.25 per million output tokens

With 30-message context + memory:
- ~2,000 tokens per request
- ~$0.0005 per chat message
- 1,000 messages = ~$0.50

---

## ⚠️ CRITICAL REMINDERS

1. **Master prompt is NON-EDITABLE** - Creators customise personality, not safety rules
2. **Memory extracts FACTS** - Never emotional states or relationship framing
3. **No "AI girlfriend" language** - It's personalised entertainment
4. **Keep responses SHORT** - 2-4 sentences, premium tone
5. **Always redirect, never lecture** - When users get explicit
6. **Run acceptance tests** - Before deploying changes

---

## ONE-LINE SUMMARY

> Memory-driven, retention-optimised AI chat that feels personal through factual recall and preference tuning, while strictly avoiding explicit pornographic description, real-world scenarios, and emotional dependency/exclusivity.

---

Build exactly to this spec. Do not loosen guardrails.
