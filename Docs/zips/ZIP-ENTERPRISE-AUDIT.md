# ZIP-ENTERPRISE-AUDIT: LYRA Investor Readiness

> **Purpose**: Verify LYRA is enterprise-grade before investor meetings
> **Time Required**: 4-6 hours total
> **Sections**: Security Audit → GDPR → Stripe Implementation → Payment Testing

---

## HOW TO USE THIS ZIP

### Part A: Give to Claude Code (Automated)
- Sections marked 🤖 — Claude Code runs these checks
- Copy the prompt, paste to Claude Code, review results

### Part B: Manual Testing (You do in browser)
- Sections marked 👤 — Requires browser/Stripe dashboard
- Follow step-by-step instructions

---

# SECTION 1: SECURITY AUDIT 🤖

## 1.1 RLS Status Check

**Claude Code Prompt:**
```
Run a security audit on the LYRA codebase.

TASK 1: Check RLS status on all tables
Connect to Supabase and run this query, then report which tables have RLS disabled:

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

Flag any table containing user data that has rowsecurity = false.

Critical tables that MUST have RLS:
- users / profiles
- subscriptions
- conversations
- chat_messages
- posts / content
- purchases / transactions
- user_memories_v2
- ai_personalities
- creator_models

TASK 2: Review RLS policies
For each table with RLS enabled, check if policies properly restrict access:

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

Flag any policy that doesn't check auth.uid().
```

**Expected Result:**
- All user data tables show `rowsecurity = true`
- All policies include `auth.uid()` check

---

## 1.2 API Auth Check

**Claude Code Prompt:**
```
Audit all API routes in src/app/api/ for authentication.

For EVERY route file, check:
1. Does it call supabase.auth.getUser() or equivalent?
2. Does it return 401 if no user?
3. If it's a premium feature, does it check subscription status?

Search patterns to find:
- Files WITHOUT auth: routes missing "getUser" or "auth"
- Files WITHOUT 401 response

List ALL API routes and mark each as:
✅ AUTH OK - Has auth check
⚠️ AUTH MISSING - No auth check found
🔒 PREMIUM OK - Has subscription check (if applicable)
⚠️ PREMIUM MISSING - Premium feature without sub check

Focus especially on:
- /api/chat/* 
- /api/content/*
- /api/messages/*
- /api/creator/*
- /api/subscriptions/*
- /api/webhooks/* (these may intentionally skip auth)
```

---

## 1.3 Content Protection Check

**Claude Code Prompt:**
```
Check how protected content (images, videos) URLs are handled.

Search the codebase for:
1. Supabase storage URLs - are they using signed URLs or public?
2. Any direct S3/R2/storage URLs exposed to frontend
3. Content serving endpoints

Look for patterns:
- supabase.storage.from().getPublicUrl() ← RISKY for paid content
- supabase.storage.from().createSignedUrl() ← GOOD
- Any hardcoded CDN/storage URLs

Report:
- How is creator content stored?
- Are paid content URLs protected?
- Can someone guess/enumerate content URLs?
```

---

## 1.4 Input Validation Check

**Claude Code Prompt:**
```
Audit input validation across all API routes.

For each POST/PUT/PATCH route, check:
1. Is request body validated before use?
2. Are string lengths limited?
3. Are types checked?

Look for risky patterns:
❌ const { data } = await request.json(); // then used directly
❌ Missing length checks on user input
❌ SQL/NoSQL built with string concatenation

Look for good patterns:
✅ if (typeof message !== 'string') return error
✅ if (message.length > 2000) return error
✅ Zod/Yup schema validation

List each route and its validation status.
```

---

## 1.5 Error Handling Check

**Claude Code Prompt:**
```
Check error handling doesn't expose internals.

Search all catch blocks and error responses:

BAD patterns (flag these):
- catch (error) { return { error: error.message } }
- catch (error) { return { error: error.stack } }
- catch (error) { return { error } }
- Any error response containing "stack", "at ", file paths

GOOD patterns:
- catch (error) { console.error(error); return { error: 'Something went wrong' } }
- Generic error messages to client, detailed logs server-side

List any files exposing internal error details.
```

---

## 1.6 Secrets Check

**Claude Code Prompt:**
```
Check for hardcoded secrets or exposed API keys.

Search the entire codebase for:
- Hardcoded API keys (sk_live, sk_test, pk_live, etc.)
- Hardcoded passwords
- process.env.* used in client components (NEXT_PUBLIC_ is OK)
- .env files committed to git

Check .gitignore includes:
- .env
- .env.local
- .env*.local

Check no secrets in:
- Any file in /public
- Any 'use client' component accessing non-NEXT_PUBLIC_ env vars

Report any secrets found in code.
```

---

# SECTION 2: GDPR COMPLIANCE 🤖

## 2.1 Data Export Check

