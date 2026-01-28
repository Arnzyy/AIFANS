# AIFans - Technical Fluency Document

> **Purpose**: Transform every build into a learning experience
> **Updated by**: Claude Code (bootstrapped 2026-01-25)
> **Goal**: You can explain every technical decision with confidence

---

## How This Document Works

This document captures how AIFans works in plain language. It's not a technical manual—it's knowledge transfer designed for YOU. By the end, you'll understand not just what the code does, but why it's built this way and what tradeoffs were made.

---

## The Big Picture

**What AIFans Is:**

Imagine a nightclub where every performer has a clone that can talk to hundreds of fans simultaneously, remembering every conversation, never getting tired, and always staying in character. That's AIFans.

Creators build AI personalities that represent them—not generic chatbots, but customized companions with specific traits, speaking styles, and boundaries. Fans subscribe to access these AI versions, chat with them, view exclusive content, and tip for special interactions. The platform handles all the complex parts: payments, content moderation, AI orchestration, and compliance.

**The Core Innovation:**

Most platforms are either content-focused (OnlyFans) or chat-focused (Character.AI). AIFans combines both: creators earn from subscriptions AND pay-per-message chat, while maintaining control over their AI's personality and boundaries. The AI isn't just answering questions—it's role-playing a specific character with memory of past conversations.

**Why This Matters:**

Creators scale their earning potential beyond physical time constraints. A creator can serve 10 fans or 10,000 fans with the same effort once their AI personality is configured. Fans get immediate responses and personalized interaction instead of waiting in DM queues.

---

## System Architecture

### The Analogy: A Film Studio

Think of AIFans like a film studio with multiple production stages:

1. **Casting Office** (Creator Onboarding) - New talent applies, submits legal declarations, gets approved
2. **Character Department** (AI Personality Builder) - Actors define their character: appearance, personality traits, speaking style, boundaries
3. **Set & Props** (Content Management) - Creators shoot scenes (posts), organize into free previews or paid content
4. **Box Office** (Subscription & Payment System) - Fans buy tickets (subscriptions) or pay-per-view (PPV posts, chat credits)
5. **Theater** (User Experience) - Fans browse creators, watch content, chat with AI characters
6. **Back Office** (Admin & Compliance) - Legal reviews character submissions, handles complaints, ensures everyone follows the rules
7. **Accounting** (Payout System) - Studio calculates royalties, splits revenue, sends payments to creators

### How Data Flows

Let's trace what happens when a fan sends a chat message to a creator's AI:

1. **Fan clicks "Send"** → Message sent to `/api/chat/[creatorId]` API route
2. **Session Check** → Backend verifies: Does this fan have an active subscription? Do they have chat credits?
3. **Credit Deduction** → If yes, deduct message cost (e.g., 10 credits) from fan's wallet
4. **Personality Fetch** → Load the creator's AI personality config from `ai_personalities` table (traits, voice, boundaries, interests)
5. **Memory Retrieval** → Grab recent conversation history from `ai_chat_messages` (last 20 messages for context)
6. **Prompt Construction** → Build a mega-prompt:
   - System instructions (compliance rules, platform boundaries)
   - Character card (personality, appearance, speaking style)
   - Conversation memory (previous messages)
   - Fan's new message
7. **LLM API Call** → Send to external AI provider (ModelsLab, Venice, or self-hosted LLM)
8. **Response Filtering** → Check response for blocked terms, ensure it matches content rating
9. **Database Logging** → Save AI's response to `ai_chat_messages` with credit tracking
10. **Real-time Delivery** → Stream response back to fan's browser

**Key Insight**: The AI never "knows" anything about the creator beyond what's in the personality config. It's pure roleplay based on instructions, not a trained model of the real person.

### The Cast of Characters (Key Files)

