# ZIP-06: Security Hardening (Critical Issues)

> **Estimated Time**: 52 hours (broken into phases)
> **Dependencies**: None (critical fixes)
> **Status**: Not Started
> **Red-Teamed**: [ ] Yes
> **Has UI**: [ ] No (backend security)

---

## RULES FOR THIS ZIP

1. **NO NEW CONCEPTS**: Only implement security fixes for existing features
2. **NO SCOPE CREEP**: Focus on the 8 critical issues, nothing else
3. **NO PREMATURE ABSTRACTION**: Implement security properly, not cleverly
4. **ASK, DON'T ASSUME**: If security implications unclear, ask first
5. **NO SHORTCUTS**: Security cannot be "good enough for now"

## ⛔ HARD RULES (See CLAUDE-CODE-RULES.md)

- **NEVER skip security checks** - validate everything
- **NEVER use workarounds** - fix root cause
- **NEVER expose secrets** - verify before committing
- If stuck → STOP and explain, don't hack around it

---

## ENTRY CRITERIA

DO NOT start until:

▢ Production readiness audit reviewed
▢ All credentials rotated (Supabase, R2)
▢ .env.local removed from git history
▢ Backup of database taken
▢ This ZIP has been reviewed

---

## PURPOSE

Fix all 8 critical security vulnerabilities identified in the production readiness audit to make AIFans production-ready from a security perspective.

---

## WHAT THIS ZIP IS NOT

This ZIP does NOT:

