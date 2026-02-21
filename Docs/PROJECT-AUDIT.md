# Project Audit Framework

> **Claude: This is a comprehensive audit framework. Run through EVERY section systematically. Do not skip sections. Do not rush. This audit protects the user from shipping insecure, non-compliant, or unscalable code.**

---

## Audit Overview

**What this audit covers:**
- Security vulnerabilities and risks
- Database design and Row Level Security
- Authentication and authorization
- Scalability and performance
- GDPR and data compliance
- Code quality and maintainability
- Production readiness
- Technical debt

**Time required:** 30-60 minutes depending on codebase size

**Output:** A comprehensive report with severity ratings and actionable recommendations

---

## How to Run This Audit

1. Read each section carefully
2. Investigate the codebase for each item
3. Document findings with severity ratings:
   - 🔴 **CRITICAL** - Security risk, data breach potential, must fix before launch
   - 🟠 **HIGH** - Significant issue, fix before scaling
   - 🟡 **MEDIUM** - Should fix, but not blocking
   - 🟢 **LOW** - Nice to have, best practice
   - ✅ **PASS** - Properly implemented

4. Generate the Executive Summary
5. Create remediation ZIPs for critical/high issues

---

# SECTION 1: Security Audit

## 1.1 Secrets Management

### Check for exposed secrets
```bash
# Search for hardcoded secrets
grep -r "sk_live" .
grep -r "sk_test" .
grep -r "password" . --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "apiKey" . --include="*.ts" --include="*.tsx"
grep -r "secret" . --include="*.ts" --include="*.tsx"
```

**Audit items:**
- [ ] No API keys hardcoded in source files
- [ ] No secrets in client-side code (files in /app or /components)
- [ ] `.env.local` is in `.gitignore`
- [ ] No `.env` files committed to git history
- [ ] Service role keys only used server-side
- [ ] Stripe secret keys only in API routes

**Findings:**
```
[Document any exposed secrets here]
```

---

## 1.2 API Route Security

### Check every route in /app/api/

**For each API route, verify:**
- [ ] Authentication check at the start
- [ ] Authorization check (user can access this resource)
- [ ] Input validation (zod, yup, or manual)
- [ ] Rate limiting consideration
- [ ] Error messages don't leak sensitive info

**Common vulnerabilities to check:**
```typescript
// ❌ BAD - No auth check
export async function POST(request: Request) {
  const data = await request.json()
  // Directly processes data without checking who sent it
}

// ✅ GOOD - Auth check first
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Now process the request
}
```

**Audit each route:**

| Route | Auth Check | Input Validation | Rate Limited | Status |
|-------|------------|------------------|--------------|--------|
| | | | | |

---

## 1.3 Input Validation & Sanitization

**Check for:**
- [ ] All user inputs validated before processing
- [ ] Type checking on request bodies
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escapes by default, but check dangerouslySetInnerHTML)
- [ ] File upload validation (type, size, content)

**Search for dangerous patterns:**
```bash
# XSS risk
grep -r "dangerouslySetInnerHTML" .

# Direct SQL (should use parameterized)
grep -r "\.raw\(" .
grep -r "execute(" .

# Unvalidated redirects
grep -r "redirect(" . --include="*.ts" --include="*.tsx"
```

**Findings:**
```
[Document any validation issues]
```

---

## 1.4 Authentication Security

**Check for:**
- [ ] Passwords not stored in plain text (should use Supabase Auth)
- [ ] Session tokens are httpOnly cookies (not localStorage for auth)
- [ ] Session expiry is configured
- [ ] Password reset flow is secure
- [ ] Email verification required (if applicable)
- [ ] OAuth providers configured securely

**Supabase Auth specific:**
- [ ] Using `createServerClient` or `createRouteHandlerClient` (not client in API routes)
- [ ] Not exposing service_role key to client
- [ ] Using `getUser()` not `getSession()` for security-critical checks

---

## 1.5 HTTPS & Headers

**Check for:**
- [ ] All production URLs use HTTPS
- [ ] No mixed content (HTTP resources on HTTPS pages)
- [ ] Security headers configured (via next.config.js or Vercel)

