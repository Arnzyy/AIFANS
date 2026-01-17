# LYRA SECURITY FIXES - STEP BY STEP

> **IMPORTANT**: Complete ONE fix at a time. STOP and ask for confirmation before proceeding to the next fix.
> **DO NOT** batch multiple fixes together.
> **DO NOT** proceed to the next fix without explicit "continue" from the user.

---

## FIX 1: Wallet Transactions Auth (CRITICAL)

**File**: `/api/wallet/transactions/route.ts`

**Problem**: Missing authentication - anyone can view anyone's transactions

**Fix Required**:
```typescript
// Add at the TOP of the GET function, before any other code:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Then ensure the query filters by user.id:
// .eq('user_id', user.id)
```

**Verify**:
- [ ] Auth check added at top of route
- [ ] Query filters by authenticated user's ID
- [ ] Returns 401 if not logged in

---

### ⏸️ STOP HERE

Ask the user: "Fix 1 complete. `/api/wallet/transactions` now requires auth. Should I proceed to Fix 2 (Signed URLs)?"

**Wait for explicit confirmation before continuing.**

---

## FIX 2: Signed URLs for Paid Content (CRITICAL)

**Files to find**: Search for `getPublicUrl` in the codebase

**Problem**: Using public URLs for paid content - anyone with URL can access

**Fix Required**:

Change FROM:
```typescript
const { data } = supabase.storage.from('bucket').getPublicUrl(path);
return data.publicUrl;
```

Change TO:
```typescript
const { data, error } = await supabase.storage.from('bucket').createSignedUrl(path, 3600); // 1 hour expiry
if (error) throw error;
return data.signedUrl;
```

**Important**:
- Only change URLs for PAID/PREMIUM content
- Public profile images, avatars can stay as getPublicUrl
- Signed URLs expire - 3600 seconds (1 hour) is reasonable

**Files likely affected**:
- Content serving routes
- Post/media routes
- PPV content routes

**Verify**:
- [ ] All paid content uses `createSignedUrl()`
- [ ] Free/public content (avatars, thumbnails) unchanged
- [ ] Expiry time is reasonable (1-24 hours)

---

### ⏸️ STOP HERE

Ask the user: "Fix 2 complete. Paid content now uses signed URLs. Should I proceed to Fix 3 (Remove Hardcoded Secrets)?"

**Wait for explicit confirmation before continuing.**

---

## FIX 3: Remove Hardcoded Secrets (HIGH)

**File 1**: `scripts/setup-accounts.ts`

**Problem**: Contains production credentials

**Fix**: 
- Replace hardcoded values with `process.env.VARIABLE_NAME`
- Or delete the file if it's not needed
- If keeping, add to `.gitignore`

**File 2**: Dev route with admin password

**Problem**: Hardcoded admin password

**Fix**:
- Move to environment variable: `process.env.ADMIN_PASSWORD`
- Or remove the route entirely if not needed

**File 3**: Middleware bypass token

**Problem**: Hardcoded bypass token

**Fix**:
- Move to environment variable: `process.env.BYPASS_TOKEN`
- Ensure it's only in server-side code

**Verify**:
- [ ] No hardcoded passwords/tokens in code
- [ ] All secrets use `process.env.*`
- [ ] Scripts folder added to `.gitignore` if sensitive
- [ ] Run `git grep -i "password\|secret\|token"` to double-check

---

### ⏸️ STOP HERE

Ask the user: "Fix 3 complete. Hardcoded secrets removed. 

**MANUAL ACTION REQUIRED**: 
User needs to rotate these credentials in Supabase/R2/Vercel dashboards since they were exposed in git history.

Should I proceed to Fix 4 (AI Chat Subscription Enforcement)?"

**Wait for explicit confirmation before continuing.**

---

## FIX 4: AI Chat Subscription Enforcement (HIGH)

**Files**: The 6 AI chat routes identified in audit

**Problem**: Chat routes don't verify user has active subscription

**Current Flow** (likely):
```
User sends message → API processes → Returns response
```

**Required Flow**:
```
User sends message → Check auth → Check subscription → API processes → Returns response
```

**Fix Required**:

