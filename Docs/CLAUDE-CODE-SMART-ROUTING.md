# LYRA Smart Model Routing — Cost Optimization

## CONTEXT

Currently every message goes to Sonnet at ~$0.05/msg. We want to route simple messages to Haiku (~$0.005/msg) and only use Sonnet for complex/heated exchanges. Target: 70%+ messages go to Haiku, average cost drops to ~$0.02/msg.

## IMPORTANT: Apply AFTER the chat reset fix (CLAUDE-CODE-CHAT-FIX.md)

Do NOT apply this until the reset bug is fixed. This builds on top of that fix.

---

## IMPLEMENTATION

### Step 1: Add model routing function

In `src/app/api/chat/[creatorId]/route.ts`, add this function ABOVE `callAnthropicAPI`:

```typescript
// ===========================================
// SMART MODEL ROUTING
// Routes messages to cheapest capable model
// ===========================================

type ModelTier = 'haiku' | 'sonnet';

interface RoutingDecision {
  model: string;
  tier: ModelTier;
  reason: string;
}

function routeToModel(
  message: string,
  heatLevel: number,
  messageCount: number,
  recentMessages: Array<{ role: string; content: string }>
): RoutingDecision {
  
  // ===========================================
  // ALWAYS USE SONNET FOR:
  // ===========================================
  
  // 1. High heat conversations (flirty/sexual content needs nuance)
  if (heatLevel >= 6) {
    return { model: 'claude-sonnet-4-20250514', tier: 'sonnet', reason: 'high_heat' };
  }
  
  // 2. First 4 messages (first impressions matter — set the tone right)
  if (messageCount <= 4) {
    return { model: 'claude-sonnet-4-20250514', tier: 'sonnet', reason: 'early_conversation' };
  }
  
  // 3. Long/complex user messages (they put effort in, match it)
  if (message.length > 200) {
    return { model: 'claude-sonnet-4-20250514', tier: 'sonnet', reason: 'complex_message' };
  }
  
  // 4. Emotional content (needs sensitivity)
  const emotionalPatterns = [
    /i feel/i, /i('m| am) (sad|lonely|depressed|anxious|stressed|upset)/i,
    /rough (day|week|time)/i, /miss(ing)? (you|this|that)/i,
    /i love/i, /you mean/i, /special to me/i,
    /bad day/i, /frustrated/i, /worried/i,
  ];
  if (emotionalPatterns.some(p => p.test(message))) {
    return { model: 'claude-sonnet-4-20250514', tier: 'sonnet', reason: 'emotional_content' };
  }
  
  // 5. Questions about memory/past (needs good context reasoning)
  const memoryPatterns = [
    /do you remember/i, /last time/i, /you told me/i,
    /we talked about/i, /what('s| is) my/i, /my name/i,
    /did i tell you/i, /i mentioned/i,
  ];
  if (memoryPatterns.some(p => p.test(message))) {
    return { model: 'claude-sonnet-4-20250514', tier: 'sonnet', reason: 'memory_recall' };
  }
  
  // 6. Explicit content (needs careful redirection)
  const explicitPatterns = [
    /fuck/i, /cock/i, /pussy/i, /dick/i, /cum/i,
    /suck/i, /ride/i, /naked/i, /nude/i, /strip/i,
    /touch (my|your)/i, /bend/i, /spank/i, /choke/i,
  ];
  if (explicitPatterns.some(p => p.test(message))) {
    return { model: 'claude-sonnet-4-20250514', tier: 'sonnet', reason: 'explicit_handling' };
  }
  
  // 7. If last bot response had compliance issues (escalate model)
  // This is checked by the caller before routing
  
  // ===========================================
  // USE HAIKU FOR EVERYTHING ELSE:
  // ===========================================
  
  // Simple greetings, casual chat, short responses, banter
  // Examples: "hey", "what's up", "lol", "how are you", "that's cool"
  
  return { model: 'claude-3-5-haiku-20241022', tier: 'haiku', reason: 'simple_message' };
}
```

### Step 2: Modify callAnthropicAPI to accept model parameter

```typescript
// REPLACE the callAnthropicAPI function signature and model usage:

async function callAnthropicAPI(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium',
  model: string = 'claude-sonnet-4-20250514'  // NEW: accept model param
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const maxTokens = getMaxTokensForLength(responseLength);

  console.log('=== API CALL DEBUG ===');
  console.log('Model:', model);  // Log which model is being used
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
      model,  // USE the passed model
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
  console.log('Model used:', model);
  console.log('Response:', data.content[0].text.slice(0, 200));
  return data.content[0].text;
}
```

### Step 3: Use routing in generateChatResponse

In the `generateChatResponse` function, BEFORE the API call, add the routing logic:

```typescript
  // FIND THIS LINE (the API call):
  // let aiResponse = await callAnthropicAPI(fullSystemPrompt, messages, personality.response_length || 'medium');

  // REPLACE WITH:

  // Smart model routing — pick cheapest capable model
  const stateForRouting = await getConversationState(supabase, userId, creatorId);
  const currentHeat = stateForRouting?.heat_level || 0;
  const msgCount = stateForRouting?.message_count || 0;
  
  const routing = routeToModel(
    message,
    currentHeat,
    msgCount,
    (recentMessages || []).slice(-6) // Last few messages for context
  );
  
  console.log('=== MODEL ROUTING ===');
  console.log('Routed to:', routing.tier, '(' + routing.model + ')');
  console.log('Reason:', routing.reason);

  // Generate AI response with routed model
  let aiResponse: string;
  try {
    aiResponse = await callAnthropicAPI(
      fullSystemPrompt,
      messages,
      personality.response_length || 'medium',
      routing.model  // Pass the routed model
    );
  } catch (apiError) {
    console.error('API call failed:', apiError);
    return {
      response: '__API_ERROR__',
      conversationId: convId!,
      passed_compliance: false,
      compliance_issues: ['API call failed'],
    };
  }

  // Compliance check — if Haiku fails compliance, retry with Sonnet
  const complianceResult = checkCompliance(aiResponse);

  if (!complianceResult.passed) {
    console.warn('Compliance failed on', routing.tier, '- issues:', complianceResult.issues);
    
    if (routing.tier === 'haiku') {
      // Haiku failed compliance — escalate to Sonnet
      console.log('=== ESCALATING TO SONNET (compliance failure) ===');
      try {
        aiResponse = await callAnthropicAPI(
          fullSystemPrompt,
          messages,
          personality.response_length || 'medium',
          'claude-sonnet-4-20250514'  // Force Sonnet for retry
        );
        // Re-check compliance on Sonnet response
        const sonnetCompliance = checkCompliance(aiResponse);
        if (!sonnetCompliance.passed) {
          aiResponse = await regenerateCompliant(
            fullSystemPrompt,
            messages,
            personality.response_length || 'medium'
          );
        }
      } catch (escalateError) {
        console.error('Sonnet escalation also failed:', escalateError);
        return {
          response: '__API_ERROR__',
          conversationId: convId!,
          passed_compliance: false,
          compliance_issues: ['Escalation failed'],
        };
      }
    } else {
      // Sonnet failed compliance — use regenerateCompliant
      try {
        aiResponse = await regenerateCompliant(
          fullSystemPrompt,
          messages,
          personality.response_length || 'medium'
        );
      } catch (regenError) {
        console.error('Regeneration failed:', regenError);
        return {
          response: '__API_ERROR__',
          conversationId: convId!,
          passed_compliance: false,
          compliance_issues: ['Regeneration failed'],
        };
      }
    }
  }
```

### Step 4: Update regenerateCompliant to also accept model param

```typescript
async function regenerateCompliant(
  systemPrompt: string,
  messages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  // Compliance regeneration ALWAYS uses Sonnet (needs maximum instruction following)
  const stricterPrompt = systemPrompt + `\n\n⚠️ YOUR PREVIOUS RESPONSE WAS REJECTED...`; // keep existing stricter prompt
  
  return await callAnthropicAPI(stricterPrompt, messages, responseLength, 'claude-sonnet-4-20250514');
}
```

---

## COST PROJECTION

Assuming 70% of messages route to Haiku, 30% to Sonnet (with 40 msg history limit):

| Model | % Traffic | Cost/msg | Weighted |
|-------|-----------|----------|----------|
| Haiku | 70% | $0.005 | $0.0035 |
| Sonnet | 30% | $0.05 | $0.015 |
| **Blended average** | | | **~$0.02/msg** |

At $0.10 charge per message: **80% gross margin**

Occasional Haiku → Sonnet escalations (maybe 5% of Haiku calls) add negligible cost.

---

## MONITORING

After deployment, check Vercel logs for the routing distribution:

```bash
# Search logs for routing decisions
grep "MODEL ROUTING" [logs]
```

Expected distribution:
- "simple_message" (haiku): ~60-70%
- "high_heat" (sonnet): ~10-15%
- "early_conversation" (sonnet): ~5%
- "explicit_handling" (sonnet): ~5-10%
- "emotional_content" (sonnet): ~5%
- "complex_message" (sonnet): ~3-5%
- "memory_recall" (sonnet): ~2-3%

If Haiku escalations (compliance failures) exceed 15%, the v2 prompt may need tightening for Haiku specifically.

---

## IMPORTANT NOTES

- Apply the chat reset fix FIRST (CLAUDE-CODE-CHAT-FIX.md) before this
- Do NOT modify the master prompt or personality builder
- Do NOT change the conversation state or memory systems
- The routing function can be tuned over time based on real usage data
- Monitor Haiku compliance failure rate — if too high, adjust thresholds
