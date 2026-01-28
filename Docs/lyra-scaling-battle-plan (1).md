# LYRA SCALING BATTLE PLAN
## From 5K to 100K Users in 5 Days

---

> **Current safe capacity:** ~5,000 users  
> **Risk at 100K without fixes:** 15-20% payment loss, 50% API timeout rate  
> **Time to production-ready:** 5 focused days with Claude Code

---

## DAY 1: Payment Atomicity

| Priority | Time | File | Risk Level |
|----------|------|------|------------|
| **CRITICAL** | 2-3 hours | `webhooks/stripe/route.ts` | Revenue Loss |

**The Problem:** Subscription and transaction inserts are separate operations. If the database fails after Stripe confirms payment, revenue disappears with no rollback mechanism.

### Morning Session: Fix Payment Atomicity

#### CLAUDE CODE PROMPT #1
```
Audit the payment flow in webhooks/stripe/route.ts. Show me exactly what 
happens when a checkout.session.completed webhook fires. Map out every 
database operation and identify where a partial failure could occur.
```

#### CLAUDE CODE PROMPT #2
```
In webhooks/stripe/route.ts, refactor the checkout.session.completed handler 
to use a Supabase transaction. All inserts (subscription, transaction, user 
updates) must succeed together or roll back together.

Requirements:
- Use supabase.rpc() with a PostgreSQL function for true atomicity
- If any insert fails, everything rolls back
- Log the transaction ID for debugging
- Return appropriate error responses

Show me the before/after and create the necessary RPC function.
```

### Afternoon Session: Webhook Idempotency & Retry Queue

#### CLAUDE CODE PROMPT #3
```
Add webhook idempotency to webhooks/stripe/route.ts using the webhook_events 
table I've already created.

Before processing any webhook:
1. Check if event_id exists in webhook_events
2. If exists and completed, return 200 immediately
3. If exists and processing, return 200 (let the other process finish)
4. If not exists, insert as 'processing' then handle the event
5. On success, update to 'completed'
6. On failure, update to 'failed' with error_message

This prevents duplicate subscriptions on payment retries.
```

#### CLAUDE CODE PROMPT #4
```
Create a webhook retry system:

1. Create a new API route: /api/admin/retry-webhooks
2. Query webhook_events where status = 'failed' and attempts < 3
3. For each failed event, re-process using the stored payload
4. Increment attempts counter
5. Update status based on result

Also create a simple admin page to view failed webhooks and trigger retries.
```

### End of Day 1 Checklist
- [ ] Payment operations wrapped in transaction
- [ ] Webhook idempotency implemented
- [ ] Retry queue functional
- [ ] Manual test: simulate failed DB after Stripe success

---

## DAY 2: Kill V1 Chat

| Priority | Time | Files | Impact |
|----------|------|-------|--------|
| **CRITICAL** | 4-6 hours | `chat/[creatorId]/route.ts`, `chat-service.ts` | 50% Less Complexity |

**The Problem:** V1 and V2 chat systems running simultaneously via feature flag. Different compliance checks, error handling, and logging between versions makes debugging at scale impossible.

### Morning Session: Audit & Plan

#### CLAUDE CODE PROMPT #5
```
Map out the V1 vs V2 chat implementation:

1. Find the feature flag that controls V1/V2
2. List all code paths that are V1-only
3. List all files that would be deleted if V1 is removed
4. Identify any V1 features NOT in V2 (if any)
5. Check if any users/creators are still on V1

I need to know if this is a clean deletion or if V1 has 
functionality that needs migrating first.
```

### Afternoon Session: Execute Removal

#### CLAUDE CODE PROMPT #6
```
Remove the V1 chat implementation entirely.

1. Delete the feature flag and all conditional checks
2. Delete chat-service.ts (V1 service file)
3. Remove all V1-specific code paths in chat/[creatorId]/route.ts
4. Remove any V1-specific utility functions
5. Update any imports that referenced deleted files
6. Run TypeScript compiler to catch any broken references

Make V2 the only code path. No fallbacks, no conditionals.
```

#### CLAUDE CODE PROMPT #7
```
After removing V1, audit the remaining V2 chat code:

1. Are there any orphaned functions that were only called by V1?
2. Are there any config options that only applied to V1?
3. Is there dead code in the database schema related to V1?
4. Clean up any V1 references in comments or documentation.
```

