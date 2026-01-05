# CLAUDE CODE INSTRUCTIONS

## Project: AIFans - OnlyFans Clone for AI Models

This is a Next.js 14 project using the App Router. Read this file first before making any changes.

---

## PRIORITY TASKS (In Order)

### 1. Initial Setup
```bash
npm install
cp .env.example .env.local
# Fill in Supabase credentials in .env.local
```

### 2. Set Up Supabase
- Create a new Supabase project at supabase.com
- Run the schema from `database/schema.sql` in the SQL Editor
- Copy the URL and keys to `.env.local`

### 3. Build Auth System
Create these files:
- `src/app/(auth)/login/page.tsx` - Login form with Supabase Auth
- `src/app/(auth)/register/page.tsx` - Registration with username selection
- `src/app/(auth)/layout.tsx` - Centered auth layout
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`

### 4. Build Creator Profile Pages
- `src/app/[username]/page.tsx` - Public creator profile
- `src/components/profile/ProfileHeader.tsx` - Banner, avatar, bio, subscribe button
- `src/components/profile/SubscriptionTiers.tsx` - Pricing tiers
- `src/components/profile/PostGrid.tsx` - Creator's posts

### 5. Build Feed
- `src/app/(main)/feed/page.tsx` - Subscribed creators' posts
- `src/app/(main)/explore/page.tsx` - Discover creators
- `src/components/feed/PostCard.tsx` - Individual post display
- `src/components/feed/CreatePostButton.tsx`

### 6. Build Creator Dashboard
- `src/app/(creator)/dashboard/page.tsx` - Stats overview
- `src/app/(creator)/posts/page.tsx` - Manage posts
- `src/app/(creator)/posts/new/page.tsx` - Create new post
- `src/app/(creator)/subscribers/page.tsx` - Subscriber list
- `src/app/(creator)/analytics/page.tsx` - Earnings & stats

### 7. Build Messaging
- `src/app/(main)/messages/page.tsx` - Conversation list
- `src/app/(main)/messages/[conversationId]/page.tsx` - Chat view
- `src/components/chat/MessageList.tsx`
- `src/components/chat/MessageInput.tsx`

### 8. Build AI Chat
- `src/app/(creator)/ai-chat-setup/page.tsx` - AI personality builder
- `src/components/chat/AIChatInterface.tsx` - Chat with AI
- API route: `src/app/api/ai-chat/route.ts`

---

## KEY ARCHITECTURE DECISIONS

### File Structure
- Use App Router route groups: `(auth)`, `(main)`, `(creator)`
- Keep components close to where they're used
- Shared components in `src/components/shared/`

### Data Fetching
- Use Server Components by default
- Client Components only when needed (interactivity, hooks)
- Use Supabase RLS for security

### Styling
- Tailwind CSS only (no external CSS)
- Use the color variables defined in globals.css
- Dark mode by default (black background)

### State Management
- Zustand for global client state
- React Query (SWR) for server state
- Supabase Realtime for live updates

---

## COMPONENT PATTERNS

### Server Component (default)
```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('posts').select('*');
  
  return <div>{/* render data */}</div>;
}
```

### Client Component (when needed)
```tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function InteractiveComponent() {
  const [data, setData] = useState(null);
  // ...
}
```

### API Route
```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Handle request...
  return NextResponse.json({ success: true });
}
```

---

## SHADCN/UI COMPONENTS

Install components as needed:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
```

---

## DATABASE QUERIES

### Get creator profile with subscription status
```ts
const { data: creator } = await supabase
  .from('profiles')
  .select(`
    *,
    creator_profile:creator_profiles(*),
    subscription_tiers(*),
    is_subscribed:subscriptions!inner(id)
  `)
  .eq('username', username)
  .eq('subscriptions.subscriber_id', currentUserId)
  .single();
```

### Get feed posts
```ts
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    media:post_media(*),
    creator:profiles!creator_id(
      username,
      display_name,
      avatar_url
    )
  `)
  .in('creator_id', subscribedCreatorIds)
  .eq('is_published', true)
  .order('published_at', { ascending: false });
```

---

## IMPORTANT NOTES

1. **No actual NSFW content during dev** - Use placeholder images
2. **Mock payments first** - Build UI without CCBill initially
3. **Test RLS policies** - Supabase security is critical
4. **Mobile-first** - Design for mobile, enhance for desktop
5. **Keep it simple** - Don't over-engineer MVP

---

## QUICK REFERENCE

### Colors
- Primary: Purple (`#a855f7`)
- Accent: Pink (`#ec4899`)
- Background: Black (`#000`)
- Card: `#0a0a0a`
- Border: `#333`

### Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

### Common Patterns
```tsx
// Gradient text
<span className="gradient-text">Text</span>

// Gradient button
<button className="bg-gradient-to-r from-purple-500 to-pink-500">

// Card
<div className="bg-card rounded-xl border border-border p-4">

// Blurred locked content
<div className="content-blur">Locked</div>
```

---

## WHEN YOU GET STUCK

1. Check the types in `src/types/index.ts`
2. Reference the database schema in `database/schema.sql`
3. Look at utility functions in `src/lib/utils/index.ts`
4. Check Supabase docs: https://supabase.com/docs

Good luck! 🚀