| File | Role | Plain English |
|------|------|---------------|
| `src/lib/ai/chat-service.ts` | Lead Actor | Orchestrates the entire chat flow—session management, credit checking, message generation |
| `src/lib/ai/personality/config.ts` | Character Designer | Defines how AI personalities are structured (traits, voice, boundaries) |
| `src/lib/ai/memory-system/service.ts` | Script Supervisor | Manages conversation memory—what to remember, what to forget |
| `src/lib/stripe/checkout.ts` | Box Office Manager | Creates Stripe payment sessions for subscriptions and credits |
| `src/lib/supabase/server.ts` | Security Guard | Server-side database client—verifies user identity, enforces access rules |
| `src/app/api/chat/[creatorId]/route.ts` | Stage Manager | API endpoint that receives chat requests and coordinates the response |
| `src/components/chat/ChatInterface.tsx` | Theater Screen | The UI fans see—message bubbles, input box, typing indicators |
| `database/migrations/` | Building Blueprints | Database schema definitions—what tables exist, what rules govern them |
| `src/lib/compliance/constants.ts` | Legal Department | Blocked terms, restricted tags, compliance rules |
| `src/middleware.ts` | Front Door Bouncer | Checks authentication before letting users into protected pages |

---

## Key Technical Decisions

### 2024-2025 — Supabase for Database + Auth

**What we chose**: Supabase (PostgreSQL with built-in auth and Row-Level Security)

**Why this over alternatives**:
- **vs. Firebase**: Better relational data modeling (subscriptions link to users link to transactions), SQL is more powerful for complex queries
- **vs. Raw PostgreSQL**: Supabase provides auth, real-time, and admin dashboard out of the box—no need to build user management from scratch
- **vs. MongoDB**: Subscriptions, transactions, and content access require relational integrity. Can't afford a user being charged but not getting access due to eventual consistency.

**Tradeoffs we accepted**:
- Locked into Supabase's ecosystem (migration would be painful)
- Free tier limits (50,000 monthly active users before upgrade needed)
- Real-time features available but not used yet (could enable live chat in future)

**When we might revisit this**:
- If scaling beyond 100K users (Supabase Pro pricing becomes significant)
- If need for multi-region deployment (Supabase has limited region options)

---

### 2024-2025 — Credit-Based Chat Instead of Unlimited

**What we chose**: Fans buy credits (tokens), each message costs ~10 credits

**Why this over alternatives**:
- **vs. Unlimited Chat with Subscription**: Prevents abuse (fans spamming thousands of messages), makes revenue predictable (LLM API costs are per-token)
- **vs. Time-Based** (pay per minute): Chat messages vary in length—charging per message is simpler and feels more tangible
- **vs. Character Limits**: Users don't think in tokens/characters, they think in messages

**Tradeoffs we accepted**:
- Friction in UX (users need to buy credits before chatting)
- Potential for users to feel "nickel-and-dimed"
- Need to balance credit pricing with LLM API costs (if credits too cheap, platform loses money)

**When we might revisit this**:
- If churn rates high due to credit friction
- If competitor offers unlimited chat and steals market share
- If LLM costs drop significantly (GPT-5 at 10x cheaper pricing)

---

### 2024-2025 — Multi-Provider LLM Strategy

**What we chose**: Support ModelsLab, Venice.ai, AND self-hosted LLMs (not just OpenAI)

**Why this over alternatives**:
- **Adult content restrictions**: OpenAI bans NSFW, Anthropic bans adult content. Need uncensored providers.
- **Cost flexibility**: Creators can use cheap self-hosted models (RunPod) vs. premium APIs
- **Reliability**: If one provider goes down, can switch to another
- **Creator choice**: Some creators want full control (self-hosted), others want simplicity (managed API)

**Tradeoffs we accepted**:
- Code complexity (need to support multiple API formats)
- Quality variance (self-hosted models may produce worse responses)
- Debugging harder (issue could be in our code OR the LLM provider)

**When we might revisit this**:
- If one provider becomes dominant and handles NSFW reliably
- If maintaining multiple integrations becomes too expensive

---

### 2024-2025 — Cloudflare R2 Over AWS S3

**What we chose**: Cloudflare R2 for image/video storage

**Why this over alternatives**:
- **Cost**: R2 has zero egress fees (AWS charges $0.09/GB for downloads). With adult content, fans download a LOT.
- **Speed**: Cloudflare's CDN is built-in, S3 requires CloudFront setup
- **Simplicity**: S3-compatible API, so can switch back to S3 if needed

