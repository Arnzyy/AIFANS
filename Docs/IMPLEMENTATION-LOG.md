# Implementation Log

## How To Use
This document tracks everything that exists in the AIFANS codebase.
Updated during bootstrap process on 2026-01-25.

---

## Environment Variables

| Variable | Purpose | Set In |
|----------|---------|--------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Vercel / .env.local |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | Vercel / .env.local |
| SUPABASE_SERVICE_ROLE_KEY | Admin access to Supabase | Vercel (secret) |
| SUPABASE_PROJECT_ID | Project ID for migrations | .env.local |
| R2_ACCOUNT_ID | Cloudflare account ID | Vercel |
| R2_ACCESS_KEY_ID | R2 access key | Vercel |
| R2_SECRET_ACCESS_KEY | R2 secret key | Vercel (secret) |
| R2_BUCKET_NAME | Storage bucket (aifans-media) | Vercel |
| R2_PUBLIC_URL | Public CDN URL | Vercel |
| STRIPE_SECRET_KEY | Stripe API key | Vercel (secret) |
| STRIPE_PUBLISHABLE_KEY | Stripe public key | Vercel |
| STRIPE_WEBHOOK_SECRET | Webhook validation | Vercel (secret) |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Client-side Stripe key | Vercel |
| MODELSLAB_API_KEY | AI chat provider (option 1) | Vercel (secret) |
| VENICE_API_KEY | AI chat provider (option 2) | Vercel (secret) |
| LLM_API_URL | Self-hosted LLM endpoint | Vercel |
| LLM_API_KEY | Self-hosted LLM key | Vercel (secret) |
| NEXT_PUBLIC_APP_URL | App base URL | Vercel |
| NEXT_PUBLIC_APP_NAME | App display name | Vercel |
| PLATFORM_COMMISSION_RATE | Platform fee (0.20 = 20%) | Vercel |
| BLOCKED_COUNTRIES | Geo-blocking list | Vercel |
| RESEND_API_KEY | Email service (optional) | Vercel (secret) |
| NEXT_PUBLIC_POSTHOG_KEY | Analytics (optional) | Vercel |
| APATERO_API_KEY | Image generation (optional) | Vercel (secret) |
| SD_API_KEY | StableDiffusion API (optional) | Vercel (secret) |

---

## Database Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | Base user profiles (all users) | Public read, owner write |
| creator_profiles | Extended creator data | Owner write, public metadata read |
| creator_declarations | Immutable compliance affirmations | Owner insert only |
| creators | Creator business profiles (KYC, Stripe) | Owner read/write |
| creator_models | AI personas for each creator | Public read approved, owner write |
| ai_personalities | Personality configurations (traits, voice) | Owner read/write |
| subscription_tiers | Pricing tiers per creator | Public read, creator write |
| subscriptions | Active user subscriptions | Owner read |
| follows | Free follows (non-subscription) | Public read, owner write |
| posts | User-generated content | Access-gated (free/subscribers/PPV) |
| post_media | Media attachments for posts | Linked to post access |
| post_likes | Like engagement | Public read, owner write |
| post_purchases | PPV purchase records | Owner read |
| ppv_offers | Pay-per-view content packages | Public read, creator write |
| ppv_entitlements | PPV access rights | Owner read |
| ai_chat_sessions | Chat session management | Participant access |
| ai_chat_messages | Individual chat messages | Participant access |
| conversations | DM conversations | Participant access |
| messages | Direct messages | Participant access |
| credit_balances | User wallet balances | Owner read |
| transactions | All financial transactions | Owner read |
| payouts | Creator payout ledger | Owner read |
| bookmarks | Saved posts | Owner read/write |
| categories | Content browse categories | Public read |
| creator_categories | Category assignments | Public read, admin write |
| notifications | User notifications | Owner read/write |
| content_reports | User-submitted reports | Admin read |
| creator_strikes | Warning/suspension system | Admin write, creator read |
| audit_log | Admin action audit trail | Admin read |

---

## RLS Policies

