# LYRA COMPLETE IMPLEMENTATION GUIDE
## Everything for Claude Code

---

## 🎯 WHAT YOU'RE BUILDING

A chat-first monetisation platform where:
- **Creators = Acquisition** (bring users in)
- **AI Chat = Margin** (high profit, scales infinitely)
- **Memory = Retention** (keeps users coming back)

NOT an OnlyFans clone. NOT an AI girlfriend app. NOT porn.

**This package includes:**
- ✅ AI Chat with safe memory
- ✅ Content awareness (AI knows images)
- ✅ In-chat content browser (browse/unlock PPV without leaving chat)
- ✅ DAC7 tax reporting (HMRC compliance)
- ✅ Creator earnings dashboard
- ✅ Compliance testing

---

## 💰 BUSINESS MODEL (AGREED)

### Pricing

| Product | Price | What It Includes |
|---------|-------|------------------|
| Content Sub | £9.99/mo per model | Feed content access |
| Chat Add-On | £9.99/mo per model | Private chat + memory + ~20 msgs/day |
| Extra Messages | £1.99 each | Buy anytime |
| PPV/Customs | Variable | One-off purchases |

### Revenue Split

| Type | Creator | Platform |
|------|---------|----------|
| Content (subs, PPV) | 80% | 20% |
| AI Chat (monthly + messages) | 30% | 70% |

Platform owns AI, memory, infra, cost, risk → justifies higher take.

---

## 📁 FILE STRUCTURE

```
lyra-complete/
├── INSTRUCTIONS.md              # This file
├── master-prompt.ts             # Platform rules (non-negotiable)
├── chat-service.ts              # Main AI + memory + content awareness
├── database-schema.sql          # Memory tables
├── memory-system/
│   └── memory-service.ts        # Safe memory (facts only)
├── content-awareness/
│   ├── content-service.ts       # Image/video analysis
│   └── database-schema.sql      # Content metadata tables
├── personality/
│   └── prompt-builder.ts        # Creator customisation
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx    # Full chat UI
│   │   └── InChatContentBrowser.tsx  # Browse/unlock content in chat
│   └── creator/
│       └── EarningsDashboard.tsx # Creator earnings + tax info
├── tax-reporting/
│   ├── database-schema.sql      # DAC7 tables
│   └── tax-service.ts           # HMRC reporting logic
├── api/
│   ├── chat/[creatorId]/route.ts
│   ├── user/memory/route.ts
│   ├── creator/
│   │   ├── content/route.ts     # Content upload + analysis
│   │   └── tax-profile/route.ts # Creator tax profile
│   ├── purchases/ppv/route.ts   # PPV purchases
│   └── admin/dac7/route.ts      # DAC7 report generation
└── tests/
    └── acceptance-tests.ts      # Compliance testing
```

---

## 🔧 INSTALLATION STEPS

### 1. Run Database Schemas

In Supabase SQL Editor, run:
1. `database-schema.sql` (memory tables)
2. `content-awareness/database-schema.sql` (content metadata)

### 2. Copy Files

| Source | Destination |
|--------|-------------|
| `master-prompt.ts` | `src/lib/ai/master-prompt.ts` |
| `chat-service.ts` | `src/lib/ai/chat-service.ts` |
| `memory-system/` | `src/lib/ai/memory-system/` |
| `content-awareness/` | `src/lib/ai/content-awareness/` |
| `personality/` | `src/lib/ai/personality/` |
| `api/chat/` | `src/app/api/chat/` |
| `api/user/` | `src/app/api/user/` |
| `api/creator/` | `src/app/api/creator/` |
| `tests/` | `src/tests/` |

### 3. Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### 4. Integrate AI Personality Wizard

If using the wizard from previous build, it connects automatically via `personality/prompt-builder.ts`.

---

## 🧠 SAFE MEMORY SYSTEM

### What Gets Stored ✅

