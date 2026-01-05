# LYRA AI Personality Wizard - Implementation Guide
## Complete instructions for Claude Code

This folder contains everything needed to add the AI Personality Creator wizard to LYRA.
Follow these steps in order.

---

## OVERVIEW

This adds a "Westworld-style" AI personality creator where creators can customize every aspect of their AI persona:
- Identity & appearance
- Personality traits
- Background & interests
- Romantic/flirting style
- Voice & speech patterns
- Conversation behavior
- Live preview/test chat

---

## STEP 1: RUN DATABASE SCHEMA

Run the SQL in `database-schema.sql` in your Supabase SQL Editor.

This creates the `ai_personalities` table with all the fields needed.

---

## STEP 2: ADD TYPE DEFINITIONS

Create `src/lib/ai/personality/types.ts` with the contents of `types.ts`

---

## STEP 3: ADD PERSONALITY OPTIONS

Create `src/lib/ai/personality/options.ts` with the contents of `personality-options.ts`

---

## STEP 4: ADD PROMPT BUILDER

Create `src/lib/ai/personality/prompt-builder.ts` with the contents of `prompt-builder.ts`

This converts all the wizard selections into a system prompt for Claude.

---

## STEP 5: UPDATE COMPLIANCE CONSTANTS

Replace `src/lib/compliance/constants.ts` with the contents of `compliance-constants.ts`

This includes the critical PLATFORM_SYSTEM_PROMPT that:
- Makes AI flirty but compliant
- Redirects explicit requests smoothly (without breaking character)
- Never lectures or dismisses users
- Keeps them engaged and coming back

---

## STEP 6: ADD WIZARD COMPONENTS

Create these files in `src/components/creator/ai-wizard/`:

1. `AIPersonalityWizard.tsx` - Main wizard component
2. `steps/Step1Identity.tsx` - Identity & appearance
3. `steps/Step2Personality.tsx` - Personality traits
4. `steps/Step3Background.tsx` - Background & interests
5. `steps/Step4Romantic.tsx` - Romantic style
6. `steps/Step5Voice.tsx` - Voice & speech
7. `steps/Step6Behavior.tsx` - Conversation behavior
8. `steps/Step7Preview.tsx` - Preview & test chat

---

## STEP 7: ADD API ROUTES

Create these API routes:

1. `src/app/api/creator/ai-personality/route.ts` - GET/POST/PUT for saving personality
2. `src/app/api/creator/ai-personality/test/route.ts` - Test chat endpoint

---

## STEP 8: ADD WIZARD PAGE TO DASHBOARD

Create a new page at `src/app/(creator)/dashboard/ai-personality/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AIPersonalityWizard } from '@/components/creator/ai-wizard/AIPersonalityWizard';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

export default function AIPersonalityPage() {
  const router = useRouter();
  const [existingPersonality, setExistingPersonality] = useState<AIPersonalityFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<string>('');

  useEffect(() => {
    async function loadPersonality() {
      try {
        // Get current user
        const userRes = await fetch('/api/auth/user');
        const userData = await userRes.json();
        setCreatorId(userData.id);

        // Load existing personality if any
        const res = await fetch('/api/creator/ai-personality');
        if (res.ok) {
          const data = await res.json();
          setExistingPersonality(data);
        }
      } catch (error) {
        console.error('Error loading personality:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPersonality();
  }, []);

  const handleComplete = (personality: AIPersonalityFull) => {
    // Redirect to AI chat settings or dashboard
    router.push('/dashboard/ai-chat?setup=complete');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AIPersonalityWizard
      creatorId={creatorId}
      existingPersonality={existingPersonality || undefined}
      onComplete={handleComplete}
    />
  );
}
```

---

## STEP 9: ADD NAVIGATION LINK

Add a link to the wizard in the creator dashboard sidebar:

```tsx
<Link href="/dashboard/ai-personality" className="...">
  ✨ AI Personality
</Link>
```

---

## STEP 10: UPDATE AI CHAT TO USE PERSONALITY

Update `src/app/api/ai-chat/[creatorId]/route.ts` to:

1. Fetch the creator's AI personality from database
2. Use `buildPersonalityPrompt()` to generate system prompt
3. Pass to Anthropic API

Example:

```typescript
import { buildPersonalityPrompt } from '@/lib/ai/personality/prompt-builder';

// In your POST handler:
const { data: personality } = await supabase
  .from('ai_personalities')
  .select('*')
  .eq('creator_id', creatorId)
  .single();

const systemPrompt = buildPersonalityPrompt(personality);

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    system: systemPrompt,
    messages: conversationMessages,
  }),
});
```

---

## STEP 11: ADD ENVIRONMENT VARIABLE

Make sure `ANTHROPIC_API_KEY` is set in your environment:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

---

## FILE STRUCTURE SUMMARY

After implementation:

```
src/
├── lib/
│   ├── ai/
│   │   └── personality/
│   │       ├── types.ts
│   │       ├── options.ts
│   │       └── prompt-builder.ts
│   └── compliance/
│       └── constants.ts (updated)
├── components/
│   └── creator/
│       └── ai-wizard/
│           ├── AIPersonalityWizard.tsx
│           └── steps/
│               ├── Step1Identity.tsx
│               ├── Step2Personality.tsx
│               ├── Step3Background.tsx
│               ├── Step4Romantic.tsx
│               ├── Step5Voice.tsx
│               ├── Step6Behavior.tsx
│               └── Step7Preview.tsx
└── app/
    ├── (creator)/
    │   └── dashboard/
    │       └── ai-personality/
    │           └── page.tsx
    └── api/
        └── creator/
            └── ai-personality/
                ├── route.ts
                └── test/
                    └── route.ts
```

---

## TESTING CHECKLIST

After implementation, test:

- [ ] Wizard loads correctly
- [ ] All 7 steps navigate properly
- [ ] Selections persist between steps
- [ ] Test chat works in Step 7
- [ ] Save creates record in database
- [ ] Edit mode loads existing personality
- [ ] AI chat uses personality in conversations
- [ ] Explicit redirects work smoothly (AI doesn't break character)

---

## KEY BEHAVIORS TO VERIFY

1. **AI stays in character** - Never says "I can't" or mentions guidelines
2. **Redirects are smooth** - Explicit messages get teasing redirects, not rejection
3. **Personality shows through** - Different settings create noticeably different responses
4. **Users feel engaged** - AI makes them feel wanted and special

---

## NOTES

- Uses Claude 3 Haiku for speed and cost efficiency (~$0.25/million tokens)
- Falls back to mock responses if API unavailable
- Platform system prompt always prepended (creators can't override safety rules)
- All personality data stored per-creator in Supabase
