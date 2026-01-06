# LYRA - AI Influencer Subscription Platform

## Complete Creator Marketplace for AI Personas

LYRA is a full-featured creator marketplace platform built with Next.js 14, Supabase, and Stripe. It enables creators to build, monetize, and manage AI personas through subscriptions, tips, and pay-per-view content.

---

## 🚀 Features

### Creator Onboarding & Verification
- **5-Step Onboarding Wizard**: Account type → Identity → Stripe Connect → Declarations → Submit
- **Stripe Connect Integration**: Full KYC and payout setup via Stripe Express
- **Compliance Declarations**: Immutable audit log of creator agreements
- **Admin Approval Queue**: Manual vetting before creators can publish

### AI Model/Persona Management  
- **Model Creation Wizard**: Name, age, visuals, persona, monetization settings
- **Tag System**: Primary categories + secondary tags for discovery
- **Multi-Model Support**: Configurable limits per creator (anti-spam)
- **Model Approval Flow**: Admin review before public listing

### Content & Monetization
- **Content Library**: Upload images/videos with visibility controls
- **Visibility Tiers**: Public Preview (SFW) → Subscribers → PPV
- **PPV System**: Create pay-per-view content packs from library
- **Subscription Pricing**: Per-model monthly subscriptions

### Token Wallet & Tipping
- **Token Packs**: Buy tokens via Stripe (250 tokens = £1)
- **Tip System**: Send tips with acknowledgements
- **Creator Earnings**: 80/20 split with 14-day hold period
- **Transaction History**: Full ledger for users and creators

### Chat System
- **SFW Companion Mode**: Friendly, supportive AI conversations
- **NSFW Intimate Mode**: Adult content with age verification
- **Chat Mode Configuration**: Creators control available modes
- **Persona Customization**: Traits, interests, style preferences

### Admin Panel
- **Creator Approvals Queue**: Review KYC, declarations, Stripe status
- **Model Approvals Queue**: Safety checks, content review
- **Content Reports**: User report handling
- **Strike System**: Warnings, strikes, suspensions
- **Audit Logging**: Immutable records for all actions

---

## 📁 Project Structure

```
lyra-dashboard/
├── app/
│   ├── (fan)/              # Fan-facing pages
│   │   ├── browse/         # Discover models
│   │   ├── subscriptions/  # My subscriptions
│   │   ├── wallet/         # Token wallet
│   │   └── notifications/  # Notifications
│   │
│   ├── admin/              # Admin panel
│   │
│   ├── dashboard/          # Creator dashboard
│   │   ├── ai-chat/        # Chat testing
│   │   ├── chat-modes/     # Configure chat modes
│   │   ├── content/        # Content library
│   │   ├── earnings/       # Earnings overview
│   │   ├── messages/       # Fan messages
│   │   ├── models/         # Manage AI models
│   │   ├── onboarding/     # Creator onboarding
│   │   ├── payouts/        # Payouts & earnings
│   │   ├── posts/          # Create posts
│   │   ├── ppv/            # PPV management
│   │   ├── settings/       # Account settings
│   │   └── subscribers/    # Subscriber list
│   │
│   └── api/                # API routes
│       ├── admin/          # Admin endpoints
│       ├── creator/        # Creator endpoints
│       ├── ppv/            # PPV endpoints
│       ├── tags/           # Tag system
│       ├── tips/           # Tipping
│       ├── tokens/         # Token purchases
│       ├── wallet/         # Wallet operations
│       └── webhooks/       # Stripe webhooks
│
├── components/
│   ├── admin/              # Admin components
│   ├── chat/               # Chat UI components
│   ├── creators/           # Creator dashboard components
│   ├── layout/             # Layout components
│   ├── tags/               # Tag selector
│   └── tokens/             # Wallet components
│
└── lib/
    ├── creators/           # Creator business logic
    ├── sfw-chat/           # SFW chat system
    ├── tags/               # Tag system
    └── tokens/             # Token/wallet system
```

---

## 🗄️ Database Schema