**Claude Code Prompt:**
```
Check if GDPR data export functionality exists.

Search for:
- /api/user/export or similar endpoint
- /api/gdpr/* routes
- Function that gathers all user data

GDPR requires users can download ALL their data:
- Profile information
- Conversations/messages
- Purchases
- Subscriptions
- Any content they've created
- Preferences/settings

Report:
- Does export endpoint exist? Where?
- Does it gather data from ALL tables?
- What format is the export? (JSON is fine)
```

---

## 2.2 Account Deletion Check

**Claude Code Prompt:**
```
Check if GDPR account deletion functionality exists.

Search for:
- /api/user/delete or similar endpoint
- Account deletion flow
- User data cleanup functions

GDPR requires users can delete their account and ALL data:
- Option 1: Hard delete everything
- Option 2: Anonymize + soft delete

Check:
- Does deletion endpoint exist?
- Does it delete/anonymize from ALL tables?
- Is there a confirmation step?
- Does it cancel active subscriptions?
- Does it revoke auth session?

Report findings and any gaps.
```

---

## 2.3 Consent Tracking Check

**Claude Code Prompt:**
```
Check if consent is properly tracked.

Search for:
- marketing_consent or similar fields
- Cookie consent banner/logic
- Terms acceptance tracking

Check the users/profiles table for:
- marketing_consent (boolean)
- marketing_consent_at (timestamp)
- terms_accepted_at (timestamp)

Report if consent fields exist and are being set on signup.
```

---

# SECTION 3: STRIPE IMPLEMENTATION 🤖 + 👤

## 3.1 Check Current Stripe Code

**Claude Code Prompt:**
```
Audit current Stripe implementation status.

Search for:
- stripe package import
- Stripe API calls
- /api/webhooks/stripe
- /api/checkout or /api/subscribe routes
- stripe.customers, stripe.subscriptions, stripe.checkout

Report:
1. Is Stripe SDK installed? (check package.json)
2. What Stripe-related routes exist?
3. Is webhook handler implemented?
4. Does webhook verify signature?
5. What subscription states are handled?
6. Are Stripe env vars defined? (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)

List what exists vs what's missing for a complete implementation.
```

---

## 3.2 Stripe Test Setup 👤

### Step 1: Create Stripe Account (if needed)
1. Go to https://dashboard.stripe.com/register
2. Create account (no business verification needed for test mode)
3. Stay in TEST MODE (toggle in top-right says "Test mode")

### Step 2: Get Test API Keys
1. Dashboard → Developers → API Keys
2. Copy `Publishable key` (pk_test_...)
3. Copy `Secret key` (sk_test_...)

### Step 3: Add to Vercel Environment Variables
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Step 4: Set up Webhook
1. Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
5. Copy "Signing secret" (whsec_...)
6. Add to Vercel: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 5: Create Test Products
1. Dashboard → Products → Add product
2. Create subscription product:
   - Name: "LYRA Premium"
   - Price: $9.99/month (or your price)
   - Billing: Recurring → Monthly
3. Copy the Price ID (price_...)
4. Repeat for other tiers if needed

---

## 3.3 Implement Stripe (If Missing) 🤖

**If Section 3.1 shows gaps, give this to Claude Code:**

```
Implement complete Stripe payment system for LYRA.

REQUIREMENTS:

1. CHECKOUT SESSION ENDPOINT
Create /api/checkout/route.ts:
- Accept: priceId, creatorId (who they're subscribing to)
- Create Stripe checkout session
- Include metadata: userId, creatorId
- Redirect URLs for success/cancel
- Return session URL

2. WEBHOOK HANDLER
Create/update /api/webhooks/stripe/route.ts:
- Verify signature using STRIPE_WEBHOOK_SECRET
- Handle events:
  - checkout.session.completed → Create subscription in DB
  - customer.subscription.updated → Update status in DB
  - customer.subscription.deleted → Mark cancelled in DB
  - invoice.paid → Confirm renewal
  - invoice.payment_failed → Mark past_due

3. SUBSCRIPTION TABLE
Ensure subscriptions table has:
- id, user_id, creator_id
- stripe_customer_id, stripe_subscription_id
- status (active, cancelled, past_due, etc.)
- current_period_start, current_period_end
- price_id, plan_name
- created_at, updated_at

4. CUSTOMER PORTAL
Create /api/billing/portal/route.ts:
- Creates Stripe billing portal session
- User can manage/cancel subscription

5. SUBSCRIPTION CHECK HELPER
Create/update lib/subscriptions.ts:
- hasActiveSubscription(userId, creatorId) → boolean
- getSubscription(userId, creatorId) → subscription object

Use existing patterns from LYRA-STANDARDS.md for auth checks and error handling.
```

---

# SECTION 4: PAYMENT TESTING 👤

## 4.1 Subscription Flow Test

