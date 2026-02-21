# Red Team Report: AIFANS

**Date**: 2026-02-16
**Attacker**: Claude Code (Adversarial Mode)
**Severity Rating**: CRITICAL

---

## Executive Summary

The AIFANS codebase contains **multiple critical security vulnerabilities** that allow complete privilege escalation from any authenticated user to admin, bypass of production environment checks via environment variables, and severe multi-tenant isolation failures through overly permissive RLS policies. The dev endpoints are exploitable in production, rate limiting is defined but never applied, and the platform has multiple paths for financial manipulation.

---

## Critical Vulnerabilities (Exploit Immediately)

### CRIT-001: Dev Endpoint Allows Privilege Escalation to Admin in Production

**Attack Vector**: POST request to `/api/dev/make-admin` with valid authentication
**Impact**: Any authenticated user can make themselves an admin, gaining access to all admin functions including creator approvals, content moderation, and potentially sensitive user data.

**Evidence**: `src/app/api/dev/make-admin/route.ts:7`
```typescript
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
  return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
}
```

**Proof of Concept**:
1. Deploy app with `ALLOW_DEV_ENDPOINTS=true` in production (common during debugging)
2. Authenticate as any user
3. `POST /api/dev/make-admin`
4. User is now admin

**Fix**: Remove ALL `/api/dev/*` endpoints from production builds. Use environment-based file exclusion in build process, not runtime checks.

---

### CRIT-002: Dev Endpoint Creates Admin Account and Returns Credentials

**Attack Vector**: POST to `/api/dev/setup-admin`
**Impact**: Creates admin account and **returns password in response** - complete credential exposure.

**Evidence**: `src/app/api/dev/setup-admin/route.ts:90-95`
```typescript
return NextResponse.json({
  success: true,
  message: 'Admin account ready',
  credentials: {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  },
  userId,
});
```

**Proof of Concept**:
1. If `ALLOW_DEV_ENDPOINTS=true` in production
2. `POST /api/dev/setup-admin`
3. Response contains admin email and password in plain text

**Fix**: Never return credentials in API responses. Remove endpoint entirely from production.

---

### CRIT-003: Dev Endpoint Allows Self-Verification as Creator Without Approval

**Attack Vector**: POST to `/api/dev/verify-creator`
**Impact**: Any user can bypass creator approval process and become a verified creator.

**Evidence**: `src/app/api/dev/verify-creator/route.ts:24-31`
```typescript
// Create creator profile if doesn't exist
const { data: created, error: createError } = await supabase
  .from('creator_profiles')
  .insert({
    user_id: user.id,
    is_verified: true,
  })
```

**Note**: This endpoint has NO `NODE_ENV` check at all - it works in ALL environments!

**Fix**: Add proper environment checks or remove entirely.

---

### CRIT-004: RLS Policies with USING(true) Allow Cross-Tenant Data Access

**Attack Vector**: Direct database queries via Supabase client
**Impact**: Users can read/write data belonging to other users in multiple tables.

**Evidence**: Multiple migration files contain `FOR ALL USING (true)`:
- `database/migrations/005_memory_tables.sql:79,87` - Service can manage ALL user memory
- `database/migrations/006_creator_and_ppv_tables.sql:410`
- `database/migrations/011_chat_messages_table.sql:40` - ALL chat messages readable
- `database/migrations/012_content_moderation.sql:276,289,298,302`
- `database/schema.sql:561` - Profiles viewable by everyone

**Critical Tables Exposed**:
- `user_memory` - Any user's stored facts/preferences
- `conversation_summaries` - Any user's chat summaries
- `chat_messages` - Any user's chat history
- Content moderation queues

**Proof of Concept**:
```javascript
// Any authenticated user can read all user memories
const { data } = await supabase.from('user_memory').select('*')
// Returns ALL users' stored personal information
```

**Fix**: Replace `USING (true)` with proper tenant isolation: `USING (subscriber_id = auth.uid() OR creator_id = auth.uid())`

---

### CRIT-005: Cron Endpoint Accessible Without Secret When CRON_SECRET Not Set

**Attack Vector**: GET/POST to `/api/cron/moderation`
**Impact**: Anyone can trigger moderation queue processing, potentially causing denial of service or racing conditions.

**Evidence**: `src/app/api/cron/moderation/route.ts:12-18`
```typescript
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
```