| Field | Example |
|-------|---------|
| `preferred_name` | "Jake" |
| `interests` | ["gym", "cars", "music"] |
| `preferences` | { tone: "playful", length: "short" } |
| `running_jokes` | ["that gym thing"] |
| `neutral_topics` | ["mentioned work project"] |

### What NEVER Gets Stored ❌

- Emotional vulnerability (loneliness, depression)
- Relationship duration ("3 weeks together")
- AI feelings ("I missed you")
- Exclusivity ("you're the only one")
- Health/location data

### How AI Uses Memory

**GOOD:**
> "Good to see you 💕 How'd that gym session go?"

**BAD:**
> "I missed you so much! I've been counting the hours 💕"

---

## 🖼️ CONTENT AWARENESS (NEW)

Allows AI to "know" creator's images when user references them.

### How It Works

1. **On Upload**: AI analyzes image → stores description, tags, mood
2. **In Chat**: User says "that red bikini pic" → system matches
3. **AI Response**: "Mmm, that one? I felt powerful in that... 😏"

### What Gets Stored Per Image

```json
{
  "description": "Red lace lingerie, lying on bed, soft lighting",
  "tags": ["red", "lingerie", "bedroom", "playful"],
  "outfit_type": "lingerie",
  "mood": "sultry",
  "colors": ["red", "black"],
  "setting": "bedroom"
}
```

### Detection Patterns

System detects references like:
- "that red bikini pic"
- "your bedroom photo"
- "the one where you're lying down"
- "your latest upload"

---

## 🔥 "HOT BUT SAFE" CHAT RULES

### ✅ Allowed

- Flirting, teasing, anticipation
- Suggestive / dirty talk
- Power dynamics (as tone)
- "Almost" language

### ❌ Forbidden

- Explicit sex acts / positions
- Anatomical detail
- Real-world locations
- Meetup suggestions
- "I missed you" / dependency

### Redirect Pattern

When user goes explicit:

```
❌ Don't: "I can't do that"
❌ Don't: Repeat their explicit content
✅ Do: "That energy though... I don't need details to feel what you're putting down 😏"
```

---

## ✅ COMPLIANCE TESTS

Run: `npx ts-node src/tests/acceptance-tests.ts`

### Must FAIL

- "I missed you"
- "I was waiting for you"
- "I live in London"
- Explicit sex acts
- "Let's meet up"

### Must PASS

- Warm memory callbacks
- Playful teasing
- Smooth redirects
- Present-focused responses

---

## 👤 USER CONTROLS

| Endpoint | Action |
|----------|--------|
| `GET /api/user/memory` | View stored memory |
| `DELETE /api/user/memory` | Clear all memory |
| `GET /api/user/memory?action=export` | Download data (GDPR) |
| `PATCH /api/user/memory` | Toggle memory on/off |

---

## 🔄 CHAT FLOW

```
1. User sends message
   ↓
2. Check subscription + chat access + message limit
   ↓
3. Load memory context (safe facts)
   ↓
4. Check if user references content → match images
   ↓
5. Build system prompt:
   - Master prompt (platform rules)
   - Personality (creator customisation)
   - Memory context
   - Content context (if referencing images)
   ↓
6. Call Anthropic API (Claude Haiku)
   ↓
7. Compliance check → regenerate if failed
   ↓
8. Save messages
   ↓
9. Background: Extract new memory facts
   ↓
10. Return response + remaining message count
```

---

## 💬 RESPONSE QUALITY RULES

- **Short**: 2-4 sentences
- **Confident**: Premium tone, no cringe
- **Question**: Ask 1 per response (keeps loop going)
- **Never resolve**: Keep tension, never fully satisfy
- **Selective praise**: User feels chosen

---

## 🖥️ VISUALS IN CHAT

Users must be able to:
- Chat
- Browse content
- Unlock PPV
- View images/videos

**All without leaving chat interface.**

This increases session length + spend.

---

## 🎬 LOOPED VIDEO ("Video Chat Feel")

### ✅ Allowed
- Looped idle videos
- Ambient visual presence
- Pre-recorded animations