### End of Day 2 Checklist
- [ ] Feature flag removed
- [ ] chat-service.ts deleted
- [ ] All V1 code paths removed
- [ ] TypeScript compiles clean
- [ ] Manual test: send messages, verify compliance checks work

---

## DAY 3: Query Optimization

| Priority | Time | Files | Impact |
|----------|------|-------|--------|
| **HIGH** | Full day | `chat-access.ts` + new cache | 66% Fewer Queries |

**The Problem:** `checkChatAccess` makes 3+ separate DB queries per message. At 1M daily messages = 3M unnecessary queries. Creator config is fetched repeatedly with no caching.

### Morning Session: Batch Chat Access Queries

#### CLAUDE CODE PROMPT #8
```
Analyze the checkChatAccess function in chat-access.ts:

1. List every database query it makes
2. Show me the data dependencies between queries
3. Which queries could be combined into a single query?
4. Which queries could be parallelized?

I need to understand the full picture before optimizing.
```

#### CLAUDE CODE PROMPT #9
```
Refactor checkChatAccess in chat-access.ts to minimize database queries.

Current: 3+ separate queries per call
Target: 1 query that gets all needed data

Options to consider:
1. Create a Supabase RPC function that returns all needed data in one call
2. Use a single query with joins
3. If some data is truly independent, parallelize with Promise.all

Maintain the same return type and error handling. Show before/after 
with query count comparison.
```

### Afternoon Session: Add Creator Config Cache

#### CLAUDE CODE PROMPT #10
```
Create a caching layer for creator configuration:

1. Create a new file: lib/cache/creator-cache.ts
2. Implement in-memory cache with TTL (5 minute default)
3. Cache creator model settings, pricing, and feature flags
4. Provide cache invalidation method for when creator updates settings

The cache should:
- Be a simple Map with timestamp tracking
- Auto-expire stale entries
- Have a getOrFetch pattern that queries DB only on miss
- Log cache hit/miss ratio for monitoring
```

#### CLAUDE CODE PROMPT #11
```
Integrate the creator cache into the codebase:

1. Find all places where creator config/model/pricing is fetched
2. Replace direct DB calls with cache.getOrFetch()
3. Add cache invalidation calls in creator settings update endpoints
4. Ensure cache is cleared on server restart

List every file modified and the change made.
```

### End of Day 3 Checklist
- [ ] checkChatAccess reduced to 1 query
- [ ] Creator cache implemented
- [ ] Cache invalidation working
- [ ] Manual test: send 10 messages, verify query count in logs

---

## DAY 4: Error Handling Cleanup

| Priority | Time | Scope | Impact |
|----------|------|-------|--------|
| **HIGH** | Full day | 145 instances across 49 files | Eliminate 500 Errors |

**The Problem:** 145 instances of `.single()` without error handling. One bad record = cascading 500 errors. Also: async fire-and-forget operations fail silently, losing data at scale.

### Morning Session: Fix .single() Calls

#### CLAUDE CODE PROMPT #12
```
Find all instances of .single() in the codebase. For each one, categorize:

1. CRITICAL: In payment/subscription flows - fix first
2. HIGH: In chat/messaging flows - fix second  
3. MEDIUM: In user-facing API routes - fix third
4. LOW: In admin/background tasks - fix last

List them by category with file paths.
```

#### CLAUDE CODE PROMPT #13
```
Create a utility function for safe .single() queries:

// lib/db/safe-single.ts
// Should handle: 0 rows (return null or throw based on config)
// Should handle: 2+ rows (always throw - data integrity issue)
// Should log anomalies for monitoring
// Should include context about what query failed

Then show me how to use it to replace a .single() call.
```

#### CLAUDE CODE PROMPT #14
```
Fix all CRITICAL and HIGH .single() instances identified earlier.

For each fix:
1. Replace .single() with the safe utility
2. Add appropriate error handling for the null case
3. Ensure the API returns a proper error response, not a 500

Work through the files one at a time. After each file, confirm 
it compiles and the change is complete before moving to the next.
```

### Afternoon Session: Fix Silent Failures