- Add new features
- Improve performance (that's ZIP-08)
- Implement nice-to-have security (only critical)
- Add GDPR compliance (that's ZIP-07)
- Fix moderation system

---

## CRITICAL ISSUES TO FIX

### Phase 1: Immediate Fixes (2 hours) ⚡
1. Remove .env.local from git
2. Rotate all credentials
3. Fix npm vulnerabilities
4. Add .gitignore validation

### Phase 2: Security Headers (2 hours)
5. Add HSTS, CSP, X-Frame-Options
6. Configure security middleware

### Phase 3: Rate Limiting (8 hours)
7. Install Upstash Redis
8. Implement rate limiting middleware
9. Apply to auth, chat, upload endpoints

### Phase 4: MFA for Admin/Creator (4 hours)
10. Enable Supabase MFA
11. Enforce MFA for admin role
12. Update onboarding flow

### Phase 5: Audit Logging (12 hours)
13. Create audit service
14. Log admin actions
15. Log auth events
16. Log sensitive data access

### Phase 6: RLS Policy Review (8 hours)
17. Review all USING (true) policies
18. Tighten service role policies
19. Add policy tests
20. Document policy decisions

### Phase 7: Input Validation (16 hours)
21. Add Zod schemas to all routes
22. Validate file uploads properly
23. Add CORS policy
24. Test all endpoints

---

## DATABASE CHANGES

### No New Tables Required

### Policy Updates Required

All policies with `USING (true)` need review:
- `creators` table - Service role policy
- `memory_context` table - Service role policy
- `ai_chat_messages` table - Service role policy
- `content_reports` table - Admin policy
- `audit_log` table - Admin policy

**Current (Unsafe):**
```sql
CREATE POLICY "Service can manage creators" ON creators
    FOR ALL USING (true);
```

**Proposed (Safe):**
```sql
CREATE POLICY "Service can manage creators" ON creators
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Creators can read own data" ON creators
    FOR SELECT USING (
        auth.uid() = user_id
    );
```

### Audit Log Schema (Already Exists)

No changes needed, just start using it.

---

## FILES TO CREATE/MODIFY

### Phase 1: Immediate (2h)

**Modify:**
- `.gitignore` - Ensure .env.local listed
- `package.json` - Update vulnerable packages
- `.env.example` - Add missing variables

**Create:**
- `scripts/rotate-credentials.sh` - Credential rotation checklist

### Phase 2: Security Headers (2h)

**Modify:**
- `next.config.mjs` - Add headers configuration

### Phase 3: Rate Limiting (8h)

**Create:**
- `src/lib/rate-limit.ts` - Rate limiter instance
- `src/middleware/rate-limit.ts` - Rate limit middleware

**Modify:**
- `src/middleware.ts` - Add rate limiting
- `src/app/api/auth/*/route.ts` - Apply rate limits
- `src/app/api/chat/[creatorId]/route.ts` - Apply rate limits
- `src/app/api/upload/route.ts` - Apply rate limits

### Phase 4: MFA (4h)

**Create:**
- `src/lib/auth/mfa.ts` - MFA utilities
- `src/components/auth/MFASetup.tsx` - MFA setup UI

**Modify:**
- `src/app/api/admin/*/route.ts` - Enforce MFA
- `src/app/(creator)/dashboard/settings/page.tsx` - Add MFA settings

### Phase 5: Audit Logging (12h)

**Create:**
- `src/lib/audit/logger.ts` - Audit logging service
- `src/lib/audit/events.ts` - Event type definitions

**Modify:**
- All `/api/admin/*` routes - Add audit logging
- `src/app/api/auth/callback/route.ts` - Log login events
- `src/lib/supabase/server.ts` - Add audit wrapper

### Phase 6: RLS Review (8h)

**Modify:**
- `database/migrations/006_creator_and_ppv_tables.sql` - Fix creator policies
- `database/migrations/005_memory_tables.sql` - Fix memory policies
- `database/migrations/011_chat_messages_table.sql` - Fix chat policies
- `database/migrations/012_content_moderation.sql` - Fix moderation policies

**Create:**
- `tests/rls-policies.test.ts` - RLS test suite
- `docs/RLS-POLICIES.md` - Policy documentation

### Phase 7: Input Validation (16h)

**Create:**
- `src/lib/validation/schemas.ts` - Zod schemas
- `src/lib/validation/middleware.ts` - Validation middleware

**Modify:**
- All `/api/*` routes - Add Zod validation
- `next.config.mjs` - Add CORS headers
- `src/lib/storage/r2.ts` - Add magic byte validation

---

## DETAILED REQUIREMENTS

### Requirement 1: Remove Exposed Credentials

**What**: Remove .env.local from git history and rotate all keys

**Acceptance criteria**:
- [ ] .env.local not in git history (`git log --all -- .env.local` returns nothing)
- [ ] New Supabase anon key generated
- [ ] New Supabase service role key generated
- [ ] New R2 access keys generated
- [ ] All production env vars updated
- [ ] Old keys revoked in dashboards
- [ ] .gitignore contains .env.local

**Commands:**
```bash
# Remove from git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Add to .gitignore if not already there
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "security: ensure .env.local ignored"
```

---

### Requirement 2: Security Headers

**What**: Add comprehensive security headers to all responses

**Acceptance criteria**:
- [ ] HSTS header with max-age=31536000
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy configured
- [ ] Content-Security-Policy with appropriate rules
- [ ] Headers verified with `curl -I https://yoursite.com`

**Implementation:**
```javascript
// next.config.mjs
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(), microphone=(), camera=()'
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://api.stripe.com",
            "frame-src https://js.stripe.com"
          ].join('; ')
        }
      ]
    }
  ];
}
```

---

### Requirement 3: Rate Limiting

**What**: Implement rate limiting on all public endpoints

**Acceptance criteria**:
- [ ] Upstash Redis configured
- [ ] Rate limiter middleware created
- [ ] Auth endpoints: 5 requests per 15 minutes per IP
- [ ] Chat endpoints: 30 messages per hour per user
- [ ] Upload endpoints: 10 uploads per hour per user
- [ ] Admin endpoints: 100 requests per minute
- [ ] 429 status returned when limit exceeded
- [ ] Tested with `for i in {1..100}; do curl ...; done`

**Implementation:**
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:auth',
});

export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'ratelimit:chat',
});