| Policy | Table | Rule |
|--------|-------|------|
| profile_select_public | profiles | Anyone can view profiles |
| profile_update_own | profiles | Users can update their own profile |
| creator_select_public | creator_models | Anyone can view approved models |
| creator_update_own | creator_models | Creators can update their own models |
| posts_select_free | posts | Anyone can view free posts |
| posts_select_subscribers | posts | Subscribers can view subscriber-only posts |
| posts_select_ppv | posts | PPV purchasers can view PPV posts |
| messages_select_participant | messages | Only conversation participants can view |
| subscriptions_select_own | subscriptions | Users can view their own subscriptions |
| transactions_select_own | transactions | Users can view their own transactions |
| notifications_own | notifications | Users can manage their own notifications |
| ai_chat_participant_access | ai_chat_sessions | Session participants only |

---

## Design System

| Element | Value | Notes |
|---------|-------|-------|
| Display Font | System default | Tailwind default stack |
| Body Font | System default | Tailwind default stack |
| Primary Color | hsl(262 83% 58%) | Purple (brand) |
| Accent Color | hsl(262 83% 58%) | Same as primary |
| Background | hsl(0 0% 0%) | Pure black |
| Foreground | hsl(0 0% 100%) | White text |
| Card Background | hsl(0 0% 5%) | Dark gray |
| Border | hsl(0 0% 20%) | Subtle border |
| Muted | hsl(0 0% 15%) | Secondary backgrounds |
| Aesthetic | Dark, entertainment-focused | Dark mode only |
| Border Radius | 0.5rem | Rounded corners |

---

## ZIP Progress

### ZIP-00: Foundation
- Started: [Pre-existing]
- Completed: ✅
- Notes: Next.js 14 setup, Supabase auth, basic page structure, dark theme

### ZIP-01: Creator System
- Started: [Pre-existing]
- Completed: ✅
- Notes: Creator onboarding, declarations, model creation, approval workflow

### ZIP-02: AI Chat Integration
- Started: [Pre-existing]
- Completed: ✅
- Notes: Personality system, memory, message generation, SFW/NSFW modes

### ZIP-03: Subscriptions & Payments
- Started: [Pre-existing]
- Completed: ✅
- Notes: Stripe Checkout, subscription tiers, billing periods, cancellation

### ZIP-04: Content Management
- Started: [Pre-existing]
- Completed: ✅
- Notes: Posts, media upload (R2), likes, bookmarks, PPV system

### ZIP-05: Messaging
- Started: [Pre-existing]
- Completed: ✅
- Notes: DM conversations, message threads, unread counts

### ZIP-06: Admin & Moderation (IN PROGRESS)
- Started: [Pre-existing]
- Completed: ⚠️ Partial
- Notes: Admin dashboard, creator approval, model approval working. Moderation queue UI exists but processing endpoints incomplete.

### ZIP-07: Creator Payouts (PENDING)
- Started: Not started
- Completed: ❌
- Notes: Stripe Connect placeholder exists. Payout calculation logic present but not fully integrated.

### ZIP-08: Production Polish (PENDING)
- Started: Not started
- Completed: ❌
- Notes: Security audit, performance optimization, final testing

---

## Third-Party Services

| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Supabase | Database + Auth + RLS | app.supabase.com |
| Stripe | Payments + Subscriptions | dashboard.stripe.com |
| Cloudflare R2 | Image/video storage | dash.cloudflare.com |
| ModelsLab / Venice.ai | AI chat LLM | [Provider dashboard] |
| Vercel | Hosting (assumed) | vercel.com |
| Resend | Email (optional) | resend.com |
| PostHog | Analytics (optional) | posthog.com |

---

## Known Issues

| Issue | Severity | ZIP to fix |
|-------|----------|------------|
| Moderation report processing endpoints are stubs | Medium | ZIP-06 |
| Stripe Connect payout flow incomplete | High | ZIP-07 |
| Email notifications not wired | Low | ZIP-08 |
| OAuth providers (Google/X/Twitch) not implemented | Medium | ZIP-08 |
| Geographic IP blocking configured but not enforced | Medium | ZIP-08 |
| Subscriber count shows "0" (aggregation TODO) | Low | ZIP-06 |
| SFW chat service has placeholder TODOs | Medium | ZIP-06 |
| Deepfake detection framework present but not automated | Medium | ZIP-08 |
| Tax reporting (DAC7) structure exists but not processing | High | ZIP-07 |
| Feature flags system not fully integrated | Low | ZIP-08 |

---

## API Route Summary

**Total Endpoints**: 86+