**Tradeoffs we accepted**:
- Less mature than S3 (fewer features, smaller community)
- R2 dashboard less polished than AWS Console
- If Cloudflare has an outage, entire media library is inaccessible

**When we might revisit this**:
- If R2 pricing changes dramatically
- If need advanced features (ML video processing, live transcoding)

---

### 2024-2025 — Three-Tier Content Model (Free/Subscribers/PPV)

**What we chose**:
- Free posts (visible to everyone, drive discovery)
- Subscribers-only posts (exclusive to monthly subscribers)
- PPV posts (pay-per-view, anyone can buy individual access)

**Why this over alternatives**:
- **vs. All Paid**: Need discovery mechanism—free posts attract new fans
- **vs. All Free with Tips**: Not sustainable—tips are unpredictable income
- **vs. OnlyFans Model** (subscription only): PPV allows monetizing casual fans who won't commit to monthly subscription

**Tradeoffs we accepted**:
- Complexity for creators (need to decide which tier for each post)
- Risk of cannibalization (fans buy PPV instead of subscribing)
- Need to prevent PPV content from being cheaper than subscription in aggregate

**When we might revisit this**:
- If PPV underperforms (creators don't use it)
- If subscription tiers become too complicated

---

## The Error Diary

### 2025-01 — Chat Access Gating Oversimplified

**What broke**:
Recent commits simplified subscription checks in chat API routes. Some edge cases now allow unauthorized access.

**What I initially assumed**:
Subscription check could be a simple boolean—either user is subscribed or not.

**Actual root cause**:
Subscriptions have states (active, past_due, cancelled, expired). Need to check:
1. Is there a subscription record?
2. Is it status = 'active'?
3. Has it expired (end_date < now)?
4. Is payment failing (past_due with retry attempts)?

**The fix**:
Restore full subscription validation logic in `src/lib/chat/access.ts`. Don't oversimplify for "cleaner code."

**The lesson**:
Security checks should be verbose and explicit. Code elegance is secondary to correctness.

**Technical concept unlocked**:
Payment subscription lifecycle management—subscriptions aren't binary states.

---

### 2025-01 — Unread Message Count Query Mismatch

**What broke**:
Unread message counts show incorrect numbers or fail silently.

**What I initially assumed**:
Messages table has a `receiver_id` field for querying unread messages per user.

**Actual root cause**:
Database schema uses `conversation_id` to link messages to conversations, not direct `receiver_id`. Query was looking for a field that doesn't exist.

**The fix**:
Join `messages` → `conversations` → filter by `participant_id = current_user`. Then count unread.

**The lesson**:
Never assume schema structure matches intuition. Always verify actual table columns before writing queries.

**Technical concept unlocked**:
Relational database normalization—messages don't duplicate user IDs when conversations already track participants.

---

### Pre-Bootstrap — Subscriber Count Shows "0"

**What broke**:
Creator dashboard shows 0 subscribers even when subscriptions exist.

**What I initially assumed**:
A simple COUNT query on subscriptions table would work.

**Actual root cause**:
Need to aggregate across multiple tables:
- `subscriptions` (active paid subscriptions)
- `follows` (free follows, should they count?)
- Filter by creator AND status = 'active'
- Group by creator_id

**The fix**:
Create a database view or computed column that aggregates correctly. OR use a client-side query that joins properly.

**The lesson**:
Aggregation queries need clarity on business rules—does "subscriber" include free followers? Cancelled but not expired?

**Technical concept unlocked**:
Database views vs. computed fields vs. client-side aggregation—each has tradeoffs.

---

## Concepts Explained

### Row Level Security (RLS)

**The Restaurant Analogy:**

Imagine a restaurant where every table has a magical tablecloth. When you sit down, the tablecloth only shows menu items you're allowed to order based on who you are. VIPs see premium items, regular customers see standard menu, and staff see back-office prices.

That's Row-Level Security. The database itself enforces "who can see what" based on rules attached to each table. It's not the application code filtering—it's the database refusing to return unauthorized rows.

**In AIFans:**

- **Profiles table**: Everyone can read anyone's profile (discovery), but you can only edit YOUR profile.
- **Posts table**: If post.type = 'free', everyone sees it. If 'subscribers_only', database checks "does current user have active subscription to this creator?" If 'ppv', "does user own this PPV entitlement?"
- **Messages table**: Database checks "is current user a participant in this conversation?" before returning any messages.

**Why This Matters:**

Even if application code has a bug (forgot to check subscription), the database refuses to leak data. It's defense in depth—security at the data layer, not just application layer.

**The Gotcha:**

RLS policies must be tested carefully. A policy like `USING (true)` disables security. A policy that references `auth.uid()` fails if the database connection isn't authenticated (service role connections bypass RLS).

---

### Supabase Service Role vs. Anon Key

**The Hotel Analogy:**

- **Anon Key** = Guest keycard. Lets you access your own room, public areas (lobby, pool), but NOT other guests' rooms or staff areas. Every action is filtered through RLS policies.
- **Service Role Key** = Master keycard (housekeeping). Opens EVERY door, bypasses all locks. Used for admin tasks, migrations, bulk operations.

**In AIFans:**

- **Browser (client-side)**: Uses anon key. When user logs in, their JWT (session token) is attached to the connection. Database sees `auth.uid()` and enforces RLS.
- **Server API Routes**: Use service role key for admin operations (creating users, bulk updates) OR create a client scoped to the user's session for RLS enforcement.

**Why This Matters:**

If you accidentally use service role key in client-side code, you've given every user master key access. The bundle would include the key, and anyone inspecting network requests sees it.

**The Rule:**

Service role key ONLY in server-side code (`src/app/api/`, never imported in `'use client'` components).

---

### Stripe Checkout vs. Payment Intents

**The Shopping Analogy:**

- **Stripe Checkout** = Buying from Amazon. Click "Buy Now," get redirected to Amazon's checkout page, enter payment info on THEIR site, then redirected back to your site with confirmation.
- **Payment Intents** = Building your own checkout. You collect card info, you handle validation, you process payment, you handle errors.

**What AIFans Uses:**

Stripe Checkout for subscriptions and credit purchases. Much simpler—Stripe handles PCI compliance, card validation, 3D Secure, error messaging.

**Why Not Payment Intents?**

We don't need custom checkout UI. Stripe's hosted page is fast, secure, and handles all edge cases (international cards, Apple Pay, Google Pay).

**The Tradeoff:**

Less control over UX (user leaves our site briefly), but 10x less code and zero PCI compliance burden.

---

### AI Prompt Engineering (System + Character + Memory + Message)

**The Theater Analogy:**

Imagine directing an actor who has amnesia—they forget everything after each scene. To get consistent performance:

1. **System Instructions** (Director's Rules): "You're performing in a PG-13 film. No graphic violence. Stay in character."
2. **Character Card** (Script): "You play Alex, a 28-year-old barista who's sarcastic but kind. You love indie music. You're afraid of heights."
3. **Scene Memory** (Previous Takes): "In the last scene, the customer ordered a latte and you joked about their spelling."
4. **Current Line** (New Dialogue): Customer says, "Make it extra hot."

The actor (LLM) now has context to respond in character, referencing past interactions, while following rules.

**In AIFans:**

Every chat message to the AI includes:
1. **System prompt**: Platform rules (no minors, no deepfakes, stay in character)
2. **Personality config**: The creator's character (age, traits, interests, speaking style, boundaries)
3. **Conversation history**: Last 20 messages (so AI remembers what was discussed)
4. **User's message**: The new thing the fan just said

**Why This Matters:**

Without memory, every message would feel like talking to a stranger. With memory, the AI can say "Like we discussed earlier..." or reference jokes from previous conversations.

**The Tradeoff:**

More context = higher LLM API costs (charged per token). Balance between memory depth and cost.

---

### Subscriptions vs. Follows vs. PPV Entitlements

**The Streaming Service Analogy:**

- **Follow** = Adding to your watchlist. Free, shows up in your feed, but doesn't unlock content.
- **Subscription** = Netflix monthly plan. Recurring payment, unlocks all subscriber-only content for that creator.
- **PPV Entitlement** = Renting a movie on iTunes. One-time payment, permanent access to THAT specific item.

**In AIFans:**

- **Follow**: User can see the creator in their feed, get notifications, but doesn't unlock paid content.
- **Subscription**: Monthly/quarterly/yearly recurring payment. Unlocks ALL 'subscribers_only' posts + chat access.
- **PPV Entitlement**: One-time purchase. Unlocks ONE specific post or content package forever.

**Why Three Systems?**

Flexibility. Casual fans can PPV without committing to a subscription. Hardcore fans subscribe for better value. Free follows drive discovery.

**The Database Design:**

Three separate tables (`follows`, `subscriptions`, `ppv_entitlements`) all reference `creator_id` and `user_id`. When checking access to a post:
1. Is it free? → Show everyone
2. Is it subscribers_only? → Check subscriptions table
3. Is it PPV? → Check ppv_entitlements table

---

## Investor-Ready Explanations

### "How does the multi-tenant architecture work?"

AIFans is single-database multi-tenant. Every creator is a "tenant" with their own:
- Subscription tiers (custom pricing)
- AI personality (custom character)
- Content library (posts, PPV offers)
- Subscriber base (isolated per creator)

We use Row-Level Security (RLS) policies to ensure data isolation—fans can't see another creator's subscriber list, creators can't edit another creator's content. Think of it like Gmail: everyone's in one database, but you only see YOUR emails.

**Why not separate databases per creator?**
Cost and complexity. Managing 10,000 databases is operationally insane. One database with RLS scales to millions of creators.

**What if RLS fails?**
Defense in depth: application code ALSO checks access. Database is the last line of defense.

---

### "What happens if you get 10x the users tomorrow?"

**Current bottlenecks**:
1. **Database connections**: Supabase free tier = 60 concurrent connections. We use connection pooling (PgBouncer) to handle spikes.
2. **LLM API rate limits**: Most providers rate-limit by requests/minute. We'd need to upgrade plans or load-balance across multiple API keys.
3. **R2 bandwidth**: No bandwidth fees, but high concurrency might hit rate limits. Solution: Cloudflare CDN caching.

**Scaling path**:
- 10x users (~10K active) → Upgrade Supabase to Pro ($25/mo), more connections
- 100x users (~100K active) → Add read replicas, split traffic between regions
- 1000x users (~1M active) → Multi-region Postgres, dedicated LLM infrastructure

**Current capacity**: ~1,000 concurrent users comfortably. Beyond that, need Supabase Pro + LLM provider tier upgrade.

---

### "How do you handle security / user data?"

**Authentication**: Supabase Auth (industry-standard, bcrypt password hashing, JWT sessions)

**Data Protection**:
- All API calls authenticated via JWT
- Row-Level Security on database (can't query other users' data)
- Service role key never exposed client-side
- Stripe handles payment data (PCI compliant)
- Media stored in R2 with presigned URLs (can't upload malicious files directly)

**Content Moderation**:
- Creator declarations (8 affirmations logged immutably)
- Blocked terms filter (underage, deepfakes, real celebrities)
- Admin approval for creators and AI models before publishing
- User reporting system with admin review queue
- AI system prompts enforce boundaries (can't role-play minors, etc.)

**Compliance**:
- GDPR: Users can export/delete data
- Age verification: Placeholder (would integrate IDology or similar)
- Geographic blocking: Config exists for restricted countries
- Tax reporting: DAC7 infrastructure for creator earnings (EU requirement)

---

### "What's your tech stack and why?"

**Frontend**: Next.js 14 (React framework)
- Why: Server-side rendering for SEO, App Router for modern architecture, Vercel deployment optimizations

**Database**: Supabase (PostgreSQL + Auth + RLS)
- Why: Relational data (subscriptions/transactions need integrity), built-in auth, RLS for security

**Payments**: Stripe
- Why: Industry standard, handles compliance, supports subscriptions + one-time payments

**Storage**: Cloudflare R2
- Why: S3-compatible but zero egress fees (critical for media-heavy platform)

**AI**: Multi-provider (ModelsLab, Venice.ai, self-hosted)
- Why: Adult content restrictions require uncensored LLMs, need flexibility

**Styling**: Tailwind CSS + Radix UI
- Why: Utility-first CSS for fast iteration, Radix for accessible headless components

---

### "How long would it take another developer to understand this codebase?"

**Onboarding timeline**:
- **Day 1**: Understand database schema, run dev environment, explore UI
- **Week 1**: Understand auth flow, API routes, basic CRUD operations
- **Week 2**: Understand AI chat system, payment flow, RLS policies
- **Month 1**: Comfortable making changes across the stack

**Code structure is logical**:
- `/app` = pages (Next.js file-based routing)
- `/components` = React UI
- `/lib` = business logic (organized by domain: ai, chat, stripe, etc.)
- `/database` = schema migrations

**Documentation gaps** (before this document):
- No architecture diagram
- No explanation of AI prompt construction
- No guide to RLS policies
- No explanation of subscription vs. PPV logic

**This document solves that.** A new developer reads this first, then dives into code with context.

---

## If I Had To Rebuild This

### What Worked Well

1. **Supabase RLS**: Security at the database layer caught bugs in application code
2. **Three-tier content model**: Free/Subscribers/PPV gives creators flexibility
3. **Multi-provider LLM**: Not locked into one vendor, can optimize costs
4. **Modular lib/ structure**: Business logic separated from UI makes testing easier
5. **Stripe Checkout**: Dead simple, handles all edge cases

### What I'd Do Differently

1. **Start with TECHNICAL-FLUENCY.md**: Document decisions AS you make them, not retroactively
2. **Add database views**: Subscriber counts, revenue aggregations should be computed in DB, not client
3. **Use feature flags from day 1**: Too much half-finished code lingering (moderation, payouts)
4. **More granular RLS policies**: Some policies are too permissive (e.g., notifications allow reading other users' notifications by ID guessing)
5. **AI response caching**: Frequently asked questions could be cached (reduce LLM costs)
6. **Email from the start**: Notification system exists but no delivery mechanism

### Patterns Worth Reusing

- `createServerClient()` pattern for server-side Supabase calls (keeps RLS enforced)
- Presigned R2 URLs for uploads (client uploads directly to R2, not through our API)
- Stripe webhook handlers with signature verification (security best practice)
- Personality config as structured data (easy to validate, version, and migrate)

### The Biggest Gotcha for Future Maintenance

**Subscription status checks are scattered.**

Search codebase for "subscription" and you'll find 20+ places checking `status === 'active'`. If subscription logic changes (e.g., grace periods for past_due), you need to update everywhere.

**Solution for v2**: Create `lib/subscriptions/is-subscribed.ts` with single source of truth function. All code imports and uses that.

---

## Quick Reference

### This App In One Sentence

AIFans is a multi-tenant platform where adult content creators build AI chatbot personas, monetize through subscriptions and pay-per-message chat, while the platform handles payments, content delivery, compliance, and moderation.

### The Three Most Important Files

1. **`src/lib/ai/chat-service.ts`** — The brain of the AI chat system. Message generation, memory, credit deduction all happen here.
2. **`src/lib/supabase/server.ts`** — Database access layer. Every server-side query goes through this.
3. **`database/migrations/`** — The schema is the blueprint. Understanding tables/policies is critical to understanding the app.

### The Most Clever Thing About This Build

**AI personality injection is pure prompt engineering—no model fine-tuning.**

Creators configure a structured personality (traits, voice, boundaries), and we inject it into the system prompt. The base LLM (GPT, Claude, Llama) has never seen this character before, but it role-plays perfectly because the prompt is detailed enough.

This means:
- No expensive model training
- Creators can edit personality in real-time (changes apply immediately)
- Can switch LLM providers without losing character consistency

### The Biggest Gotcha For Future Maintenance

**RLS policies can silently fail.**

If you create a server-side client with service role key and forget, queries won't fail—they'll just bypass RLS. You might leak data without realizing it.

**Testing RLS**: Always test with anon key + user JWT, not service role. Create test users with different roles and verify they can't access each other's data.