**Recommended headers:**
```javascript
// next.config.js
headers: [
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
    value: 'camera=(), microphone=(), geolocation=()'
  }
]
```

---

## 1.6 Dependency Vulnerabilities

```bash
# Run npm audit
npm audit

# Check for outdated packages
npm outdated
```

**Findings:**
```
[List any vulnerable dependencies]
```

---

# SECTION 2: Database & RLS Audit

## 2.1 Row Level Security Status

**For EVERY table, check:**

```sql
-- Run in Supabase SQL editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

| Table | RLS Enabled | Policies Exist | Status |
|-------|-------------|----------------|--------|
| | | | |

**🔴 CRITICAL if any table has:**
- RLS disabled
- No policies (allows all access)
- `USING (true)` policy (allows all access)

---

## 2.2 Policy Analysis

**For each table, document the policies:**

### [Table Name]

| Policy Name | Operation | USING clause | WITH CHECK | Assessment |
|-------------|-----------|--------------|------------|------------|
| | SELECT | | | |
| | INSERT | | | |
| | UPDATE | | | |
| | DELETE | | | |

**Check for:**
- [ ] SELECT policies prevent users seeing other users' data
- [ ] INSERT policies ensure `user_id` is set to `auth.uid()`
- [ ] UPDATE policies prevent modifying other users' records
- [ ] DELETE policies prevent deleting other users' records
- [ ] No policy uses `USING (true)` without good reason
- [ ] Service role operations are server-side only

**Common RLS vulnerabilities:**

```sql
-- ❌ BAD - Anyone can read everything
CREATE POLICY "public_read" ON posts FOR SELECT USING (true);

-- ✅ GOOD - Users only see their own
CREATE POLICY "user_read" ON posts FOR SELECT USING (auth.uid() = user_id);

-- ❌ BAD - User can set any user_id on insert
CREATE POLICY "insert" ON posts FOR INSERT WITH CHECK (true);

-- ✅ GOOD - user_id must match authenticated user
CREATE POLICY "insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 2.3 Multi-Tenant Isolation

**If this is a multi-tenant application:**

- [ ] Tenant ID is on all relevant tables
- [ ] RLS policies filter by tenant
- [ ] No way for Tenant A to see Tenant B's data
- [ ] Admin routes check tenant ownership

**Test scenario:**
```
As User A (Tenant 1), try to:
1. Read User B's (Tenant 2) data
2. Update User B's records
3. Delete User B's records

All should fail with RLS.
```

---

## 2.4 Database Schema Quality

**Check for:**
- [ ] All tables have primary keys
- [ ] Foreign keys are defined with proper cascading
- [ ] Indexes exist on frequently queried columns
- [ ] No orphaned tables
- [ ] Timestamps (created_at, updated_at) on relevant tables
- [ ] Soft delete vs hard delete is consistent

**Index check:**
```sql
-- Find tables without indexes (besides PK)
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT DISTINCT tablename FROM pg_indexes WHERE schemaname = 'public'
);
```

---

# SECTION 3: Scalability Audit

## 3.1 Database Performance

**Check for N+1 queries:**
```typescript
// ❌ BAD - N+1 query
const users = await getUsers()
for (const user of users) {
  const posts = await getPosts(user.id) // Query per user!
}

// ✅ GOOD - Single query with join
const usersWithPosts = await supabase
  .from('users')
  .select('*, posts(*)')
```

**Check for:**
- [ ] No N+1 query patterns
- [ ] Pagination on list queries (not fetching all records)
- [ ] Indexes on WHERE and JOIN columns
- [ ] No `SELECT *` when only specific fields needed

---

## 3.2 API Performance

**Check for:**
- [ ] Expensive operations are async/background jobs
- [ ] Caching strategy for repeated data
- [ ] No blocking operations in request path
- [ ] Proper error handling doesn't crash server

---

## 3.3 Frontend Performance

**Check for:**
- [ ] Images optimized (using next/image)
- [ ] No massive bundle imports
- [ ] Code splitting / lazy loading for large components
- [ ] Static pages where possible (SSG vs SSR)
- [ ] Proper loading states (not blocking renders)

