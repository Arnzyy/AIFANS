# Security Baseline

> **Minimum security requirements for production.** Non-negotiable standards.

---

## Data Classification

Before building, classify your data:

### Tier 1: Critical (Highest Protection)
- Passwords (never store plaintext - use Supabase Auth)
- Payment credentials (never touch - use Stripe)
- API keys and secrets
- Auth tokens / session data

**Requirements:**
- Never logged
- Never in error messages
- Never in client-side code
- Encrypted at rest
- Encrypted in transit

### Tier 2: Sensitive (High Protection)
- Personal Identifiable Information (PII): name, email, phone, address
- Financial data: invoices, transaction history
- Business confidential: pricing, contracts, internal metrics
- User-generated private content

**Requirements:**
- Access logged (audit trail)
- Tenant-isolated (RLS enforced)
- Not exposed in URLs
- Masked in logs where possible

### Tier 3: Internal (Standard Protection)
- User preferences
- Application state
- Non-sensitive metadata

**Requirements:**
- Tenant-isolated
- Standard access controls

### Tier 4: Public (Minimal Protection)
- Public profiles
- Published content
- Marketing data

**Requirements:**
- Input validation still required
- Rate limiting still required

---

## Data Classification Table

Fill this out for your project:

| Data Type | Classification | Storage | Access Control | Logging |
|-----------|---------------|---------|----------------|---------|
| User passwords | Tier 1 | Supabase Auth | Auth only | Never |
| API keys | Tier 1 | Env vars only | Server only | Never |
| User email | Tier 2 | Users table | RLS + owner | Audit |
| | | | | |
| | | | | |

---

## Secrets Management

### Rule 1: Never in Code

```typescript
// ❌ NEVER
const apiKey = 'sk_live_xxxxx'

// ✅ ALWAYS
const apiKey = process.env.STRIPE_SECRET_KEY
```

### Rule 2: Never in Git

**.gitignore must include:**
```
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

### Rule 3: Environment Variable Naming

| Prefix | Meaning | Safe in Browser? |
|--------|---------|------------------|
| `NEXT_PUBLIC_` | Exposed to client | ✅ Yes (public keys only) |
| No prefix | Server-only | ❌ No |

```bash
# ✅ Correct
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co     # Safe - just a URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                 # Safe - public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                     # Server only - secret

# ❌ Wrong - exposes secret to browser
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xxx            # NEVER DO THIS
```

### Rule 4: Where Secrets Live

| Environment | Storage | Access |
|-------------|---------|--------|
| Local | `.env.local` | Developer only |
| Staging | Vercel env vars | Team |
| Production | Vercel env vars | Limited team |

---

## Service Role Key Rules

The Supabase `service_role` key bypasses RLS. Handle with extreme care.

### ✅ Allowed Uses
- Server-side admin operations
- Webhooks that need elevated access
- Background jobs / cron
- Data migrations

### ❌ Never
- In client-side code
- In API routes called directly by users without additional auth
- Exposed in error messages
- Logged

### Pattern for Service Role

```typescript
// Only use in server-side code with additional authorization
import { createClient } from '@supabase/supabase-js'

// This function should only be called from trusted server contexts
export function getServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Service client cannot be used client-side')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

---

## Authentication Requirements

### Password Policy (if not using OAuth)
- Minimum 8 characters
- Supabase Auth handles this - don't roll your own

### Session Management
- Use Supabase Auth sessions
- Tokens expire appropriately
- Refresh tokens rotated
- Logout invalidates session

### Multi-Factor Authentication
- Offer for sensitive accounts
- Require for admin access (if applicable)

---

## Least Privilege Principle

Every user, service, and component should have the minimum access required.

### Database Level
```sql
-- ❌ Overly permissive
CREATE POLICY "allow_all" ON records USING (true);

-- ✅ Least privilege
CREATE POLICY "users_own_records" ON records
  USING (auth.uid() = user_id);
```

### API Level
```typescript
// ❌ No authorization check
export async function DELETE(req: Request, { params }) {
  await supabase.from('records').delete().eq('id', params.id)
}

// ✅ Verify ownership
export async function DELETE(req: Request, { params }) {
  const user = await getUser()
  const record = await getRecord(params.id)
  
  if (record.user_id !== user.id) {
    return new Response('Forbidden', { status: 403 })
  }
  
  await supabase.from('records').delete().eq('id', params.id)
}
```