### Test 1: New Subscription
1. Log in as a test user (not creator)
2. Go to a creator's profile
3. Click Subscribe / Premium
4. Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
6. Expiry: Any future date
7. CVC: Any 3 digits
8. Complete payment
9. Should redirect back to app
10. ✅ Verify: User now has access to premium content
11. ✅ Verify: Subscription row created in database
12. ✅ Verify: Status is 'active'

### Test 2: Subscription Shows in Stripe
1. Go to Stripe Dashboard → Customers
2. Find the test customer
3. ✅ Verify: Subscription is listed
4. ✅ Verify: Status is active

### Test 3: Cancel Subscription
1. In app, go to billing/settings
2. Click Manage Subscription (or use Stripe portal)
3. Cancel subscription
4. ✅ Verify: Stripe shows "Cancels at period end"
5. ✅ Verify: Database status updated
6. ✅ Verify: User still has access until period ends

### Test 4: Failed Payment
1. Create new subscription with card: `4000 0000 0000 0341`
2. This card fails on recurring charges
3. Wait for Stripe to attempt charge (or trigger manually)
4. ✅ Verify: Webhook receives invoice.payment_failed
5. ✅ Verify: Database status → past_due

### Test 5: Free User Blocked
1. Log in as user WITHOUT subscription
2. Try to access premium content
3. ✅ Verify: Access denied / paywall shown
4. ✅ Verify: Cannot see premium posts
5. ✅ Verify: Cannot chat beyond free limit

---

## 4.2 PPV Content Test (If Applicable)

### Test 1: Purchase PPV
1. Find a PPV post
2. Click to purchase
3. Complete payment with test card
4. ✅ Verify: Content now visible
5. ✅ Verify: Purchase recorded in database

### Test 2: Non-Purchaser Blocked
1. Different user views same PPV post
2. ✅ Verify: Content hidden/blurred
3. ✅ Verify: Purchase prompt shown

---

## 4.3 Webhook Security Test

### Test 1: Fake Webhook Rejected
```bash
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"fake"}}}'
```
✅ Should return 400 (invalid signature)

### Test 2: Real Webhook Accepted
1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click "Send test webhook"
3. Select "checkout.session.completed"
4. ✅ Verify: Returns 200
5. ✅ Verify: Logs show event processed

---

# SECTION 5: FINAL CHECKLIST

## Before Investor Demo ✅

### Security
- [ ] All user tables have RLS enabled
- [ ] All RLS policies check auth.uid()
- [ ] All API routes check authentication
- [ ] Premium routes check subscription
- [ ] Content URLs are protected (signed URLs)
- [ ] No secrets in code
- [ ] Error messages don't expose internals
- [ ] Webhook verifies signature

### GDPR
- [ ] Data export endpoint exists and works
- [ ] Account deletion endpoint exists and works
- [ ] Consent tracking in place (or planned)
- [ ] Privacy policy exists

### Payments
- [ ] Stripe test mode configured
- [ ] Checkout flow works
- [ ] Webhook processes events
- [ ] Subscription status updates correctly
- [ ] Free users cannot access premium
- [ ] Cancellation works correctly

### Demo Flow
- [ ] Can sign up
- [ ] Can subscribe to creator
- [ ] Premium content accessible after payment
- [ ] Chat works with personality
- [ ] Memory works (remembers user facts)
- [ ] Mobile UI works (iOS Safari)

---

## KNOWN ISSUES TO FIX BEFORE DEMO

| Issue | Priority | Status |
|-------|----------|--------|
| iOS sticky header | Medium | ✅ Fixed |
| Memory table name | High | ✅ Fixed |
| Message limit (20→200) | High | ✅ Fixed |
| iOS keyboard gap | Medium | ✅ Fixed |
| Demo account setup | Medium | ✅ Fixed |
| Stripe not implemented | Critical | Pending |

---

## AUDIT RESULTS TEMPLATE

After running all checks, document:

```markdown
## LYRA Security Audit Results
Date: ___________
Auditor: ___________

### RLS Status
- Tables checked: __
- Tables with RLS: __
- Tables missing RLS: [list]

### API Auth
- Routes checked: __
- Routes with auth: __
- Routes missing auth: [list]

### Content Protection
- Status: [Protected / Vulnerable / N/A]
- Notes: ___

### Input Validation
- Status: [Good / Needs Work]
- Issues: [list]

### Error Handling
- Status: [Good / Exposing Internals]
- Issues: [list]

### Secrets
- Status: [Clean / Found Secrets]
- Issues: [list]

### GDPR
- Data Export: [Exists / Missing]
- Account Delete: [Exists / Missing]
- Consent: [Tracked / Not Tracked]

### Payments
- Status: [Implemented / Partial / Missing]
- Test Results: [Pass / Fail]

### Overall Readiness
- [ ] Ready for investor demo
- [ ] Needs work (see issues above)
```