**By Category**:
- Auth & User: 6 routes
- Creators: 12 routes
- Content/Posts: 15 routes
- Chat (AI): 18 routes
- Subscriptions: 8 routes
- Payments: 7 routes
- PPV: 6 routes
- Messaging: 4 routes
- Admin: 22 routes
- Development/Testing: 8 routes

---

## Component Library

**UI Components** (Radix UI based):
- Avatar, Dialog, Dropdown, Label
- ScrollArea, Select, Separator
- Switch, Tabs, Toast, Tooltip

**Custom Components**:
- AuthLayout, CreatorDashboardLayout, FanLayout
- ChatInterface, MessageList, MessageInput
- PostCard, PostGrid, PostDetail
- ProfileHeader, ProfileCard
- SubscriptionTierCard, SubscriptionModal
- TokenWallet, TokenPackCard
- AdminSidebar, AdminHeader
- ContentReportCard, ModalQueue

---

## Key Decisions Made (Pre-Bootstrap)

1. **Dark Mode Only** - Platform targets adult entertainment, dark theme fits aesthetic
2. **Credit-Based Chat** - Per-message pricing instead of unlimited chat with subscription
3. **Three-Tier Content** - Free, Subscribers-only, PPV (clear monetization paths)
4. **Compliance-First** - Creator declarations immutable, AI personality restrictions
5. **Admin Approval Workflow** - Manual review of creators and AI models before publishing
6. **Multi-Provider AI** - Flexible LLM backend (ModelsLab, Venice, self-hosted)
7. **Platform Commission** - 20% fee on all transactions
8. **R2 over S3** - Cloudflare R2 for cost-effective media storage
9. **Subscription Discounts** - Longer billing periods get better pricing (3-month, yearly)
10. **SFW Mode Toggle** - Creators can offer safe-for-work chat variant

---

## Security Implementations

### Existing (Pre-Audit)
- Row-Level Security on all tables
- Creator declarations logged immutably
- Blocked terms filter (compliance layer)
- Admin whitelist (email-based)
- Stripe webhook signature verification
- R2 presigned upload URLs (no direct upload)
- Service role key never exposed client-side
- Content access gating (subscription/PPV checks)
- Audit log table (schema exists, not yet used)

### Added (2026-01-25 - ZIP-06 Quick Wins)
- ✅ **Security Headers** - HSTS, CSP, X-Frame-Options, X-Content-Type-Options (next.config.mjs)
- ✅ **Rate Limiting Infrastructure** - Upstash Redis integration ready (src/lib/rate-limit.ts)
- ✅ **Credential Rotation Process** - Documented checklist (scripts/rotate-credentials.md)
- ✅ **Environment Variables** - Added ENCRYPTION_KEY, UPSTASH_REDIS vars (.env.example)

### Pending (ZIP-06 Phases 3-7)
- ⏳ Rate limiting applied to API routes (Phase 3 - 6h)
- ⏳ MFA for admin/creator accounts (Phase 4 - 4h)
- ⏳ Audit logging implementation (Phase 5 - 12h)
- ⏳ RLS policy review and tightening (Phase 6 - 8h)
- ⏳ Input validation with Zod (Phase 7 - 16h)

---

## Next Steps (Post-Quick Wins)

### Immediate (< 1 hour)
1. ✅ ~~Run PRODUCTION-READINESS-AUDIT.md~~ (COMPLETED - Score: 52/100)
2. **Install dependencies**: `npm install`
3. **Rotate credentials** following scripts/rotate-credentials.md
4. **Set up Upstash Redis** account and add env vars
5. **Generate encryption key**: `openssl rand -base64 32`

### Security Hardening (ZIP-06 - 46 hours remaining)
6. Apply rate limiting to API routes (6h)
7. Enable MFA for admin/creator accounts (4h)
8. Implement audit logging (12h)
9. Review and fix RLS policies (8h)
10. Add Zod input validation (16h)

### Features & Compliance (ZIP-07)
11. Implement GDPR data export/deletion (16h)
12. Complete moderation queue processing logic (8h)
13. Implement Stripe Connect for creator payouts (16h)
14. Wire up email notifications (Resend) (6h)

### Production Readiness (ZIP-08)
15. Add OAuth providers (Google, X, Twitch) (8h)
16. Fix subscriber count aggregation (2h)
17. Complete SFW chat service placeholders (4h)
18. Implement geographic blocking enforcement (4h)
19. Production deployment and testing (8h)
20. Re-run production readiness audit (target: >90/100)
