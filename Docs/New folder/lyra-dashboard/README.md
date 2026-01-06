# LYRA Dashboard - Hybrid Creator/Fan Platform

A complete Next.js dashboard for LYRA featuring a hybrid layout that supports both fan and creator modes (like OnlyFans), plus dual chat modes (NSFW and SFW/Companion).

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for creator dashboard
Open [http://localhost:3000/browse](http://localhost:3000/browse) for fan mode

## 📁 File Structure

```
lyra-dashboard/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles + Tailwind
│   ├── dashboard/                    # CREATOR PAGES
│   │   ├── layout.tsx               # Dashboard wrapper
│   │   ├── page.tsx                 # Overview
│   │   ├── posts/page.tsx           # Post management
│   │   ├── subscribers/page.tsx     # Subscriber management
│   │   ├── messages/page.tsx        # Messages
│   │   ├── chat-modes/page.tsx      # Chat Mode Settings (NEW!)
│   │   ├── ai-chat/page.tsx         # NSFW AI Settings
│   │   ├── companion-chat/page.tsx  # SFW AI Settings (NEW!)
│   │   ├── earnings/page.tsx        # Earnings & payouts
│   │   └── settings/page.tsx        # Profile, Tiers, Payout settings
│   ├── (fan)/                        # FAN PAGES
│   │   ├── layout.tsx               # Fan wrapper
│   │   ├── browse/page.tsx          # Discover creators
│   │   ├── subscriptions/page.tsx   # My subscriptions
│   │   ├── wallet/page.tsx          # Payment methods
│   │   └── notifications/page.tsx   # Activity feed
│   └── api/
│       ├── sfw-chat/[creatorId]/    # SFW Chat API (NEW - SEPARATE!)
│       └── creator/
│           ├── chat-modes/          # Chat Mode Settings API (NEW!)
│           └── sfw-personality/     # SFW Config API (NEW!)
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx      # Hybrid nav + mode switcher
│   └── chat/
│       └── ChatModeSelector.tsx     # Chat mode selector UI (NEW!)
├── lib/
│   └── sfw-chat/                    # SFW CHAT SYSTEM (NEW - SEPARATE!)
│       ├── types.ts                 # SFW-specific types
│       ├── sfw-prompt-builder.ts    # SFW system prompt (SEPARATE)
│       ├── sfw-chat-service.ts      # SFW chat logic (SEPARATE)
│       └── database-schema.sql      # SFW tables (SEPARATE)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🔥 DUAL CHAT MODES

### Implementation Philosophy

**CRITICAL: The SFW system is COMPLETELY SEPARATE from NSFW.**

- ✅ SFW has its own database tables
- ✅ SFW has its own API routes
- ✅ SFW has its own prompt builder
- ✅ SFW has its own wizard/settings page
- ❌ NO changes to existing NSFW code
- ❌ NO shared logic that could break NSFW

### Chat Modes Page (`/dashboard/chat-modes`)
Creators can:
- Enable NSFW Chat (existing system, unchanged)
- Enable Companion Chat (new SFW system)
- Enable BOTH
- Set default mode when both enabled

### NSFW Chat (`/dashboard/ai-chat`)
**UNCHANGED** - Existing adult chat configuration:
- Persona identity
- Personality traits (including Dominant, Submissive, etc.)
- Allowed themes (Dirty Talk, Light BDSM, etc.)
- Physical traits (including intimate details)
- Per-message or subscription pricing

### Companion Chat (`/dashboard/companion-chat`)
**NEW** - SFW-safe configuration:
- Persona identity (separate from NSFW)
- SFW-only personality traits:
  - Friendly, Playful, Sweet, Confident, Shy
  - Intellectual, Mysterious, Romantic, Caring
  - Witty, Adventurous, Creative
- **Flirt Level** selector:
  - Friendly - Warm and supportive
  - Light Flirty - Playful teasing
  - Romantic - Sweet, affectionate (still SFW)
- Tasteful physical traits (no intimate details)
- Separate pricing from NSFW

### SFW Platform Rules (Auto-enforced)
- No explicit sexual content
- Graceful redirection if users request explicit
- No claims of being human
- No real-world meetups
- No emotional dependency language ("I missed you", etc.)
- Natural, warm conversation

### User Experience

**Profile Page:**
- If only one mode enabled: Single "Start Chat" button
- If both enabled: "Start Chat" + mode switcher icon

**Mode Selector Modal:**
- Clean, minimal design
- NSFW option with flame icon
- Companion option with heart icon
- Shows which is default

**In-Chat:**
- Mode badge shows active mode (NSFW/Companion)
- Optional mode switcher in header

## 🎨 Features

### Hybrid Dashboard (Like OnlyFans)
- **Fan Mode**: Browse, Subscriptions, Messages, Wallet, Notifications
- **Creator Mode**: Overview, Posts, Subscribers, Messages, Chat Modes, Earnings, Settings
- Mode switcher in sidebar (only shows for verified creators)
- "Become a Creator" flow for fan-only users

### Database Schema (SFW - Separate Tables)

```sql
-- Chat mode settings per creator
creator_chat_modes (
  nsfw_enabled BOOLEAN,
  sfw_enabled BOOLEAN,
  default_mode VARCHAR -- 'nsfw' or 'sfw'
)

-- SFW AI config (SEPARATE from ai_personalities)
sfw_ai_personalities (
  persona_name, persona_age, backstory,
  personality_traits[], flirt_level,
  interests[], turn_ons, turn_offs,
  pricing_model, price_per_message,
  physical_traits JSONB
)

-- SFW chat threads (SEPARATE from conversations)
sfw_chat_threads (
  creator_id, subscriber_id, last_message_at
)

-- SFW messages (SEPARATE from chat_messages)
sfw_chat_messages (
  thread_id, role, content, cost
)

-- SFW memory (SEPARATE from user_memory)
sfw_user_memory (
  preferred_name, interests, preferences
)
```

## 🔧 API Routes

### SFW Chat (SEPARATE from NSFW)
- `POST /api/sfw-chat/[creatorId]` - Send message to SFW AI
- `GET /api/sfw-chat/[creatorId]` - Get SFW chat history

### Chat Mode Settings
- `GET /api/creator/chat-modes` - Get mode settings
- `POST /api/creator/chat-modes` - Update mode settings

### SFW Personality
- `GET /api/creator/sfw-personality` - Get SFW config
- `POST /api/creator/sfw-personality` - Update SFW config
- `DELETE /api/creator/sfw-personality` - Reset to defaults

## 🚀 Next Steps for Claude Code

1. **Run Database Migrations**
   - Execute `lib/sfw-chat/database-schema.sql`
   - Keep existing NSFW tables untouched

2. **Connect AI Service**
   - Implement actual Claude/OpenAI call in `sfw-chat-service.ts`
   - Use `sfw-prompt-builder.ts` for system prompt

3. **Test Regression**
   - Verify NSFW chat still works identically
   - Test SFW chat independently
   - Test mode switching

4. **Integrate Payments**
   - SFW pricing is separate from NSFW
   - Track costs in `sfw_chat_messages.cost`

## ⚠️ IMPORTANT SAFETY RULES

1. **DO NOT modify any existing NSFW files**
2. **DO NOT merge SFW logic into NSFW services**
3. **DO NOT share database tables between modes**
4. **SFW is a PARALLEL system, not a modification**

If you need to add shared utilities, create new files that are read-only/stateless.

## 📝 Notes

- Uses Lucide React for icons
- All forms are client components ('use client')
- Dark theme with purple (NSFW) and pink (SFW) accents
- Mobile responsive (sidebar collapses)
