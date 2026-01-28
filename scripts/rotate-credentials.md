# Credential Rotation Checklist

**⚠️ CRITICAL**: The production readiness audit found exposed credentials in `.env.local`. You MUST rotate all credentials immediately.

**Date**: _________________
**Performed by**: _________________

---

## Step 1: Verify .env.local is Not in Git History

```bash
# Check if .env.local was ever committed
git log --all --full-history --source --remotes -- .env.local

# If results found, remove from git history:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Coordinate with team)
git push --force --all
git push --force --tags
```

**Status**: [ ] Completed - .env.local removed from git history

---

## Step 2: Rotate Supabase Keys

### 2.1 Generate New Keys

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Project Settings** → **API**
4. Click **Reset** next to:
   - [ ] `anon` key (public)
   - [ ] `service_role` key (secret)

### 2.2 Update Environment Variables

**Development (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[NEW_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[NEW_SERVICE_ROLE_KEY]
```

**Production (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit each variable:
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Update with new anon key
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` → Update with new service role key
3. Redeploy: `vercel --prod`

**Status**: [ ] Supabase keys rotated and updated

---

## Step 3: Rotate Cloudflare R2 Keys

### 3.1 Generate New Keys

1. Go to https://dash.cloudflare.com
2. Navigate to **R2** → **Manage R2 API Tokens**
3. Create new API token:
   - Name: `aifans-r2-token-[DATE]`
   - Permissions: `Admin Read & Write`
   - [ ] Copy `Access Key ID`
   - [ ] Copy `Secret Access Key`

### 3.2 Update Environment Variables

**Development (.env.local):**
```bash
R2_ACCOUNT_ID=[UNCHANGED]
R2_ACCESS_KEY_ID=[NEW_ACCESS_KEY_ID]
R2_SECRET_ACCESS_KEY=[NEW_SECRET_ACCESS_KEY]
R2_BUCKET_NAME=aifans-media
R2_PUBLIC_URL=[UNCHANGED]
```

**Production (Vercel):**
1. Update environment variables:
   - [ ] `R2_ACCESS_KEY_ID` → New access key
   - [ ] `R2_SECRET_ACCESS_KEY` → New secret key
2. Redeploy: `vercel --prod`

### 3.3 Revoke Old Keys

1. Go back to Cloudflare R2 → API Tokens
2. Delete the old token:
   - [ ] Old token revoked (confirm it's not the new one!)

**Status**: [ ] R2 keys rotated and old keys revoked

---

## Step 4: Rotate Stripe Keys (If Exposed)

**⚠️ Only if webhook secret was exposed**

### 4.1 Generate New Webhook Secret

1. Go to https://dashboard.stripe.com
2. Navigate to **Developers** → **Webhooks**
3. Click on your webhook endpoint
4. Click **Roll secret**
5. [ ] Copy new webhook secret

### 4.2 Update Environment Variables

**Development (.env.local):**
```bash
STRIPE_WEBHOOK_SECRET=[NEW_WEBHOOK_SECRET]
```

**Production (Vercel):**
1. Update `STRIPE_WEBHOOK_SECRET` environment variable
2. Redeploy: `vercel --prod`

**Status**: [ ] Stripe webhook secret rotated (if needed)

---

## Step 5: Generate Encryption Key (If Not Set)

```bash
# Generate a secure 32-byte key
openssl rand -base64 32
```

Copy the output and add to environment variables:

**Development (.env.local):**
```bash
ENCRYPTION_KEY=[GENERATED_KEY]
```

**Production (Vercel):**
1. Add new environment variable `ENCRYPTION_KEY`
2. Redeploy: `vercel --prod`

**Status**: [ ] Encryption key generated and set

---

## Step 6: Verify Old Credentials Don't Work

### Test Supabase Old Keys

```bash
# Try to connect with old anon key (should fail)
curl https://[your-project].supabase.co/rest/v1/profiles \
  -H "apikey: [OLD_ANON_KEY]" \
  -H "Authorization: Bearer [OLD_ANON_KEY]"

# Expected: 401 Unauthorized or Invalid API key
```

**Status**: [ ] Old Supabase keys confirmed invalid

### Test R2 Old Keys

```bash
# Try to list R2 bucket with old keys (should fail)
# Use AWS CLI or test via application
```

**Status**: [ ] Old R2 keys confirmed invalid

---

## Step 7: Update .gitignore (Verify)

Ensure `.env.local` is ignored:

```bash
# Check .gitignore contains these patterns
cat .gitignore | grep -E "\.env\*\.local|\.env\*"

# Should show:
# .env*.local
# .env*
```

**Status**: [ ] .gitignore verified

---

## Step 8: Commit Changes

```bash
git add .env.example scripts/rotate-credentials.md
git commit -m "security: rotate credentials and update .env.example

- Add ENCRYPTION_KEY to .env.example
- Add UPSTASH_REDIS credentials to .env.example
- Document credential rotation process"

git push origin main
```

**Status**: [ ] Changes committed

---

## Step 9: Test Application

After rotating all credentials:

1. **Development:**
   ```bash
   npm run dev
   ```
   - [ ] App starts without errors
   - [ ] Can authenticate (login/signup works)
   - [ ] Can upload images (R2 works)
   - [ ] Stripe checkout works (if configured)

2. **Production:**
   - [ ] Deployed successfully
   - [ ] Login/signup works
   - [ ] Image uploads work
   - [ ] No console errors about authentication

**Status**: [ ] Application tested and working

---

## Step 10: Update Documentation

Update `Docs/IMPLEMENTATION-LOG.md`:

```markdown
## Known Issues

| Issue | Severity | ZIP to fix |
|-------|----------|------------|
| ~~Exposed credentials in .env.local~~ | ~~High~~ | ✅ FIXED |
```

**Status**: [ ] Documentation updated

---

## Final Checklist

- [ ] .env.local removed from git history
- [ ] Supabase anon key rotated
- [ ] Supabase service role key rotated
- [ ] Old Supabase keys verified invalid
- [ ] R2 access keys rotated
- [ ] Old R2 keys revoked
- [ ] Stripe webhook secret rotated (if needed)
- [ ] Encryption key generated
- [ ] All production env vars updated in Vercel
- [ ] Production redeployed
- [ ] Old credentials confirmed invalid
- [ ] Application tested (dev & prod)
- [ ] Documentation updated
- [ ] Team notified of credential rotation

---

## Notes

**Date Completed**: _________________
**Issues Encountered**: _________________
**Next Review Date**: _________________ (recommend: 90 days)

---

## Emergency Rollback

If something breaks after rotation:

1. **Check logs**: `vercel logs --prod` or Supabase logs
2. **Verify env vars**: Ensure no typos in new keys
3. **Temporary rollback**: Can briefly use old keys while debugging (NOT RECOMMENDED)
4. **Contact support**:
   - Supabase: https://supabase.com/dashboard/support
   - Cloudflare: https://dash.cloudflare.com/?to=/:account/support

---

**Security Note**: Keep this checklist in a secure location. Do not commit actual credential values to git.
