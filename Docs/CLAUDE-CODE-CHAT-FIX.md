# LYRA Chat Reset Bug — Diagnostic & Fix

## CONTEXT

The AI chatbot resets mid-conversation after ~10 messages. Users see the opening message "Hey you 💕 What's on your mind?" appear randomly during active conversations, destroying context. This is a critical production bug.

## STEP 1: DIAGNOSTIC — RUN THESE CHECKS FIRST

### 1A: Find ALL Anthropic model references
Search the entire codebase for any model string being used. We need to know if Haiku is being used anywhere as the main chat model (it may be ignoring the system prompt).

```bash
grep -rn "claude-" src/ lib/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

Report back:
- Which files reference which models
- Is `claude-3-haiku` used anywhere for main chat (not just fact extraction)?
- Is `claude-sonnet-4-20250514` the ONLY model used for `callAnthropicAPI`?

### 1B: Find ALL fallback "Hey you" messages
These are the silent killers — when the API fails, these get saved as real messages and poison the conversation history.

```bash
grep -rn "Hey you" src/ lib/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

Report back: Every file and line that returns a hardcoded fallback message.

### 1C: Check message history limit
```bash
grep -rn "\.limit(" src/app/api/chat/ --include="*.ts"
```

Report what limit is set for loading chat_messages in the POST handler.

### 1D: Check for silent error swallowing
```bash
grep -rn "return.*Hey you\|return.*What's on your mind" src/ lib/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

These are places where API errors are silently converted to fake messages.

## STEP 2: APPLY FIXES

After diagnostics, apply these fixes:

### Fix 1: Change message history limit

In `src/app/api/chat/[creatorId]/route.ts`, find the line that loads recent messages (around line 380-390):

```typescript
// FIND THIS:
.limit(200)

// CHANGE TO:
.limit(40)
```

This reduces token usage from ~30,000+ to ~6,000 tokens for history, preventing API failures from context overflow.

### Fix 2: Stop saving fallback messages to database

In `src/app/api/chat/[creatorId]/route.ts`, modify `callAnthropicAPI` to throw on failure instead of returning a fake message:

```typescript
// REPLACE the entire callAnthropicAPI function with this:

async function callAnthropicAPI(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const maxTokens = getMaxTokensForLength(responseLength);

  console.log('=== API CALL DEBUG ===');
  console.log('Model:', 'claude-sonnet-4-20250514');
  console.log('System prompt length:', systemPrompt.length);
  console.log('Messages count:', messages.length);
  console.log('Max tokens:', maxTokens);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', response.status, errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.content?.[0]?.text) {
    console.error('Anthropic API returned empty response:', JSON.stringify(data));
    throw new Error('Empty API response');
  }

  console.log('=== API RESPONSE ===');
  console.log('Response:', data.content[0].text.slice(0, 200));
  return data.content[0].text;
}
```

### Fix 3: Handle API failures gracefully in generateChatResponse

In the `generateChatResponse` function, wrap the AI response section to handle failures without saving garbage to the database:

```typescript
// FIND the section that calls the API and saves the response (around line 395-420)
// REPLACE with:

  // Generate AI response
  let aiResponse: string;
  try {
    aiResponse = await callAnthropicAPI(
      fullSystemPrompt,
      messages,
      personality.response_length || 'medium'
    );
  } catch (apiError) {
    console.error('API call failed:', apiError);
    // Return error to frontend — do NOT save a fake message to the database
    return {
      response: '__API_ERROR__',
      conversationId: convId!,
      passed_compliance: false,
      compliance_issues: ['API call failed'],
    };
  }

  // Compliance check
  const complianceResult = checkCompliance(aiResponse);

  if (!complianceResult.passed) {
    console.warn('Compliance issues:', complianceResult.issues);
    try {
      aiResponse = await regenerateCompliant(
        fullSystemPrompt,
        messages,
        personality.response_length || 'medium'
      );
    } catch (regenError) {
      console.error('Regeneration also failed:', regenError);
      return {
        response: '__API_ERROR__',
        conversationId: convId!,
        passed_compliance: false,
        compliance_issues: ['Regeneration failed'],
      };
    }
  }

  // Post-process: strip asterisks
  aiResponse = stripAsteriskActions(aiResponse);

  // ONLY save to database if we got a real response
  await supabase.from('chat_messages').insert({
    conversation_id: convId,
    creator_id: creatorId,
    subscriber_id: userId,
    role: 'assistant',
    content: aiResponse,
  });
```

### Fix 4: Handle API errors in the frontend

In the frontend chat component (`src/app/(main)/chat/[username]/page.tsx`), in the `sendMessage` function, check for the error flag:

```typescript
// FIND this section (around line 700-720):
const aiMsg: Message = {
  id: `ai-${Date.now()}`,
  content: data.response,
  // ...

// ADD this check BEFORE creating the aiMsg:
if (data.response === '__API_ERROR__') {
  // Don't show a fake message — show a retry option
  console.error('AI response failed');
  // Remove the user's optimistic message
  setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
  setNewMessage(messageContent); // Put their message back in the input
  // Optionally show a toast/alert
  alert('Message failed to send. Please try again.');
  return; // Don't add any AI message
}
```

### Fix 5: Also fix regenerateCompliant

The `regenerateCompliant` function also calls `callAnthropicAPI` which now throws on error. This is handled by the try/catch in Fix 3, but make sure `regenerateCompliant` does NOT have its own fallback return:

```typescript
// In regenerateCompliant, make sure it just calls callAnthropicAPI and returns the result
// It should NOT have any try/catch that returns a fallback message
// The error should propagate up to the caller
```

### Fix 6: Clean up poisoned messages from database

Run this in Supabase SQL Editor to find and remove all the fake opening messages that were saved:

```sql
-- First, CHECK how many poisoned messages exist:
SELECT COUNT(*) as poisoned_count 
FROM chat_messages 
WHERE role = 'assistant' 
AND content = 'Hey you 💕 What''s on your mind?';

-- If count is > 0, DELETE them:
DELETE FROM chat_messages 
WHERE role = 'assistant' 
AND content = 'Hey you 💕 What''s on your mind?';

-- Also check for the other fallback:
SELECT COUNT(*) as poisoned_count 
FROM chat_messages 
WHERE role = 'assistant' 
AND content = 'Hey you 😏';

DELETE FROM chat_messages 
WHERE role = 'assistant' 
AND content = 'Hey you 😏';
```

## STEP 3: VERIFY

After applying all fixes:

1. Check Vercel logs — API errors should now show as actual errors, not silent fallbacks
2. Test a 15+ message conversation — should not reset
3. Check database — no new "Hey you 💕" messages should appear in chat_messages
4. Test what happens when you send a message during high load — should show error to user, not a fake reset

## IMPORTANT NOTES

- Do NOT change the model from `claude-sonnet-4-20250514` unless explicitly told to
- Do NOT modify the master prompt or personality builder
- Do NOT change the conversation lookup logic (the .or() query)
- ONLY apply the fixes listed above
- The memory system handles long-term context — 40 messages is sufficient for natural conversation flow