**Bundle analysis:**
```bash
npm run build
# Check .next output for bundle sizes
```

---

## 3.4 Connection & Resource Limits

**Supabase limits:**
| Tier | Connections | Bandwidth | Storage |
|------|-------------|-----------|---------|
| Free | 50 | 2GB/mo | 500MB |
| Pro | 100 | 50GB/mo | 8GB |

**Check:**
- [ ] Connection pooling enabled (Supabase does this)
- [ ] Not opening new connections per request
- [ ] Large file uploads go to Storage, not database
- [ ] Aware of current tier limits

---

# SECTION 4: GDPR & Compliance Audit

## 4.1 Privacy Policy & Terms

- [ ] Privacy policy exists and is accessible
- [ ] Terms of service exist
- [ ] Cookie policy (if using cookies beyond essential)
- [ ] Policies are up to date with actual data practices

---

## 4.2 User Consent

**Check for:**
- [ ] Cookie consent banner (if non-essential cookies used)
- [ ] Marketing email opt-in (not opt-out)
- [ ] Clear consent before collecting personal data
- [ ] Consent records stored with timestamp

**What counts as personal data:**
- Email addresses
- Names
- IP addresses
- Location data
- Payment information
- Any data that identifies a person

---

## 4.3 Data Subject Rights (GDPR Article 15-22)

Users must be able to:

| Right | Implemented | How |
|-------|-------------|-----|
| **Access** - See their data | | |
| **Rectification** - Correct their data | | |
| **Erasure** - Delete their account/data | | |
| **Portability** - Export their data | | |
| **Restriction** - Limit processing | | |
| **Object** - Opt out of processing | | |

**Check for:**
- [ ] Account deletion actually deletes data (not just flags)
- [ ] Data export feature exists (JSON/CSV download)
- [ ] Deletion cascades to all related data
- [ ] Third-party services also delete (Stripe, email provider)

---

## 4.4 Data Storage & Processing

**Document:**
| Data Type | Where Stored | Encrypted | Retention Period |
|-----------|--------------|-----------|------------------|
| User profiles | Supabase | At rest | Until deletion |
| Payment data | Stripe | Yes | Per Stripe policy |
| Session data | | | |
| Analytics | | | |

**Check for:**
- [ ] Data stored in EU if serving EU users (or adequate protections)
- [ ] Third-party processors have DPAs (Data Processing Agreements)
- [ ] No unnecessary data collection
- [ ] Data retention limits defined

---

## 4.5 Breach Preparedness

- [ ] Know how to detect a breach
- [ ] Know who to notify (supervisory authority within 72 hours if GDPR)
- [ ] Have user contact method for breach notification
- [ ] Incident response process documented

---

# SECTION 5: Code Quality Audit

## 5.1 TypeScript Configuration

**Check tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,           // Should be true
    "noImplicitAny": true,    // Should be true
    "strictNullChecks": true  // Should be true
  }
}
```

- [ ] Strict mode enabled
- [ ] No `any` types (search: `grep -r ": any" . --include="*.ts"`)
- [ ] No `@ts-ignore` comments hiding issues

---

## 5.2 Error Handling

**Check for:**
- [ ] Try/catch around external calls (APIs, database)
- [ ] Errors logged properly (not just swallowed)
- [ ] User-friendly error messages (not stack traces)
- [ ] Error boundaries in React

**Bad patterns:**
```typescript
// ❌ BAD - Swallows error
try {
  await doThing()
} catch (e) {
  // Silent failure
}

// ❌ BAD - Exposes internals
catch (e) {
  return NextResponse.json({ error: e.message }) // Stack trace to user
}