If `CRON_SECRET` is not set (undefined/falsy), the check passes for ALL requests.

**Fix**: Change to `if (!CRON_SECRET || authHeader !== ...)` and make CRON_SECRET required.

---

## High Severity (Exploit with Effort)

### HIGH-001: Rate Limiting Defined But Never Applied

**Attack Vector**: Flood any API endpoint
**Impact**: API abuse, database exhaustion, LLM API budget drain, denial of service.

**Evidence**:
- `src/lib/rate-limit.ts` defines rate limiters: `authRateLimit`, `chatRateLimit`, `uploadRateLimit`, `apiRateLimit`, `adminRateLimit`
- Grep for `import.*rate-limit|checkRateLimit` in `src/app/api/` returns **no matches**

**Result**: Rate limiting code exists but is never imported or used in any API route.

**Proof of Concept**:
```bash
# Unlimited LLM API calls
for i in {1..10000}; do
  curl -X POST /api/chat/[creatorId] -d '{"message":"test"}'
done
```

**Fix**: Import and apply rate limiting to all critical endpoints, especially:
- `/api/chat/*` (LLM costs)
- `/api/ai-chat/*` (LLM costs)
- `/api/auth/*` (auth bruteforce)
- `/api/upload` (storage abuse)

---

### HIGH-002: No File Size Validation on Upload

**Attack Vector**: Upload massive files
**Impact**: Storage exhaustion, denial of service, cost amplification.

**Evidence**: `src/app/api/upload/route.ts:17-38`
```typescript
const body = await request.json()
const { filename, type, postId } = body
// ...
// Validate file type
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
```

Only MIME type is validated. No max file size check. Presigned URLs are generated without size limits.

**Fix**: Add file size validation and pass size limits to presigned URL generation.

---

### HIGH-003: Stripe Webhook Handler Trusts Metadata Without Validation

**Attack Vector**: Manipulated Stripe checkout session metadata
**Impact**: Potential to credit wrong user, wrong creator, or wrong amount.

**Evidence**: `src/app/api/webhooks/stripe/route.ts:107-113`
```typescript
async function createSubscription(session: any) {
  const { user_id, creator_id, tier_id, billing_period, subscription_type = 'content' } = session.metadata || {};
  // user_id and creator_id are used directly without validation
```

While Stripe signature is verified, if an attacker controls the checkout creation, they could inject malicious metadata.

**Fix**: Validate all metadata values against database records before processing.

---

### HIGH-004: Race Condition in Token Wallet Updates

**Attack Vector**: Concurrent purchase requests
**Impact**: Double-spending, negative balance, credit tokens twice.

**Evidence**: `src/app/api/webhooks/stripe/route.ts:435-489`
```typescript
const { data: existingWallet } = await supabase
  .from('token_wallets')
  .select('id')
  .eq('user_id', user_id)
  .maybeSingle();

if (existingWallet) {
  // Try atomic RPC, falls back to non-atomic update
  // ...
  if (updateError && updateError.message.includes('function')) {
    // Fallback to regular update (less safe but functional)
    const { data: wallet } = await supabase...
    await supabase.update({
      balance_tokens: wallet.balance_tokens + tokenAmount,
```

The fallback path reads balance, adds tokens, then updates - classic TOCTOU race.

**Fix**: Use database transactions or atomic operations (`UPDATE ... SET balance = balance + X`).

---

### HIGH-005: Service Role Key Exposed in Multiple Frontend-Adjacent Files

**Attack Vector**: Build artifact analysis, environment variable leakage
**Impact**: Full database access bypassing all RLS.

**Evidence**: Multiple files reference `process.env.SUPABASE_SERVICE_ROLE_KEY`:
- `src/app/api/chat/[creatorId]/route.ts:348,894`
- `src/app/api/ai-chat/v2/route.ts:88`
- `src/lib/feature-flags/index.ts:15`
- `src/lib/moderation/moderation-service.ts:24`

**Risk**: If any of these are bundled client-side or exposed via error messages.

**Fix**: Audit all service role usage. Use edge functions or server-only modules.

---

## Medium Severity (Requires Conditions)

### MED-001: SQL Injection via Dynamic Query Building

**Attack Vector**: Malicious user ID in conversation lookup
**Impact**: Potential SQL injection.