#### CLAUDE CODE PROMPT #15
```
Find all async fire-and-forget operations in the codebase. 
These are calls like:

- someAsyncFunction() // no await, no .catch()
- Promise.resolve().then(() => doSomething()) // fire and forget
- setTimeout/setImmediate with async work

List each one with:
- File and line
- What data could be lost if it fails
- Severity (data loss vs just missing analytics)
```

#### CLAUDE CODE PROMPT #16
```
Fix the fire-and-forget operations:

For data-critical operations (memory extraction, transaction logging):
- Add proper error handling with retry logic
- Log failures to a dedicated table for manual review

For non-critical operations (analytics, optional notifications):
- Add .catch() with error logging
- Don't let failures propagate

Show me the changes for the chat/[creatorId]/route.ts:377-394 
fire-and-forget operations specifically.
```

### End of Day 4 Checklist
- [ ] Safe single utility created
- [ ] CRITICAL .single() calls fixed
- [ ] HIGH .single() calls fixed
- [ ] Fire-and-forget operations have error handling
- [ ] Manual test: query for non-existent record, verify graceful handling

---

## DAY 5: Cleanup & Race Conditions

| Priority | Time | Scope | Impact |
|----------|------|-------|--------|
| **MEDIUM** | Half day + testing | Database triggers + logs | Production Ready |

**The Problem:** Denormalized subscriber counts have race conditions on concurrent inserts. 240 console.logs will exhaust log storage. Final polish before scaling.

### Morning Session: Fix Race Conditions & Cleanup

#### CLAUDE CODE PROMPT #17
```
Find the database trigger that updates subscriber counts. 
Show me the current implementation and explain why it has 
a race condition with concurrent subscription inserts.

Then provide a fixed version using one of:
- SELECT FOR UPDATE (row locking)
- Atomic increment (UPDATE ... SET count = count + 1)
- Advisory locks

Recommend the best approach for Supabase/PostgreSQL.
```

#### CLAUDE CODE PROMPT #18
```
Remove all console.log statements from production code.

1. Find all 240 console.log instances
2. For each one, decide: 
   - DELETE: Debug/dev logging that shouldn't be in prod
   - REPLACE: Important info that should use proper logger
3. Create a simple logger utility if one doesn't exist
4. Replace important logs with the proper logger

Work through systematically. I want zero console.logs in production.
```

#### CLAUDE CODE PROMPT #19
```
Final cleanup sweep:

1. Find and fix any remaining MEDIUM/LOW .single() calls
2. Check for any TODO or FIXME comments that are actually critical
3. Look for hardcoded values that should be environment variables
4. Verify all API routes have appropriate rate limiting applied

Give me a summary of what you found and fixed.
```

### Afternoon Session: Integration Testing

#### CLAUDE CODE PROMPT #20
```
Create a testing checklist script that I can run to verify all fixes:

// scripts/verify-scaling-fixes.ts

The script should check:
1. Payment atomicity: Mock a DB failure after Stripe success, verify rollback
2. Webhook idempotency: Send same event twice, verify only processed once
3. Chat flow: Send message, log query count, verify it's optimized
4. Error handling: Query non-existent records, verify graceful responses
5. Cache: Fetch creator config twice, verify second is cached

Output a pass/fail report for each check.
```

### End of Day 5 Checklist
- [ ] Subscriber count race condition fixed
- [ ] All console.logs removed or replaced
- [ ] Final cleanup complete
- [ ] Verification script passing
- [ ] Deploy to staging and run full test suite

---

## POST-COMPLETION

### Before/After Comparison

| Metric | Before | After |
|--------|--------|-------|
| Safe user capacity | ~5,000 | **100,000+** |
| Payment loss risk | 15-20% | **~0%** |
| API timeout rate | 50% at scale | **<1%** |
| Queries per message | 3+ | **1** |
| Chat implementations | 2 (V1+V2) | **1 (V2 only)** |
| Unhandled .single() calls | 145 | **0** |

### Ongoing Maintenance

After completing these fixes, Lyra will be production-ready for scale. However, maintaining it requires ongoing attention:

- **Weekly:** Check webhook_events for failed payments, investigate and retry
- **Weekly:** Review error logs for new edge cases
- **Monthly:** Audit cache hit rates, adjust TTL if needed
- **Monthly:** Review slow query logs, add indexes as needed
- **Quarterly:** Run the verification script against production

---

> **Ready to scale. Ship it.**
