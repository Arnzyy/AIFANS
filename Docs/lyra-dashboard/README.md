# LYRA Dashboard - Hybrid Creator/Fan Platform

A complete Next.js dashboard for LYRA featuring a hybrid layout that supports both fan and creator modes (like OnlyFans).

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
│   │   ├── ai-chat/page.tsx         # AI SETTINGS (with physical traits!)
│   │   ├── earnings/page.tsx        # Earnings & payouts
│   │   └── settings/page.tsx        # Profile, Tiers, Payout settings
│   └── (fan)/                        # FAN PAGES
│       ├── layout.tsx               # Fan wrapper
│       ├── browse/page.tsx          # Discover creators
│       ├── subscriptions/page.tsx   # My subscriptions
│       ├── wallet/page.tsx          # Payment methods
│       └── notifications/page.tsx   # Activity feed
├── components/
│   └── layout/
│       └── DashboardLayout.tsx      # Hybrid nav + mode switcher
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🎨 Features

### Hybrid Dashboard (Like OnlyFans)
- **Fan Mode**: Browse, Subscriptions, Messages, Wallet, Notifications
- **Creator Mode**: Overview, Posts, Subscribers, Messages, AI Chat, Earnings, Settings
- Mode switcher in sidebar (only shows for verified creators)
- "Become a Creator" flow for fan-only users

### AI Chat Settings
Full configuration page including:
- Enable/disable toggle
- Persona identity (name, age, backstory)
- Personality traits (selectable chips)
- Interests & preferences
- Turn ons/offs
- Allowed themes (Vanilla, Light BDSM, Roleplay, etc.)
- Hard boundaries (text area)
- **Physical & Style Traits** (NEW!)
  - Body: Height, body type, dress size, shoe size, breast size
  - Features: Hair colour, eye colour
  - Fashion aesthetic (selectable)
  - Favourite outfits (multi-select)
  - Lingerie styles & colours (multi-select)
  - Live preview of how AI will respond
- Response style (length, emoji usage)
- Pricing (included in sub or per-message)

### Creator Dashboard
- Overview with stats
- Posts with PPV and scheduling
- Subscribers with filters
- Messages inbox
- Earnings breakdown with transaction history
- Settings (Profile, Tiers, Payout)

### Fan Pages
- Browse/discover creators
- My subscriptions (active/expiring/expired)
- Wallet (payment methods, balance)
- Notifications

## 🔧 Customization

### To test fan-only mode:
Edit `app/(fan)/layout.tsx`:
```tsx
const MOCK_USER = {
  ...
  isVerifiedCreator: false, // Change to false
};
```

### To add real auth:
Replace `MOCK_USER` in both layout files with actual auth data from your auth provider.

### To connect to Supabase:
1. Add `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`
2. Create client in `lib/supabase.ts`
3. Replace mock data with real queries

## 🎯 Key Components

### DashboardLayout
The main layout component that handles:
- Hybrid navigation (fan vs creator)
- Mode switching
- User menu
- "Become a Creator" modal

### AI Chat Settings Page
Located at `app/dashboard/ai-chat/page.tsx`
- All AI personality configuration
- **Physical traits section** - fully integrated
- Collapsible sections for clean UX
- Preview panel showing sample AI responses

## 🚀 Next Steps for Claude Code

1. **Connect to Supabase**
   - Replace mock data with real queries
   - Add auth protection to routes

2. **Add API routes**
   - `app/api/ai-chat/route.ts` - Save AI settings
   - `app/api/posts/route.ts` - CRUD for posts
   - `app/api/subscriptions/route.ts` - Handle subscriptions

3. **Integrate payments**
   - Stripe for subscriptions
   - Wallet top-up flow

4. **Add real-time**
   - Supabase realtime for messages
   - Notification updates

## 📝 Notes

- Uses Lucide React for icons
- All forms are client components ('use client')
- Dark theme with purple/pink gradient accents
- Mobile responsive (sidebar collapses)
