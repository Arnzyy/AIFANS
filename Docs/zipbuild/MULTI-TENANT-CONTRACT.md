# Multi-Tenant Contract

> **Universal rules for tenant isolation.** If your app has organizations/teams/workspaces, this is non-negotiable.

---

## The Contract

Every multi-tenant application MUST enforce these rules:

```
1. Every table with tenant-specific data has a tenant_id column
2. Every query path is tenant-scoped (via RLS, not application code)
3. Database-level policies enforce isolation (not just app code)
4. Cross-tenant access is impossible by design, not by discipline
```

---

## Rule 1: Every Table Has tenant_id

### Schema Pattern

```sql
-- Every tenant-scoped table follows this pattern
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_records_tenant_id ON records(tenant_id);
```

### Tenant Table

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{}'
);
```

### User-Tenant Membership

```sql
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
```

---

## Rule 2: RLS Enforces Isolation

### Helper Function

```sql
-- Get current user's tenant(s)
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tenant_id)
  FROM tenant_members
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user belongs to a tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### RLS Policy Pattern

```sql
-- Enable RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see their tenant's data
CREATE POLICY "tenant_isolation_select" ON records
  FOR SELECT
  USING (user_belongs_to_tenant(tenant_id));

-- INSERT: Users can only create in their tenant
CREATE POLICY "tenant_isolation_insert" ON records
  FOR INSERT
  WITH CHECK (user_belongs_to_tenant(tenant_id));

-- UPDATE: Users can only update their tenant's data
CREATE POLICY "tenant_isolation_update" ON records
  FOR UPDATE
  USING (user_belongs_to_tenant(tenant_id))
  WITH CHECK (user_belongs_to_tenant(tenant_id));

-- DELETE: Users can only delete their tenant's data
CREATE POLICY "tenant_isolation_delete" ON records
  FOR DELETE
  USING (user_belongs_to_tenant(tenant_id));
```

---

## Rule 3: Never Trust Application Code Alone

### ❌ Wrong: Filtering in Application Code

```typescript
// This is NOT sufficient - relies on developer remembering
async function getRecords(tenantId: string) {
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('tenant_id', tenantId)  // What if someone forgets this?
  
  return data
}
```

### ✅ Right: Database Enforces It

```typescript
// RLS automatically filters - impossible to see other tenants
async function getRecords() {
  const { data } = await supabase
    .from('records')
    .select('*')
  // RLS policy automatically filters to user's tenant(s)
  
  return data
}
```

### Why This Matters

- Developers make mistakes
- Tired developers forget `.eq('tenant_id', ...)`
- New team members might not know the pattern
- RLS ALWAYS enforces, even if code is wrong

---

## Rule 4: Test Tenant Isolation

### The Definitive Test

```typescript
describe('Tenant Isolation', () => {
  let tenantA: Tenant
  let tenantB: Tenant
  let userA: User  // belongs to Tenant A
  let userB: User  // belongs to Tenant B
  let recordInA: Record
  
  beforeAll(async () => {
    // Setup
    tenantA = await createTenant('A')
    tenantB = await createTenant('B')
    userA = await createUser(tenantA)
    userB = await createUser(tenantB)
    recordInA = await createRecord(tenantA, userA, { name: 'Secret' })
  })
  
  it('SELECT: User B cannot read Tenant A data', async () => {
    const client = createClientAs(userB)
    
    const { data } = await client
      .from('records')
      .select('*')
      .eq('id', recordInA.id)
      .single()
    
    expect(data).toBeNull()
  })
  
  it('UPDATE: User B cannot modify Tenant A data', async () => {
    const client = createClientAs(userB)
    
    const { error } = await client
      .from('records')
      .update({ name: 'Hacked' })
      .eq('id', recordInA.id)
    
    expect(error).toBeTruthy()
  })
  
  it('DELETE: User B cannot delete Tenant A data', async () => {
    const client = createClientAs(userB)
    
    const { error } = await client
      .from('records')
      .delete()
      .eq('id', recordInA.id)
    
    expect(error).toBeTruthy()
    
    // Verify record still exists
    const { data } = await createClientAs(userA)
      .from('records')
      .select('*')
      .eq('id', recordInA.id)
      .single()
    
    expect(data).not.toBeNull()
  })
  
  it('INSERT: User B cannot create in Tenant A', async () => {
    const client = createClientAs(userB)
    
    const { error } = await client
      .from('records')
      .insert({
        tenant_id: tenantA.id,  // Trying to insert into wrong tenant
        name: 'Malicious'
      })
    
    expect(error).toBeTruthy()
  })
})
```

