# ZIP-FF: Feature Flags Admin Panel

> **Estimated Time**: 30 minutes
> **Dependencies**: Admin panel exists, Supabase configured
> **Status**: Complete

---

## RULES FOR THIS ZIP

1. **NO NEW CONCEPTS**: Only adds DB-backed feature flags to existing admin
2. **NO SCOPE CREEP**: Just toggles, whitelists, rollout % — no A/B test UI
3. **NO PREMATURE ABSTRACTION**: Simple key-value flags, not a full feature management system
4. **ASK, DON'T ASSUME**: Unclear? Ask before implementing

---

## ENTRY CRITERIA

DO NOT start this ZIP until:

- [x] Admin panel exists at `/admin/settings`
- [x] Supabase configured with service role key
- [x] `user_roles` table exists with admin role check
- [x] `audit_log` table exists for change tracking
- [x] App builds locally with zero TypeScript errors

---

## PURPOSE

Allow admins to toggle feature flags from the admin panel instead of changing hardcoded values and redeploying.

**What this enables:**
- Turn enhanced chat ON/OFF without code changes
- Gradual rollout via percentage slider
- Test with specific creators/users via whitelists
- All changes logged to audit trail

---

## WHAT THIS ZIP IS NOT

This ZIP does NOT:
- Add new feature flags (only migrates existing ones to DB)
- Create A/B testing UI (flags support it, UI is future ZIP)
- Add flag analytics/reporting dashboard
- Support scheduled flag changes
- Add flag dependencies or complex rules

---

## DATABASE CHANGES

Run in Supabase SQL Editor:

```sql
-- ===========================================
-- FEATURE FLAGS TABLE
-- Admin-controllable feature toggles
-- ===========================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- For percentage rollouts
  rollout_percent INTEGER DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  
  -- For whitelist-based rollouts (stored as JSONB arrays)
  creator_whitelist JSONB DEFAULT '[]'::jsonb,
  user_whitelist JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write feature flags
CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Service role has full access (for backend reads)
CREATE POLICY "Service role full access to feature flags" ON feature_flags
  FOR ALL
  USING (auth.role() = 'service_role');

-- ===========================================
-- SEED DEFAULT FLAGS
-- ===========================================

INSERT INTO feature_flags (id, name, description, enabled, rollout_percent, category) VALUES
  (
    'enhanced_chat',
    'Enhanced Chat System',
    'Enables conversation state tracking, smart memory injection, user preference learning, and dynamic few-shot examples',
    false,
    0,
    'chat'
  ),
  (
    'analytics_logging',
    'Analytics Logging',
    'Collect message analytics data (can be enabled independently of enhanced chat)',
    true,
    100,
    'analytics'
  )
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- AUDIT LOG TRIGGER
-- ===========================================

CREATE OR REPLACE FUNCTION log_feature_flag_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'feature_flag_updated',
    'feature_flag',
    NEW.id,
    jsonb_build_object(
      'flag_name', NEW.name,
      'enabled', NEW.enabled,
      'rollout_percent', NEW.rollout_percent,
      'previous_enabled', OLD.enabled,
      'previous_rollout_percent', OLD.rollout_percent
    )
  );
  
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER feature_flag_audit_trigger
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION log_feature_flag_change();
```

**Verify table exists:**
```sql
SELECT * FROM feature_flags;
-- Should return 2 rows: enhanced_chat, analytics_logging
```

---

## FILES TO CREATE/MODIFY

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `app/api/admin/feature-flags/route.ts` | GET/POST API endpoint |
| CREATE | `components/admin/FeatureFlagsSettings.tsx` | Admin UI component |
| CREATE | `lib/config/feature-flags.ts` | DB-backed flag service (replaces hardcoded) |
| MODIFY | `app/admin/settings/page.tsx` | Import and render FeatureFlagsSettings |

---

## IMPLEMENTATION

### File 1: `app/api/admin/feature-flags/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percent: number;
  creator_whitelist: string[];
  user_whitelist: string[];
  category: string;
  updated_at: string;
}

