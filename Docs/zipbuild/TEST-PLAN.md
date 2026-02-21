# Test Plan

> **Real tests that prove your app works.** Not placeholders. Not checkboxes. Actual verification.

---

## The Tests That Matter

These are the tests that prevent disasters. Run them before every major deploy.

---

## 1. Tenant Isolation Tests (CRITICAL)

> **The nightmare scenario:** User A sees User B's data. This test prevents that.

### The Test

```
1. Create Tenant A (e.g., org_a)
2. Create User A in Tenant A
3. Create data in Tenant A (e.g., a record, a file, a setting)

4. Create Tenant B (e.g., org_b)  
5. Create User B in Tenant B

6. Authenticate as User B
7. Attempt to:
   - READ Tenant A's data
   - UPDATE Tenant A's data
   - DELETE Tenant A's data
   
8. Expected result: DENIED for all operations
```

### How to Run (Supabase)

**Option A: SQL Editor**
```sql
-- As User B, try to read Tenant A's data
-- This should return 0 rows if RLS is correct

SET request.jwt.claim.sub = 'user_b_id';  -- Simulate User B
SELECT * FROM your_table WHERE tenant_id = 'tenant_a_id';
-- Expected: 0 rows (RLS blocks it)
```

**Option B: API Test (Postman/Insomnia)**
```
1. Login as User B → Get JWT
2. GET /api/records?tenant_id=tenant_a_id
3. Expected: Empty array or 403 Forbidden
```

**Option C: Playwright/Cypress**
```typescript
test('tenant isolation - cannot access other tenant data', async () => {
  // Login as User B
  await loginAs('user_b@example.com', 'password')
  
  // Try to fetch Tenant A's record by ID
  const response = await fetch('/api/records/tenant_a_record_id')
  
  // Should be denied
  expect(response.status).toBe(404) // or 403
})
```

### Run This Test For Every Table

| Table | Tenant Column | Test Status |
|-------|---------------|-------------|
| | | ▢ Pass / ▢ Fail |
| | | ▢ Pass / ▢ Fail |
| | | ▢ Pass / ▢ Fail |

---

## 2. Authentication Tests

### Unauthenticated Access

```
For every protected route:
1. Make request WITHOUT auth token
2. Expected: 401 Unauthorized

Routes to test:
▢ GET /api/[protected-route]
▢ POST /api/[protected-route]
▢ All dashboard pages redirect to login
```

### Invalid Token

```
1. Make request with expired/invalid JWT
2. Expected: 401 Unauthorized
```

### Session Expiry

```
1. Login
2. Wait for session to expire (or manually expire it)
3. Try to access protected resource
4. Expected: Redirect to login or 401
```

---

## 3. Authorization Tests (Role-Based)

If your app has roles (admin, member, viewer, etc.):

```
For each role-restricted action:
1. Authenticate as lower-privilege user
2. Attempt the action
3. Expected: 403 Forbidden

Example:
▢ Member cannot delete organization
▢ Viewer cannot edit records
▢ Non-admin cannot access admin panel
▢ Non-owner cannot transfer ownership
```

### Authorization Test Matrix

| Action | Admin | Member | Viewer | Unauth |
|--------|-------|--------|--------|--------|
| View records | ✅ | ✅ | ✅ | ❌ |
| Create records | ✅ | ✅ | ❌ | ❌ |
| Delete records | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ |

---

## 4. Input Validation Tests

### SQL Injection

```
Test inputs:
- ' OR '1'='1
- '; DROP TABLE users; --
- 1; SELECT * FROM users

Expected: Input rejected or safely escaped, no SQL execution
```

### XSS (Cross-Site Scripting)

```
Test inputs:
- <script>alert('xss')</script>
- <img src="x" onerror="alert('xss')">
- javascript:alert('xss')

Expected: Input sanitized, no script execution
```

### Boundary Testing

```
- Empty strings where required
- Extremely long strings (10,000+ chars)
- Special characters (!@#$%^&*)
- Unicode characters (emoji, RTL text)
- Negative numbers where positive expected
- Zero where non-zero expected

Expected: Validation errors, not crashes
```

---

## 5. Payment/Billing Tests (If Applicable)