**Evidence**: `src/app/api/ai-chat/route.ts:104-108`
```typescript
const { data: conversation } = await supabase
  .from('conversations')
  .select('id')
  .or(
    `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
    `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
  )
```

User IDs are interpolated directly into query string. While Supabase likely handles this, it's a dangerous pattern.

**Fix**: Use parameterized queries or Supabase's built-in filter methods.

---

### MED-002: No Validation on Chat Message Length Beyond 2000 Characters

**Attack Vector**: Send very long messages
**Impact**: LLM context window exhaustion, increased API costs.

**Evidence**: `src/app/api/chat/[creatorId]/route.ts:66`
```typescript
if (!message || typeof message !== 'string' || message.length > 2000) {
  return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
}
```

2000 characters per message, but conversation history can have 40 messages (line 405-410), totaling 80,000+ characters.

**Fix**: Implement token counting for conversation context, not just character limits.

---

### MED-003: Tip Self-Check Only at API Level, Not Database Level

**Attack Vector**: Direct database manipulation or API race
**Impact**: Users could potentially tip themselves.

**Evidence**: `src/app/api/tips/route.ts:34-36`
```typescript
// Prevent self-tipping
if (creator_id === user.id) {
  return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
}
```

Check is in API route, not enforced by database constraint.

**Fix**: Add database CHECK constraint: `CONSTRAINT no_self_tip CHECK (user_id != creator_id)`

---

### MED-004: Verbose Error Messages Expose Internal Details

**Attack Vector**: Trigger errors
**Impact**: Information disclosure.

**Evidence**: Multiple routes return `error.message` directly:
- `src/app/api/dev/make-admin/route.ts:59`: `return NextResponse.json({ error: error.message }, { status: 500 })`
- `src/app/api/subscriptions/route.ts:64`: `return NextResponse.json({ error: error.message }, { status: 500 })`

**Fix**: Log detailed errors server-side, return generic messages to clients.

---

### MED-005: PPV Unlock Non-Atomic with Refund Vulnerability

**Attack Vector**: Fail after token deduction, exploit partial refund
**Impact**: Get content without paying.

**Evidence**: `src/app/api/posts/[id]/unlock/route.ts:66-112`
```typescript
// Deduct tokens from wallet
const { error: walletError } = await supabase.from('token_wallets').update(...)

// Later...
const { error: purchaseError } = await supabase.from('post_purchases').insert(...)

if (purchaseError) {
  // Refund the tokens if purchase record fails
  await supabase.from('token_wallets').update(...)
```

Non-atomic: tokens deducted, purchase might fail, refund might fail.

**Fix**: Use database transaction or stored procedure for atomic operation.

---

### MED-006: Creator Content Accessible via Model ID Confusion

**Attack Vector**: Subscribe to model, access content from different model owned by same creator
**Impact**: Cross-model content access.

**Evidence**: `src/app/api/subscriptions/route.ts:100-115` - Complex model ID vs creator ID resolution could be exploited.

**Fix**: Ensure content access checks model-specific subscriptions, not just creator-level.

---

## Low Severity / Informational

### LOW-001: AI System Prompt Partially Extractable

**Attack Vector**: Ask AI to repeat instructions
**Impact**: Competitors can see prompt engineering techniques.

**Evidence**: `src/lib/compliance/constants.ts` - Full system prompt visible in source code and potentially extractable via prompt injection.

**Fix**: Consider server-side prompt injection, obfuscation for production.

---

### LOW-002: Debug Logging in Production

**Attack Vector**: Log file analysis
**Impact**: Information disclosure.

**Evidence**: `src/app/api/chat/[creatorId]/route.ts:312-316`
```typescript
console.log('===PERSONALITY DATA LOADED ===');
console.log('Personality ID:', personality?.id);
console.log('Full personality:', JSON.stringify(personality, null, 2));
```

Extensive debug logging that would leak to Vercel logs.

**Fix**: Conditionally log based on `NODE_ENV`.

---

### LOW-003: Mock Payment Mode Flag Visible in Response

**Attack Vector**: API response analysis
**Impact**: Indicates development mode to attackers.

**Evidence**: `src/app/api/ai-chat/[creatorId]/route.ts:231`
```typescript
return NextResponse.json({
  message: aiMessage,
  mock_notice: 'DEV MODE: No credits deducted'
});
```

**Fix**: Remove mock notices from production responses.

