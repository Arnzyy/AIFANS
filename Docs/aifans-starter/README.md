# AIFans - OnlyFans for AI Models

## Project Overview

A subscription-based content platform specifically designed for AI-generated NSFW content creators. Think OnlyFans, but exclusively for AI influencers/models.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Auth & Database**: Supabase (Postgres + Auth + Storage)
- **Media Storage**: Cloudflare R2 (S3-compatible, cheap)
- **AI Chat**: Self-hosted LLM (Dolphin/Mistral) or ModelsLab API
- **AI Images**: Optional - Apatero API or self-hosted Stable Diffusion
- **Payments**: CCBill (adult-friendly processor)
- **Hosting**: Vercel (dev) → DigitalOcean/Hetzner VPS (prod)

## Core Features

### 1. User System
- **Fans**: Browse, subscribe, tip, message, purchase PPV
- **Creators**: Upload content, set prices, manage subscribers, analytics
- **Admin**: Platform management, payouts, moderation

### 2. Creator Features
- Profile with bio, avatar, banner, social links
- Subscription tiers (monthly, 3-month, annual pricing)
- Post content (images, videos, text)
- Lock posts as PPV (pay-per-view)
- Mass DM to all subscribers
- Schedule posts
- Analytics dashboard (earnings, subscriber count, engagement)
- Geo-blocking by country
- Watermarking system

### 3. Fan Features
- Discover/explore creators
- Subscribe to creators
- Tip creators
- Purchase PPV content
- Save favourites
- DM creators
- Credit wallet system

### 4. AI Chat System (Premium Feature)

#### Mode 1: Creator Bolt-On
Creators can enable AI chat for their model:
- Build personality in dashboard:
  - Name, age, backstory
  - Personality traits (flirty, dominant, shy, etc.)
  - Interests, hobbies, turn-ons
  - Speaking style, emoji usage
  - Response length preferences
  - Memory (remembers user details)
- Set pricing (per-message or per-minute)
- Revenue split: 70% creator / 30% platform
- Toggle between AI and manual chat

#### Mode 2: Platform House Models
- Platform-owned AI personalities
- Chat rooms (pay per minute or credits)
- 100% revenue to platform
- Themed experiences (girlfriend, dom, etc.)

### 5. Content Management
- Image/video uploads with compression
- Content vault/archive
- Scheduled posting
- Bulk upload
- Auto-watermarking
- DMCA/takedown system

### 6. Discovery
- Categories/tags
- Search (creators, content)
- Trending creators
- New creators
- Recommended for you

### 7. Payments & Monetization
- Subscription payments (recurring)
- PPV purchases (one-time)
- Tips/donations
- AI chat credits
- Platform commission: 20% on everything
- Creator payouts (weekly/monthly)

## Database Schema

See `database/schema.sql` for full Supabase schema.

### Key Tables:
- `profiles` - User profiles (fans & creators)
- `creator_profiles` - Extended creator info
- `subscriptions` - Active subscriptions
- `subscription_tiers` - Creator pricing tiers
- `posts` - Content posts
- `post_media` - Media files for posts
- `transactions` - All financial transactions
- `messages` - DMs between users
- `ai_personalities` - AI chat configurations
- `ai_chat_sessions` - Chat history
- `credits` - User credit balances

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── explore/
│   │   ├── feed/
│   │   ├── messages/
│   │   ├── notifications/
│   │   └── layout.tsx
│   ├── (creator)/
│   │   ├── dashboard/
│   │   ├── posts/
│   │   ├── subscribers/
│   │   ├── analytics/
│   │   ├── ai-chat-setup/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── [username]/
│   │   └── page.tsx (public profile)
│   ├── api/
│   │   ├── auth/
│   │   ├── creators/
│   │   ├── posts/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── messages/
│   │   ├── ai-chat/
│   │   └── webhooks/
│   └── layout.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── auth/
│   ├── creator/
│   ├── feed/
│   ├── profile/
│   ├── chat/
│   └── shared/
├── lib/
│   ├── supabase/
│   ├── payments/
│   ├── ai/
│   └── utils/
├── hooks/
├── types/
└── styles/
```

## Environment Variables

See `.env.example` for required variables.

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase, R2, and other credentials

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

## Development Phases

### Phase 1: MVP (Week 1-2)
- [ ] Auth (Supabase)
- [ ] User profiles (fan/creator)
- [ ] Creator profile pages
- [ ] Basic post creation
- [ ] Image uploads to R2
- [ ] Subscription system (mock payments)
- [ ] Feed/explore page

### Phase 2: Payments (Week 3)
- [ ] CCBill integration
- [ ] Subscription payments
- [ ] PPV purchases
- [ ] Tips
- [ ] Creator payouts dashboard

### Phase 3: AI Chat (Week 4)
- [ ] AI personality builder
- [ ] Chat interface
- [ ] Credit system for chat
- [ ] LLM integration (ModelsLab or self-hosted)

### Phase 4: Polish (Week 5)
- [ ] Notifications
- [ ] Analytics dashboard
- [ ] Search & discovery
- [ ] Mobile responsive
- [ ] Performance optimization

### Phase 5: Launch Prep
- [ ] Migrate to VPS
- [ ] Age verification (if needed)
- [ ] Legal pages (T&Cs, Privacy)
- [ ] Content moderation tools

## Important Notes

### NSFW Hosting
- Vercel is fine for development (no actual NSFW content)
- Production must use adult-friendly hosting (DigitalOcean, Hetzner, etc.)
- Cloudflare R2 is fine for media storage

### Geo-blocking
- Block UK users to avoid Online Safety Act compliance
- Simple middleware check on IP or Cloudflare rules

### Payments
- Stripe/PayPal won't work for NSFW
- CCBill or Epoch required
- ~$1000/year card brand registration fee
- ~4-14% per transaction

### AI Content
- OpenAI/Claude/Midjourney won't generate NSFW
- Use self-hosted Stable Diffusion or NSFW-specific APIs
- For chat: Dolphin, Mistral uncensored, or ModelsLab API