### Core Tables
- `creators` - Legal entity, KYC, Stripe Connect
- `creator_declarations` - Compliance records (immutable)
- `creator_models` - AI personas
- `model_tags` - Model ↔ Tag relationships
- `tags` - Controlled vocabulary
- `blocked_tag_terms` - Safety filter

### Content
- `content_items` - Media uploads
- `posts` - Content groupings
- `ppv_offers` - Pay-per-view packs
- `ppv_entitlements` - User purchases

### Monetization
- `model_subscriptions` - Active subscriptions
- `token_wallets` - User balances
- `token_transactions` - Transaction ledger
- `tips` - Tip records
- `creator_earnings` - Earnings ledger
- `creator_payouts` - Payout history

### Moderation
- `content_reports` - User reports
- `creator_strikes` - Warnings/strikes
- `audit_log` - All admin actions
- `user_roles` - Admin permissions

---

## 🔧 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI (Claude)
ANTHROPIC_API_KEY=
```

### 3. Run Database Migrations
Execute SQL files in order:
1. `lib/creators/database-schema.sql`
2. `lib/tags/database-schema.sql`
3. `lib/tokens/database-schema.sql`
4. `lib/sfw-chat/database-schema.sql`

### 4. Start Development Server
```bash
npm run dev
```

---

## 🎯 Key Flows

### Creator Journey
1. Sign up → Complete onboarding wizard
2. Connect Stripe → Accept declarations
3. Submit for admin review
4. Once approved → Create AI model
5. Upload content → Set pricing
6. Model approved → Go live

### Fan Journey
1. Browse models → View profiles
2. Subscribe to model → Access content
3. Buy tokens → Send tips
4. Unlock PPV content
5. Chat with AI persona

### Admin Flow
1. Review pending creators
2. Check KYC/Stripe status
3. Approve/reject applications
4. Review model submissions
5. Handle content reports
6. Issue strikes if needed

---

## 📋 API Endpoints

### Creator
- `GET/PUT /api/creator/onboarding` - Onboarding status
- `POST /api/creator/stripe-connect` - Start Stripe onboarding
- `GET/POST /api/creator/models` - Model CRUD
- `GET /api/creator/stats` - Dashboard stats

### Admin
- `GET /api/admin/stats` - Queue counts
- `GET /api/admin/creators` - Pending creators
- `POST /api/admin/creators/[id]/approve` - Approve creator
- `GET /api/admin/models` - Pending models

### Tokens
- `GET /api/wallet` - Get balance
- `POST /api/tokens/checkout` - Buy tokens
- `POST /api/tips/send` - Send tip

### PPV
- `GET/POST /api/creator/ppv` - PPV management
- `POST /api/ppv/[id]/purchase` - Buy PPV

---

## 🛡️ Safety Features

- **Age Verification**: 18+ requirement for creators and NSFW content
- **Blocked Terms Filter**: Auto-reject youth-coded, incest, violence terms
- **No Real Person Likeness**: Declaration required
- **Celebrity Impersonation Check**: Automated name detection
- **Content Review**: Manual approval for all models
- **Strike System**: Progressive enforcement
- **Audit Logging**: Full trail for disputes

---

## 📄 License

Proprietary - All rights reserved - Hybrid Creator/Fan Platform

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

---

## 💰 TOKEN WALLET & TIPPING SYSTEM

### Overview
A complete Stripe-integrated token system for:
- Extra message charges
- In-chat tipping with animations
- Future: PPV unlocks, paid media

### Token Conversion
- **250 tokens = £1**
- Extra message cost: 100 tokens (~£0.40)
- Tip presets: £1, £2, £5, £10

### Token Packs (Stripe Checkout)
```
£4.99  → 500 tokens
£9.99  → 1,200 tokens (Best Value)
£19.99 → 2,600 tokens
£39.99 → 5,500 tokens
```

### Tipping Flow
1. User clicks Tip button in chat
2. Modal shows presets + custom amount
3. Confirms with token cost & £ equivalent
4. **Animated success screen** with floating hearts
5. Tip event appears in chat
6. AI sends safe acknowledgement (one-time, no coercion)

### Components Created

```
components/chat/
├── TipModal.tsx          # Tip button, modal, success animation
├── WalletComponents.tsx  # Balance display, buy tokens, history
├── ChatModeSelector.tsx  # NSFW/SFW mode selection
├── ChatInterface.tsx     # Complete chat with integrated tipping
└── index.ts              # Exports