### Role-Based Access

| Role | Can View | Can Edit | Can Delete | Can Admin |
|------|----------|----------|------------|-----------|
| Owner | All | All | All | Yes |
| Admin | All | All | Some | Limited |
| Member | Own + Shared | Own | Own | No |
| Viewer | Shared | None | None | No |

---

## Logging Requirements

### What to Log

| Event | Log Level | Include | Exclude |
|-------|-----------|---------|---------|
| Login success | INFO | user_id, timestamp, IP | password |
| Login failure | WARN | timestamp, IP, attempt count | password, username |
| Permission denied | WARN | user_id, resource, action | |
| Data access | INFO | user_id, resource_type, resource_id | actual data |
| Data modification | INFO | user_id, resource_type, action | sensitive fields |
| Error | ERROR | error type, stack trace | user data, secrets |
| Admin action | INFO | admin_id, action, target | |

### What Never to Log
- Passwords (plain or hashed)
- API keys / tokens
- Credit card numbers
- Full SSN / government IDs
- Session tokens
- PII in plain text (mask it)

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "event": "record_created",
  "user_id": "user_123",
  "tenant_id": "org_456",
  "resource_type": "invoice",
  "resource_id": "inv_789",
  "request_id": "req_abc123",
  "ip": "192.168.1.1"
}
```

---

## Audit Trail Requirements

For sensitive actions, maintain an audit trail:

### Actions to Audit
- User login/logout
- Permission changes
- Data deletion
- Settings changes
- Billing changes
- Admin actions
- Data exports

### Audit Log Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users,
  tenant_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT
);

-- RLS: Users can only see their tenant's audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_audit_access" ON audit_log
  USING (tenant_id = get_current_tenant_id());
```

---

## Input Validation

### All Inputs Must Be Validated

```typescript
import { z } from 'zod'

// Define schema
const createRecordSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  amount: z.number().positive().max(1000000),
  email: z.string().email(),
})

// Validate before processing
export async function POST(req: Request) {
  const body = await req.json()
  
  const result = createRecordSchema.safeParse(body)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  
  // Now safe to use result.data
}
```

### Sanitization

- HTML content: Use DOMPurify or similar
- SQL: Use parameterized queries (Supabase does this)
- File uploads: Validate type, size, scan for malware

---

## HTTPS Requirements

- All traffic over HTTPS (Vercel handles this)
- No mixed content (HTTP resources on HTTPS pages)
- HSTS enabled
- Secure cookies only

---

## Security Headers

Vercel provides these by default, but verify:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: [configured appropriately]
```

---

## Dependency Security

### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Check for outdated packages
npm outdated
```

### CI Integration

```yaml
# In GitHub Actions
- name: Security audit
  run: npm audit --audit-level=high
```

---

## Incident Response

### If You Discover a Breach

1. **Contain** - Disable affected accounts/services
2. **Assess** - What data was accessed? Who's affected?
3. **Notify** - Users, authorities (GDPR: 72 hours)
4. **Remediate** - Fix the vulnerability
5. **Review** - Post-mortem, update procedures

### Contact List

| Role | Contact |
|------|---------|
| Security Lead | |
| Legal | |
| Supabase Support | support@supabase.io |
| Vercel Support | |

---

## Security Checklist

Before going live:

```markdown
## Security Sign-Off

**Date**: 
**Reviewer**: 

### Secrets
- [ ] No secrets in code
- [ ] No secrets in git history
- [ ] Environment variables properly scoped
- [ ] Service role key server-only

### Access Control
- [ ] RLS enabled on all tables
- [ ] Tenant isolation verified
- [ ] Role-based access implemented
- [ ] Least privilege applied

### Authentication
- [ ] Auth flows tested
- [ ] Session management correct
- [ ] Password policy enforced

### Data Protection
- [ ] Data classified
- [ ] Sensitive data encrypted
- [ ] PII handling compliant
- [ ] Audit logging active

### Infrastructure
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Dependencies audited
- [ ] Rate limiting active

### Monitoring
- [ ] Error tracking active
- [ ] Security events logged
- [ ] Alerts configured
```