```typescript
// After auth check, add subscription check:
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('status, current_period_end')
  .eq('user_id', user.id)
  .eq('creator_id', creatorId)
  .single();

const hasAccess = subscription && 
  ['active', 'trialing'].includes(subscription.status) &&
  new Date(subscription.current_period_end) > new Date();

if (!hasAccess) {
  return NextResponse.json({ 
    error: 'Subscription required',
    requiresSubscription: true 
  }, { status: 403 });
}
```

**Important**:
- Check the existing access control logic first - there may already be a `checkAccess` function
- Don't duplicate existing checks
- Some routes may allow limited free messages - preserve that logic

**Routes to check**:
1. `/api/chat/[creatorId]/route.ts` - main chat
2. `/api/chat/[creatorId]/tip-ack/route.ts` - tip acknowledgment  
3. `/api/ai-chat/*` routes
4. Any other chat-related routes

**Verify**:
- [ ] All chat routes check subscription OR have intentional free tier logic
- [ ] Returns 403 with clear message when no subscription
- [ ] Doesn't break existing paying users

---

### ⏸️ STOP HERE

Ask the user: "Fix 4 complete. AI chat routes now enforce subscription. Should I proceed to Fix 5 (Input Validation Review)?"

**Wait for explicit confirmation before continuing.**

---

## FIX 5: Input Validation (MEDIUM)

**Problem**: Some routes may not validate input properly

**For each POST/PUT route, ensure**:

```typescript
export async function POST(request: Request) {
  // 1. Parse body safely
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 2. Validate required fields exist
  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // 3. Validate length limits
  if (body.message.length > 5000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Now safe to process...
}
```

**Key routes to check**:
- Chat message routes (limit message length)
- Profile update routes (limit bio length)
- Any route accepting user text input

**Verify**:
- [ ] All POST routes validate input types
- [ ] String lengths are limited
- [ ] Invalid input returns 400, not 500

---

### ⏸️ STOP HERE

Ask the user: "Fix 5 complete. Input validation added. Should I proceed to Fix 6 (Error Handling Review)?"

**Wait for explicit confirmation before continuing.**

---

## FIX 6: Error Handling (MEDIUM)

**Problem**: Some errors may expose internal details

**Search for**:
```typescript
// BAD - exposes internals
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// BAD - exposes stack trace
catch (error) {
  return NextResponse.json({ error: error.stack }, { status: 500 });
}

// BAD - exposes entire error object
catch (error) {
  return NextResponse.json({ error }, { status: 500 });
}
```

**Replace with**:
```typescript
// GOOD - generic message, detailed logging
catch (error) {
  console.error('API Error:', error);
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}
```

**Verify**:
- [ ] No `error.message` sent to client
- [ ] No `error.stack` sent to client
- [ ] All errors logged server-side for debugging
- [ ] Client receives generic message

---

### ⏸️ STOP HERE

Ask the user: "Fix 6 complete. Error handling secured.

**ALL AUTOMATED FIXES COMPLETE.**

Manual tasks remaining:
1. Rotate Supabase credentials (dashboard)
2. Rotate R2 credentials (dashboard)
3. Update env vars in Vercel
4. Test all Golden Paths

Should I help with anything else?"

---

## TESTING CHECKLIST (After All Fixes)

Run these tests after completing all fixes:

### Auth Tests
```bash
# Should return 401
curl https://your-app.com/api/wallet/transactions

# Should return 401
curl https://your-app.com/api/chat/test-creator-id \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Subscription Tests
1. Log in as FREE user (no subscription)
2. Try to access chat → Should show paywall/403
3. Try to view premium content → Should be blocked

### Content URL Tests
1. Log in as PAID user
2. View premium content → Should load
3. Copy the URL
4. Log out
5. Paste URL in incognito → Should NOT load (expired/invalid signature)

### Golden Paths
- [ ] Sign up works
- [ ] Login works
- [ ] Subscribe works
- [ ] Chat works for subscribers
- [ ] Free users see paywall
- [ ] Content loads for paying users
- [ ] Content blocked for non-paying users

---

## ROLLBACK PLAN

If any fix breaks production:

1. `git revert HEAD` - undo last commit
2. `git push` - deploy revert
3. Investigate in development environment
4. Fix and re-deploy

Keep commits small (one fix per commit) so rollback is easy.