app/api/
├── tips/send/route.ts    # Send tip endpoint
└── tokens/
    ├── packs/route.ts    # Get token packs
    ├── checkout/route.ts # Stripe checkout (existing)
    └── history/route.ts  # Transaction history

lib/tokens/
├── types.ts              # Token types & utilities
├── token-service.ts      # Server-side token operations
├── tip-acknowledgement.ts # AI tip response rules
└── database-schema.sql   # All token/tip tables + RPC functions
```

### Database Tables
```sql
token_packs           -- Purchasable token bundles
token_wallets         -- User balances
token_ledger          -- All transactions (authoritative)
token_pack_purchases  -- Stripe checkout tracking
tips                  -- Tip records with split calculation
creator_payout_ledger -- Creator earnings from tips
platform_config       -- Configurable settings
chat_events           -- Tip events for AI acknowledgement
```

### Key Features

**Tip Modal:**
- Preset amounts with £ equivalents
- Custom amount input
- Balance check with "Buy Tokens" redirect
- Success animation with floating hearts

**Wallet Display:**
- Compact mode for chat header
- Full mode with Buy button
- Balance flash animation on changes

**AI Tip Acknowledgement (SAFE):**
- Brief, appreciative response
- NO requests for more tips
- NO quid-pro-quo promises
- NO emotional dependency language
- Respects current chat mode (SFW vs NSFW)

### CSS Animations Added
- `animate-scale-in` - Modal entrance
- `animate-float-heart` - Floating hearts on tip success
- `animate-sparkle` - Sparkle effects
- `animate-tip-received` - Tip bubble in chat
- `animate-balance-flash` - Balance update highlight
- `animate-shake` - Error shake

### API Endpoints

**POST /api/tips/send**
```json
{
  "creator_id": "uuid",
  "amount_tokens": 500,
  "thread_id": "uuid",
  "chat_mode": "nsfw"
}
// Returns: { success, tip_id, new_balance }
```

**GET /api/tokens/packs**
```json
// Returns: { packs: [...] }
```

**GET /api/tokens/history**
```json
// Returns: { transactions: [...] }
```

### Safety Rules (Enforced)
- Tips are OPTIONAL - never required
- NO coercion, guilt, or pressure
- NO "pay for sex" framing
- Clear pricing before every spend
- Transaction history for disputes
- Platform fee: 30% (configurable)

### Integration Notes

**In Chat Header:**
```tsx
<WalletBalance
  balance={userBalance}
  onBuyTokens={() => setShowBuyTokens(true)}
  compact
/>
```

**Tip Button:**
```tsx
<TipButton
  creatorName="Luna"
  creatorId={creatorId}
  threadId={threadId}
  chatMode="nsfw"
  userBalance={balance}
  onTipSent={handleTipSent}
  onBuyTokens={() => setShowBuyTokens(true)}
/>
```

**Full Chat Interface:**
```tsx
<ChatInterface
  creatorId={creatorId}
  creatorName="Luna"
  chatMode="nsfw"
  nsfwEnabled={true}
  sfwEnabled={true}
  userBalance={1000}
  onBalanceChange={setBalance}