---

### LOW-004: .env.local File Tracked (If Committed)

**Attack Vector**: Git history analysis
**Impact**: Credential exposure.

**Evidence**: `.env.local` exists in repo root. Should be in `.gitignore`.

**Fix**: Ensure `.env.local` and all `.env*` files (except `.env.example`) are gitignored.

---

### LOW-005: Hardcoded Fallback URL

**Attack Vector**: URL manipulation
**Impact**: Redirect to attacker-controlled domain.

**Evidence**: `src/app/api/subscriptions/route.ts:20`
```typescript
return 'https://www.joinlyra.com';
```

**Fix**: Require explicit APP_URL configuration, fail if not set.

---

### LOW-006: Feature Flags Publicly Readable

**Attack Vector**: Query feature_flags table
**Impact**: Discover unreleased features.

**Evidence**: `database/migrations/019_feature_flags.sql:22`
```sql
FOR SELECT USING (true);
```

**Fix**: Consider if feature flags should be public or restrict to authenticated users.

---

## Attack Paths (Complete Chains)

### Attack Path 1: Fan to Admin (Critical)
1. Create account as fan
2. POST `/api/dev/make-admin` (if ALLOW_DEV_ENDPOINTS set)
3. Now admin - access `/api/admin/*` endpoints
4. Approve own creator account
5. Manipulate transactions, moderate content, access user data

### Attack Path 2: Free Content via RLS Bypass
1. Authenticate as any user
2. Query `chat_messages` table with USING(true) policy
3. Read all users' chat histories
4. Access memory data, conversation summaries

### Attack Path 3: LLM Budget Exhaustion
1. Create account
2. No rate limiting on chat endpoints
3. Send thousands of messages
4. Drain Anthropic API budget
5. DoS platform for all users

### Attack Path 4: Double-Spend Tokens
1. Have token balance
2. Initiate two simultaneous PPV purchases
3. Race condition in wallet update
4. Potentially get both items for price of one

---

## Recommendations (Priority Order)

1. **IMMEDIATE**: Remove or properly secure ALL `/api/dev/*` endpoints
2. **IMMEDIATE**: Fix RLS policies - replace all `USING (true)` with proper tenant checks
3. **IMMEDIATE**: Make CRON_SECRET required, fail if not set
4. **HIGH**: Implement rate limiting on all critical endpoints
5. **HIGH**: Add file size limits to upload endpoint
6. **HIGH**: Make wallet operations atomic (database transactions)
7. **HIGH**: Audit all service role key usage
8. **MEDIUM**: Add database constraints for business rules (no self-tip, etc.)
9. **MEDIUM**: Sanitize error messages for production
10. **MEDIUM**: Use parameterized queries everywhere
11. **LOW**: Remove debug logging from production
12. **LOW**: Implement proper feature flag visibility controls

---

## What's Actually Secure

- **Stripe webhook signature verification**: Properly implemented using `stripe.webhooks.constructEvent`
- **Authentication flow**: Supabase auth properly used with `getUser()` checks
- **Content type validation on uploads**: MIME type allowlist exists
- **AI compliance prompts**: Comprehensive content moderation prompts defined
- **Self-tip prevention**: API-level check exists (needs DB constraint too)
- **Subscription duplicate prevention**: Proper existing subscription checks
- **Idempotency on token purchase**: Webhook handler checks for already-processed purchases
- **Conversation participant verification**: Messages API verifies user is participant
- **Creator ownership checks**: Post updates/deletes verify creator_id matches user

---

## Appendix: Files Requiring Immediate Review

| File | Issue |
|------|-------|
| `src/app/api/dev/make-admin/route.ts` | Privilege escalation |
| `src/app/api/dev/setup-admin/route.ts` | Credential exposure |
| `src/app/api/dev/verify-creator/route.ts` | No env check |
| `database/migrations/005_memory_tables.sql` | USING(true) |
| `database/migrations/011_chat_messages_table.sql` | USING(true) |
| `src/app/api/cron/moderation/route.ts` | Auth bypass |
| `src/app/api/chat/[creatorId]/route.ts` | No rate limit, debug logs |
| `src/app/api/webhooks/stripe/route.ts` | Race condition |
| `src/app/api/upload/route.ts` | No size limit |

---

*Report generated by Claude Code Red Team Analysis*
