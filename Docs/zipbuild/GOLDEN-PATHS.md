# Golden Paths

## How To Use
These are the ONLY patterns to use. If you think you need something else, ask first.

---

## Data Fetching

### Server Component (default)
```tsx
// app/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: items } = await supabase.from('items').select('*')
  
  return <ItemList items={items} />
}
```

### Client Component with loading
```tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function ItemList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.from('items').select('*').then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])
  
  if (loading) return <Skeleton />
  return <div>{/* render items */}</div>
}
```

---

## Forms

### Server Action Pattern
```tsx
// app/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createItem(formData: FormData) {
  const supabase = await createServerClient()
  
  const { error } = await supabase.from('items').insert({
    name: formData.get('name') as string,
  })
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard')
}
```

---

## Authentication

### Protected Page
```tsx
// app/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  return <Dashboard user={user} />
}
```

### Protected API Route
```tsx
// app/api/items/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { data } = await supabase.from('items').select('*')
  return NextResponse.json(data)
}
```

---

## Database

### Query with RLS
```tsx
// RLS handles filtering automatically when using anon key
const { data } = await supabase
  .from('items')
  .select('*')
  // No .eq('user_id', userId) needed - RLS does this
```

---

## UI Components

### Basic Component Structure
```tsx
// Follow FRONTEND-DESIGN-SKILL.md for all styling decisions

import { cn } from "@/lib/utils"

interface ComponentProps {
  // props
}

export function Component({ ...props }: ComponentProps) {
  return (
    <div className={cn(
      // Base styles that match design direction
      // Use CSS variables from globals.css
      // Include motion/transitions where appropriate
    )}>
      {/* content */}
    </div>
  )
}
```

### Animation Pattern

```tsx
// Prefer CSS animations for simple effects
// Use Framer Motion for complex orchestration

// CSS approach (preferred for performance)
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

// Staggered children
<div style={{ animationDelay: `${index * 100}ms` }}>
```

---

NO OTHER PATTERNS. These are battle-tested.