/>
```

---

## 💰 STRIPE TOKEN WALLET SYSTEM

### Overview

LYRA uses a **token-based wallet system** for:
- Extra messages beyond subscription allowance
- Tips to creators
- Future: PPV content unlocks

This is **additive** to existing subscriptions - subscriptions remain unchanged.

### Token Packs

| Pack | Price | Tokens | Per Token |
|------|-------|--------|-----------|
| Basic | £4.99 | 500 | ~1.0p |
| Popular | £9.99 | 1,200 | ~0.8p |
| Value | £19.99 | 2,600 | ~0.8p |

**Conversion:** 250 tokens ≈ £1

### Costs

- **Extra message:** 100 tokens (~£0.40)
- **Tip presets:** 250/500/1250 tokens (£1/£2/£5)

### Implementation Files

```
lib/tokens/
├── types.ts              # TypeScript types + utilities
├── token-service.ts      # Server-side operations
├── tip-acknowledgement.ts # AI tip response handling
├── database-schema.sql   # Database tables + functions
└── index.ts              # Exports

app/api/
├── wallet/route.ts           # Get balance
├── wallet/transactions/      # Transaction history
├── tokens/packs/route.ts     # List token packs
├── tokens/checkout/route.ts  # Stripe Checkout
├── tips/route.ts             # Send tips
└── webhooks/stripe/route.ts  # Stripe webhooks

components/tokens/
├── WalletBalance.tsx     # Balance display
├── BuyTokensModal.tsx    # Purchase UI
├── TipModal.tsx          # Tip UI
├── TipButton.tsx         # Tip button for chat
├── TransactionHistory.tsx # Ledger display
└── index.ts              # Exports
```

### Database Tables

```sql
-- Token packs (purchasable bundles)
token_packs (sku, price_minor, tokens, stripe_price_id)

-- User wallets (cached balance)
token_wallets (user_id, balance_tokens, lifetime_purchased, lifetime_spent)

-- Ledger (authoritative record)
token_ledger (user_id, type, reason, amount_tokens, balance_after, ...)

-- Purchases
token_pack_purchases (user_id, stripe_checkout_session_id, status, ...)

-- Tips
tips (user_id, creator_id, amount_tokens, platform_fee_pct, creator_share_tokens, ...)

-- Creator payouts
creator_payout_ledger (creator_id, type, amount_tokens, amount_gbp_minor, status, ...)
```

### Stripe Integration

**Checkout Flow:**
1. User selects token pack
2. `POST /api/tokens/checkout` creates Stripe Checkout session
3. User completes payment on Stripe
4. Webhook `checkout.session.completed` triggers credit
5. Tokens added to wallet via `credit_tokens()` function

**Webhook Events Handled:**
- `checkout.session.completed` - Credit tokens
- `charge.refunded` - Debit tokens
- `payment_intent.payment_failed` - Mark failed

### Atomic Spend Function

```sql
-- spend_tokens(user_id, amount, reason, creator_id?, thread_id?, ...)
-- Uses row-level locking for concurrency safety
-- Returns: { success, new_balance, ledger_id, error_message }
```

### AI Tip Acknowledgement

When a user tips, the next AI response includes a one-time prompt:
- Be grateful and warm
- Keep brief (1-2 sentences)
- Do NOT ask for more tips
- Do NOT promise anything in exchange
- Do NOT escalate content

**Example good response:** "Aw, thank you! 💕 That's really sweet of you."

### Tip Split (Configurable)

```
Platform fee: 30% (default, configurable)
Creator share: 70%
```

Stored in `platform_config` table.

### Setup Steps

1. **Run SQL migrations:**
   ```bash
   psql -f lib/tokens/database-schema.sql
   ```

2. **Set environment variables:**
   ```env
   STRIPE_SECRET_KEY=sk_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

3. **Create Stripe webhook:**
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `charge.refunded`, `payment_intent.payment_failed`

4. **Optional:** Create Stripe Products/Prices for token packs and update `stripe_price_id` in database.

### API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet` | GET | Get balance |
| `/api/wallet/transactions` | GET | Transaction history |
| `/api/tokens/packs` | GET | List token packs |
| `/api/tokens/checkout` | POST | Create checkout |
| `/api/tips` | GET | Get tip config |
| `/api/tips` | POST | Send tip |

### Safety Notes

- Tips are voluntary gratuities, not purchases
- No "pay for sex" language in UI
- AI never asks for tips or promises anything in exchange
- Clear pricing shown before spend
- Transaction history for transparency