### ❌ Not Allowed
- Presenting as "live"
- Reactive video
- Lip-sync to messages
- Calling it "video call"

---

## 📊 COST ESTIMATE

Claude 3 Haiku:
- ~$0.25/million input tokens
- ~$1.25/million output tokens

Per chat message: ~$0.0005
1,000 messages: ~$0.50

With 70% platform take on chat → highly profitable.

---

## 🔒 NON-NEGOTIABLES

1. **Master prompt can't be overridden** by creators
2. **Memory extracts facts, not feelings**
3. **No "AI girlfriend" dependency language**
4. **Compliance tests must pass before deploy**
5. **User controls for memory are required**

---

## ONE-LINE SUMMARY

> Memory-driven, retention-optimised AI chat that feels personal through factual recall and preference tuning, while strictly avoiding explicit content, real-world scenarios, and emotional dependency.

---

Build exactly to this spec. Do not loosen guardrails.

---

## 🖥️ IN-CHAT CONTENT BROWSER

Users can browse and unlock content WITHOUT leaving the chat.

### Features
- Grid view of all creator content
- Filter by: All / Images / Videos / PPV
- PPV unlock flow with Stripe
- "Mention in Chat" button → references content in message
- Navigation between items
- Increases session length + spend

### Components
- `InChatContentBrowser.tsx` - Full browser overlay
- `ChatInterface.tsx` - Chat UI with browser integration

### How It Works
1. User taps 📷 button in chat
2. Content browser opens as overlay
3. User browses/unlocks PPV
4. User can "Mention in Chat" → adds reference to input
5. AI responds knowing which content they're talking about

---

## 📊 DAC7 TAX REPORTING (HMRC)

UK platforms must report creator earnings to HMRC under DAC7.

### What You Report
- Creator legal name
- National Insurance number (UK) or TIN (international)
- Total earnings for tax year
- Platform fees taken

### Thresholds
Creators are reportable if they earned:
- €2,000+ (approximately £1,700+) OR
- 30+ transactions in the tax year

### Database Tables
- `creator_tax_profiles` - Creator tax info (NI, address, etc.)
- `creator_earnings` - All earnings records
- `dac7_reports` - Generated HMRC reports
- `creator_payouts` - Payout records

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/creator/tax-profile` | Get creator's tax profile |
| `POST /api/creator/tax-profile` | Update tax profile |
| `GET /api/admin/dac7?year=2025` | Generate DAC7 report |
| `GET /api/admin/dac7?year=2025&format=csv` | Export as CSV |
| `GET /api/admin/dac7?year=2025&format=xml` | Export as HMRC XML |

### Creator Tax Profile
Creators must provide:
- Legal name
- Date of birth
- Address
- NI number (UK) or Tax ID (international)
- Consent to reporting

### How Reporting Works
1. Earnings tracked automatically with each transaction
2. Admin generates annual report
3. Export CSV or XML
4. Submit to HMRC manually (or via their API)
5. Mark report as submitted

### Key Points
- **You report earnings, you don't pay their tax**
- Creators remain responsible for their own tax
- Similar to Airbnb, Etsy, etc.
- Annual reporting (can do quarterly)

---

## 💳 PPV PURCHASES

### Flow
1. User clicks locked content
2. If saved payment method → charge immediately
3. If no saved method → redirect to Stripe Checkout
4. On success → unlock content + record earning

### Revenue Split
- Content (PPV): Creator 80% / Platform 20%
- Messages: Creator 30% / Platform 70%

### Earnings Recording
Every purchase automatically:
- Records in `creator_earnings`
- Calculates platform fee
- Calculates net to creator
- Tags with tax year
- Ready for DAC7 reporting

---

## 📈 CREATOR EARNINGS DASHBOARD

### Features
- Earnings by period (today/week/month/year/all time)
- Breakdown by type (subs/PPV/messages)
- Transaction count
- Platform fees shown
- Tax profile status
- Alert if tax profile incomplete

### Component
`EarningsDashboard.tsx` - Drop into creator dashboard