export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:upload',
});
```

---

### Requirement 4: MFA for Admin/Creator Accounts

**What**: Enable and enforce MFA for high-value accounts

**Acceptance criteria**:
- [ ] Supabase MFA enabled in project settings
- [ ] Admin users required to enable MFA on first login
- [ ] Creator users prompted to enable MFA (optional initially)
- [ ] MFA status stored in profiles table
- [ ] Admin routes check for MFA enrollment
- [ ] UI for MFA setup in settings
- [ ] QR code generation for TOTP
- [ ] Backup codes provided

---

### Requirement 5: Audit Logging

**What**: Log all security-critical actions to audit_log table

**Acceptance criteria**:
- [ ] Audit service created
- [ ] All admin actions logged (approve creator, ban user, etc.)
- [ ] Auth events logged (login, logout, failed login)
- [ ] Sensitive data access logged (view another user's data)
- [ ] IP address and user agent captured
- [ ] Audit log viewable in admin dashboard
- [ ] Logs include: who, what, when, where, why (if applicable)

**Events to log:**
- Admin login
- Creator approval/rejection
- Model approval/rejection
- User ban/unban
- Content moderation actions
- Failed login attempts (>3 per IP)
- Service role key usage
- RLS policy violations

---

### Requirement 6: RLS Policy Review

**What**: Audit and tighten all RLS policies

**Acceptance criteria**:
- [ ] All `USING (true)` policies reviewed
- [ ] Service role policies restricted to JWT role check
- [ ] Each policy has comment explaining purpose
- [ ] No policies allow unauthorized cross-tenant access
- [ ] Test suite verifies isolation
- [ ] Documentation updated

---

### Requirement 7: Input Validation

**What**: Add Zod validation to all API routes

**Acceptance criteria**:
- [ ] Zod schemas defined for all request bodies
- [ ] Validation middleware created
- [ ] All POST/PUT/PATCH routes validate input
- [ ] File uploads validate magic bytes (not just extension)
- [ ] Error messages don't leak schema details
- [ ] CORS policy defined for external access

---

## EXIT CRITERIA

This ZIP is DONE when:

▢ .env.local removed from git history
▢ All credentials rotated and old ones revoked
▢ npm audit shows 0 high/critical vulnerabilities
▢ Security headers present in production (`curl -I` test)
▢ Rate limiting functional on auth/chat/upload
▢ MFA enabled for all admin accounts
▢ Audit logging captures all admin actions
▢ All RLS `USING (true)` policies reviewed and fixed
▢ Zod validation on all API routes
▢ CORS policy configured
▢ File upload validates magic bytes
▢ IMPLEMENTATION-LOG.md updated
▢ TECHNICAL-FLUENCY.md updated (Error Diary, Decisions)
▢ Security test suite passing
▢ Production readiness score >75/100

---

## TESTING

### Manual Tests

1. [ ] Try to access .env.local in git history (should fail)
2. [ ] Verify old Supabase keys don't work (401 error)
3. [ ] Send 10 auth requests in 1 minute (should rate limit)
4. [ ] Send 100 chat messages in 10 minutes (should rate limit)
5. [ ] Upload .exe renamed as .jpg (should fail magic byte check)
6. [ ] Login as admin without MFA (should require setup)
7. [ ] Approve creator as admin (should appear in audit_log)
8. [ ] Try to access another user's posts (should fail)
9. [ ] Check security headers with curl
10. [ ] Send malformed JSON to API (should return 400 with validation error)

### Automated Tests

```typescript
// tests/security.test.ts
describe('Security Controls', () => {
  it('enforces rate limiting on auth endpoints', async () => {
    // Send 10 requests rapidly
    // Expect 429 on 6th request
  });

  it('validates input with Zod', async () => {
    // Send invalid data
    // Expect 400 with validation message
  });

  it('enforces RLS policies', async () => {
    // User A tries to access User B's data
    // Expect 403 or empty result
  });

  it('logs admin actions', async () => {
    // Admin approves creator
    // Verify audit_log entry exists
  });
});
```

---

## NOTES

### Dependencies to Install

```bash
npm install @upstash/ratelimit @upstash/redis zod
```

### Environment Variables to Add

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
ENCRYPTION_KEY=<generate with openssl rand -base64 32>
```

### Supabase MFA Setup

1. Go to Supabase Dashboard
2. Authentication → Settings
3. Enable "Multi-factor authentication"
4. Choose TOTP (Time-based One-Time Password)

---

## PHASED IMPLEMENTATION

**Day 1-2: Immediate Fixes (2h)**
- Remove .env.local, rotate credentials, fix npm vulnerabilities

**Day 3: Security Headers (2h)**
- Add headers to next.config.mjs

**Day 4-5: Rate Limiting (8h)**
- Set up Upstash, implement middleware

**Day 6: MFA (4h)**
- Enable Supabase MFA, add UI

**Day 7-9: Audit Logging (12h)**
- Create audit service, integrate into routes

**Day 10-11: RLS Review (8h)**
- Fix policies, add tests

**Day 12-14: Input Validation (16h)**
- Add Zod schemas, implement validation

**Total: 52 hours over ~3 weeks**

---

## RISK MITIGATION

**Risk**: Rate limiting blocks legitimate users
**Mitigation**: Set generous limits initially, monitor and adjust

**Risk**: MFA lockout (user loses device)
**Mitigation**: Provide backup codes, admin recovery process

**Risk**: RLS policy changes break existing functionality
**Mitigation**: Test thoroughly in staging before production

**Risk**: Zod validation too strict, rejects valid input
**Mitigation**: Write schemas based on actual data patterns

---

## SUCCESS METRICS

- Production readiness score increases from 52/100 to >75/100
- Zero critical vulnerabilities remain
- All security headers present
- Rate limiting functional (measured by 429 responses in logs)
- MFA adoption: 100% of admins, >50% of creators
- Audit log capturing >100 events per day
- Zero RLS bypass vulnerabilities
- API input validation coverage: 100% of routes