### Webhook Idempotency

```
1. Send the same webhook event twice
2. Expected: Processed once, second ignored

Test with:
- checkout.session.completed
- invoice.paid
- customer.subscription.updated
```

### Subscription State

```
▢ New signup → correct plan assigned
▢ Upgrade → immediate access to new features
▢ Downgrade → access revoked at period end
▢ Cancellation → access until period end
▢ Failed payment → grace period, then restricted
▢ Reactivation → access restored
```

### Payment Failure Handling

```
1. Use Stripe test card that fails: 4000 0000 0000 0002
2. Expected: 
   - User sees clear error message
   - No partial state (subscription created but not paid)
   - Can retry payment
```

---

## 6. Rate Limiting Tests

### Auth Endpoints

```
1. Send 20 login requests in 10 seconds
2. Expected: Blocked after threshold (e.g., 5-10 attempts)
3. Returns 429 Too Many Requests
```

### Expensive Operations

```
Test rate limits on:
▢ API endpoints that hit database heavily
▢ File upload endpoints
▢ Export/download endpoints
▢ Search endpoints
▢ Email sending endpoints
```

---

## 7. Load Testing (Basic)

Use k6, Artillery, or similar tool.

### Baseline Test

```javascript
// k6 script example
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,        // 10 virtual users
  duration: '30s', // for 30 seconds
};

export default function () {
  // Test your main endpoints
  const res = http.get('https://yourapp.com/api/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### What to Measure

| Endpoint | Target Response Time | Actual | Pass? |
|----------|---------------------|--------|-------|
| GET /api/records | < 200ms | | |
| POST /api/records | < 500ms | | |
| GET /dashboard | < 1s | | |

### Warning Signs

- Response time > 2 seconds
- Error rate > 1%
- Database connections exhausted
- Memory usage spiking

---

## 8. Error Handling Tests

### API Errors

```
For each API route:
1. Send malformed request
2. Expected: 
   - Appropriate error code (400, 422, etc.)
   - User-friendly error message
   - No stack trace exposed
   - Error logged to tracking system
```

### Database Errors

```
1. Simulate database unavailable
2. Expected:
   - Graceful error message to user
   - Error logged
   - No crash
```

### Third-Party Service Errors

```
For each integration (Stripe, email, etc.):
1. Simulate service unavailable
2. Expected:
   - Graceful degradation
   - User informed appropriately
   - Retry logic where applicable
```

---

## Test Execution Checklist

Run before major deploys:

```markdown
## Pre-Deploy Test Run

**Date**: 
**Tester**: 
**Environment**: 

### Critical Tests
- [ ] Tenant isolation (all tables)
- [ ] Authentication (all protected routes)
- [ ] Authorization (all role-restricted actions)

### Security Tests
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Rate limiting active

### Payment Tests (if applicable)
- [ ] Webhook idempotency
- [ ] Subscription state transitions
- [ ] Payment failure handling

### Load Tests
- [ ] Baseline load test passed
- [ ] No degradation under expected load

### Result
- [ ] ALL TESTS PASS → Clear to deploy
- [ ] FAILURES → Do not deploy, fix first
```

---

## Automated vs Manual

### Automate These (CI/CD)
- TypeScript compilation
- Linting
- Unit tests
- Tenant isolation tests
- Auth tests

### Manual Testing (Pre-Release)
- Full user journey walkthrough
- Payment flows with test cards
- Email delivery verification
- Mobile responsiveness
- Cross-browser check

---

## Tools

| Purpose | Tool | Cost |
|---------|------|------|
| E2E Testing | Playwright | Free |
| API Testing | Postman / Insomnia | Free tier |
| Load Testing | k6 | Free tier |
| Security Scanning | npm audit, Snyk | Free tier |
| Browser Testing | BrowserStack | Paid |

---

## The Minimum Test (If You Do Nothing Else)

If you're strapped for time, do THIS ONE TEST:

```
1. Create User A in Org A
2. Create data in Org A
3. Create User B in Org B
4. Login as User B
5. Try to access Org A's data
6. MUST BE DENIED

If this fails, you have a critical security vulnerability.
Do not ship until it passes.
```