### Run This Test For EVERY Tenant-Scoped Table

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| records | ▢ Pass | ▢ Pass | ▢ Pass | ▢ Pass |
| documents | ▢ Pass | ▢ Pass | ▢ Pass | ▢ Pass |
| settings | ▢ Pass | ▢ Pass | ▢ Pass | ▢ Pass |
| | | | | |

---

## Tenant Context Patterns

### Pattern A: Current Tenant in Context

```typescript
// middleware.ts - set tenant from subdomain or header
export function middleware(request: NextRequest) {
  const tenant = getTenantFromRequest(request)
  
  // Pass to API routes
  request.headers.set('x-tenant-id', tenant.id)
}
```

### Pattern B: User Selects Tenant

```typescript
// For users in multiple tenants
'use client'

function TenantSwitcher() {
  const { tenants, currentTenant, switchTenant } = useTenantContext()
  
  return (
    <Select value={currentTenant.id} onValueChange={switchTenant}>
      {tenants.map(t => (
        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
      ))}
    </Select>
  )
}
```

### Pattern C: Tenant from URL

```typescript
// app/[tenant]/dashboard/page.tsx
export default async function Dashboard({ params }) {
  const tenant = await getTenantBySlug(params.tenant)
  
  if (!tenant) notFound()
  if (!await userBelongsToTenant(tenant.id)) redirect('/unauthorized')
  
  return <DashboardContent tenant={tenant} />
}
```

---

## Common Mistakes

### Mistake 1: Forgetting RLS on New Tables

```sql
-- ❌ Forgot to enable RLS
CREATE TABLE new_feature (...);

-- ✅ Always enable + add policies
CREATE TABLE new_feature (...);
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON new_feature ...;
```

### Mistake 2: Service Role Bypasses RLS

```typescript
// ❌ Using service role client-side
const supabase = createClient(url, serviceRoleKey)
// This bypasses ALL RLS - never use client-side

// ✅ Use anon key client-side
const supabase = createClient(url, anonKey)
// RLS is enforced
```

### Mistake 3: Overly Permissive Policies

```sql
-- ❌ This allows anyone to read everything
CREATE POLICY "public_read" ON records
  FOR SELECT USING (true);

-- ✅ Restrict to tenant
CREATE POLICY "tenant_read" ON records
  FOR SELECT USING (user_belongs_to_tenant(tenant_id));
```

### Mistake 4: No Policy for a Specific Operation

```sql
-- If you have policies for SELECT, INSERT, UPDATE but forgot DELETE:
-- RLS will DENY all deletes (safe by default)
-- But you should explicitly define all four
```

---

## Checklist

Before shipping any multi-tenant feature:

```markdown
## Multi-Tenant Checklist

### Schema
- [ ] Table has tenant_id column
- [ ] Foreign key to tenants table
- [ ] Index on tenant_id
- [ ] ON DELETE CASCADE configured

### RLS
- [ ] RLS enabled on table
- [ ] SELECT policy exists
- [ ] INSERT policy exists
- [ ] UPDATE policy exists
- [ ] DELETE policy exists
- [ ] All policies use tenant check function

### Testing
- [ ] Cross-tenant SELECT denied
- [ ] Cross-tenant INSERT denied
- [ ] Cross-tenant UPDATE denied
- [ ] Cross-tenant DELETE denied

### Code Review
- [ ] No service_role key in client code
- [ ] No USING (true) policies
- [ ] No SECURITY DEFINER without justification
```

---

## The Bottom Line

**Tenant isolation is not optional for multi-tenant apps.**

If User A can see User B's data, you have a critical security vulnerability.

Test it. Automate the tests. Run them on every deploy.