// ✅ GOOD
catch (e) {
  console.error('doThing failed:', e)
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
}
```

---

## 5.3 Code Organization

- [ ] Consistent file naming convention
- [ ] Logical folder structure
- [ ] No circular dependencies
- [ ] Shared code properly abstracted
- [ ] No massive files (>500 lines = code smell)

---

## 5.4 Testing

| Test Type | Exists | Coverage |
|-----------|--------|----------|
| Unit tests | | |
| Integration tests | | |
| E2E tests | | |

- [ ] Critical paths have test coverage
- [ ] Tests actually run in CI

---

# SECTION 6: Production Readiness Audit

## 6.1 Environment Configuration

**Check that all environments are configured:**

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| DATABASE_URL | | | |
| SUPABASE_URL | | | |
| STRIPE_KEY | | | |
| etc. | | | |

- [ ] Production uses production API keys
- [ ] No test/dev keys in production
- [ ] All required variables documented

---

## 6.2 Monitoring & Observability

| Tool | Configured | Purpose |
|------|------------|---------|
| Error tracking (Sentry) | | Catch production errors |
| Uptime monitoring | | Know when site is down |
| Analytics | | Understand usage |
| Log aggregation | | Debug production issues |

---

## 6.3 Deployment Pipeline

- [ ] Automated deployments (Vercel/GitHub integration)
- [ ] Preview deployments for PRs
- [ ] Environment variables properly set in Vercel
- [ ] Build succeeds with no warnings

---

## 6.4 Backup & Recovery

- [ ] Database backups enabled (Supabase does daily on Pro)
- [ ] Know how to restore from backup
- [ ] Tested recovery process

---

# SECTION 7: Executive Summary

After completing all sections, generate this summary:

```markdown
# Project Audit Report

**Project:** [Name]
**Audit Date:** [Date]
**Auditor:** ZipBuild AI Audit

---

## Overall Assessment

| Area | Rating | Critical Issues |
|------|--------|-----------------|
| Security | 🔴/🟠/🟡/🟢 | X |
| Database & RLS | 🔴/🟠/🟡/🟢 | X |
| Scalability | 🔴/🟠/🟡/🟢 | X |
| GDPR Compliance | 🔴/🟠/🟡/🟢 | X |
| Code Quality | 🔴/🟠/🟡/🟢 | X |
| Production Ready | 🔴/🟠/🟡/🟢 | X |

**Overall Status:** [READY / NEEDS WORK / CRITICAL ISSUES]

---

## 🔴 Critical Issues (Must Fix Immediately)

1. **[Issue Title]**
   - **Risk:** [What could happen]
   - **Fix:** [What to do]
   - **Effort:** [Hours/Days]

2. ...

---

## 🟠 High Priority Issues

1. ...

---

## 🟡 Medium Priority Issues

1. ...

---

## 🟢 Recommendations (Best Practices)

1. ...

---

## Remediation Plan

Based on this audit, the following ZIPs are recommended:

### ZIP-SECURITY (Estimated: X hours)
- [ ] Fix [critical security issue 1]
- [ ] Fix [critical security issue 2]

### ZIP-COMPLIANCE (Estimated: X hours)
- [ ] Implement [GDPR requirement 1]
- [ ] Implement [GDPR requirement 2]

### ZIP-PERFORMANCE (Estimated: X hours)
- [ ] Fix [scalability issue 1]
- [ ] Add [monitoring tool]

---

## Certification

Once all 🔴 Critical and 🟠 High issues are resolved, this project will be certified as:

**ZipBuild Production Ready ✓**

This means:
- Security vulnerabilities addressed
- User data properly protected
- Scalable architecture in place
- Compliance requirements met
- Monitoring and observability configured
```

---

# Post-Audit Actions

After presenting the audit:

1. **User reviews findings**
2. **Prioritize remediation** - Critical first, then high
3. **Generate remediation ZIPs** - Each category becomes a ZIP
4. **Re-audit after fixes** - Verify issues are resolved
5. **Continue with feature ZIPs** - Only after critical issues fixed

---

## Audit Tone

Be professional but not alarmist:

- ✅ "This RLS policy allows users to read other users' data. Here's how to fix it."
- ❌ "YOUR DATA IS EXPOSED AND EVERYONE CAN SEE EVERYTHING!!!"

Be specific:
- ✅ "The /api/users route lacks authentication. Add a getUser() check at line 5."
- ❌ "Some APIs might have security issues."

Be actionable:
- ✅ Every issue has a recommended fix
- ❌ Just listing problems without solutions