// GET - Fetch all feature flags
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ flags: flags || [] });
  } catch (error: any) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Update a feature flag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, enabled, rollout_percent, creator_whitelist, user_whitelist } = body;

    if (!id) {
      return NextResponse.json({ error: 'Flag ID required' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (typeof enabled === 'boolean') {
      updates.enabled = enabled;
    }
    if (typeof rollout_percent === 'number') {
      updates.rollout_percent = Math.max(0, Math.min(100, rollout_percent));
    }
    if (Array.isArray(creator_whitelist)) {
      updates.creator_whitelist = creator_whitelist;
    }
    if (Array.isArray(user_whitelist)) {
      updates.user_whitelist = user_whitelist;
    }

    const { data: flag, error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ flag });
  } catch (error: any) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### File 2: `components/admin/FeatureFlagsSettings.tsx`

See: `/mnt/user-data/outputs/lyra-improvements/src/components/admin/FeatureFlagsSettings.tsx`

(235 lines - full React component with toggles, sliders, whitelist management)

### File 3: `lib/config/feature-flags.ts`

See: `/mnt/user-data/outputs/lyra-improvements/src/config/feature-flags-db.ts`

(220 lines - DB-backed flags with 30s caching, fallbacks, sync/async helpers)

### File 4: Modify `app/admin/settings/page.tsx`

Add import and component:

```typescript
// Add to imports
import FeatureFlagsSettings from '@/components/admin/FeatureFlagsSettings';

// Add in JSX (between existing settings sections)
<FeatureFlagsSettings />
```

---

## EXIT CRITERIA

This ZIP is COMPLETE when:

- [ ] `feature_flags` table exists with 2 seed rows
- [ ] `/api/admin/feature-flags` returns flags for admin users
- [ ] `/api/admin/feature-flags` rejects non-admin users (403)
- [ ] Settings page shows Feature Flags section
- [ ] Toggle switch changes `enabled` in database
- [ ] Slider changes `rollout_percent` in database
- [ ] Can add/remove UUIDs from whitelists
- [ ] Changes appear in audit_log table
- [ ] Testing checklist 100% passed
- [ ] No console errors
- [ ] No TypeScript errors

---

## TESTING CHECKLIST

### API Tests
- [ ] GET `/api/admin/feature-flags` returns 401 when not logged in
- [ ] GET `/api/admin/feature-flags` returns 403 for non-admin user
- [ ] GET `/api/admin/feature-flags` returns flags array for admin
- [ ] POST updates flag and returns updated flag
- [ ] POST with invalid ID returns error

### UI Tests
- [ ] Feature Flags section appears on Settings page
- [ ] Both flags (enhanced_chat, analytics_logging) displayed
- [ ] Toggle switch visually changes on click
- [ ] Toggle updates database (check Supabase dashboard)
- [ ] Expand/collapse shows rollout options
- [ ] Slider moves and shows percentage
- [ ] Can add creator UUID to whitelist
- [ ] Can remove creator UUID from whitelist
- [ ] Can add user UUID to whitelist
- [ ] Can remove user UUID from whitelist
- [ ] Loading state shows spinner
- [ ] Refresh button reloads flags

### Integration Tests
- [ ] Change flag → Check `shouldUseEnhancedChat()` returns correct value
- [ ] Add user to whitelist → That user gets enhanced chat
- [ ] Set rollout to 50% → ~Half of users get enhanced chat

### Audit Tests
- [ ] Toggle flag → Check audit_log has new entry
- [ ] Entry shows previous and new values

---

## GOLDEN PATH TEST

After this ZIP, verify:

```
1. Log in as admin
2. Go to /admin/settings
3. See Feature Flags section
4. Toggle "Enhanced Chat System" ON
5. Verify database shows enabled=true
6. Toggle OFF
7. Verify database shows enabled=false
8. Check audit_log has 2 new entries
```

---

## CLAUDE CODE PROMPT

```
I need to add feature flags to my LYRA admin panel.

Current state:
- Admin panel exists at /admin/settings
- Using Supabase with user_roles table for admin check
- audit_log table exists

Files to reference:
- /mnt/user-data/outputs/lyra-improvements/database/feature-flags-migration.sql
- /mnt/user-data/outputs/lyra-improvements/src/api/admin/feature-flags/route.ts
- /mnt/user-data/outputs/lyra-improvements/src/components/admin/FeatureFlagsSettings.tsx
- /mnt/user-data/outputs/lyra-improvements/src/config/feature-flags-db.ts

Steps:
1. Run the migration SQL in Supabase
2. Copy route.ts to app/api/admin/feature-flags/route.ts
3. Copy FeatureFlagsSettings.tsx to components/admin/
4. Copy feature-flags-db.ts to lib/config/feature-flags.ts
5. Import FeatureFlagsSettings in app/admin/settings/page.tsx
6. Update any imports from old feature-flags.ts to use new one

Do not modify existing admin panel structure. Just add the new component.
```

---

## FILES DELIVERED

| File | Location |
|------|----------|
| Migration SQL | `/mnt/user-data/outputs/lyra-improvements/database/feature-flags-migration.sql` |
| API Route | `/mnt/user-data/outputs/lyra-improvements/src/api/admin/feature-flags/route.ts` |
| UI Component | `/mnt/user-data/outputs/lyra-improvements/src/components/admin/FeatureFlagsSettings.tsx` |
| Flag Service | `/mnt/user-data/outputs/lyra-improvements/src/config/feature-flags-db.ts` |
| This ZIP | `/mnt/user-data/outputs/lyra-improvements/docs/zips/ZIP-FF-FEATURE-FLAGS.md` |
