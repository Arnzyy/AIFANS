# Deployment Guide

> **How to get your app live on the internet.** From first deployment to custom domains, SSL, and production configuration.

---

## Overview

We deploy to **Vercel** because:
- Built for Next.js (they created it)
- Automatic deployments when you push code
- Free tier is generous
- SSL/HTTPS automatic
- Preview deployments for every branch

---

## Prerequisites

Before deploying, ensure:

- [ ] App runs locally without errors (`npm run dev`)
- [ ] App builds successfully (`npm run build`)
- [ ] Environment variables documented in IMPLEMENTATION-LOG.md
- [ ] Supabase project created and configured
- [ ] Stripe account set up (if using payments)

---

## First-Time Setup

### Step 1: Push to GitHub

If not already done:

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel to access your GitHub
4. Click "Add New..." → "Project"
5. Find your repository → Click "Import"

### Step 3: Configure Project

Vercel will auto-detect Next.js. Configure:

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (leave as default unless monorepo)

**Build Command:** `npm run build` (default)

**Output Directory:** Leave empty (Next.js handles this)

### Step 4: Environment Variables

**Critical step - your app won't work without these.**

Click "Environment Variables" and add each one:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | All |
| `STRIPE_SECRET_KEY` | Your Stripe secret | All |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe public key | All |
| `STRIPE_WEBHOOK_SECRET` | (Add after webhook setup) | All |
| `NEXT_PUBLIC_APP_URL` | Your production URL | Production |

**Environment options:**
- **Production** - Live site only
- **Preview** - Branch deployments only
- **Development** - Local only (not usually needed here)
- **All** - Use same value everywhere (most common)

### Step 5: Deploy

Click "Deploy" and wait 1-3 minutes.

Vercel will:
1. Clone your repo
2. Install dependencies
3. Build the app
4. Deploy to their CDN

**Success!** You'll get a URL like `your-project.vercel.app`

---

## Understanding Vercel URLs

| URL Type | Example | When Created |
|----------|---------|--------------|
| **Production** | `your-project.vercel.app` | When you deploy `main` branch |
| **Preview** | `your-project-abc123.vercel.app` | When you push any other branch |
| **Custom Domain** | `yourapp.com` | When you configure it |

---

## Automatic Deployments

Once connected, Vercel automatically deploys:

| Action | Result |
|--------|--------|
| Push to `main` | Updates production site |
| Push to other branch | Creates preview deployment |
| Open Pull Request | Creates preview + adds link to PR |
| Merge PR to `main` | Updates production |

**No manual deploys needed** - just push code.

---

## Setting Up a Custom Domain

### Step 1: Buy a Domain

Recommended registrars:
- [Namecheap](https://namecheap.com) - Good prices
- [Cloudflare](https://cloudflare.com) - At-cost pricing
- [Google Domains](https://domains.google) (now Squarespace)
- [Vercel](https://vercel.com/domains) - Integrated

### Step 2: Add Domain in Vercel

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Enter your domain: `yourapp.com`
4. Click "Add"

### Step 3: Configure DNS

Vercel will show you DNS records to add. Go to your domain registrar's DNS settings.

**For root domain (yourapp.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 4: Wait for Propagation

DNS changes take 5 minutes to 48 hours to propagate worldwide. Usually 15-30 minutes.

Vercel will show:
- ⏳ "Pending" - Waiting for DNS
- ✅ "Valid" - Domain is working

### Step 5: SSL Certificate

Vercel automatically provisions SSL. No action needed. Your site will work with `https://`.

---

## Environment Variables by Environment

For different values in staging vs production:

### Production Values

Use production API keys:
- Live Stripe keys (`sk_live_`, `pk_live_`)
- Production Supabase project
- Production URLs

### Preview Values (Staging)

Use test API keys:
- Test Stripe keys (`sk_test_`, `pk_test_`)
- Staging Supabase project (optional)
- Preview URLs

**To set different values:**
1. Vercel Dashboard → Settings → Environment Variables
2. Click the variable
3. Set different values for "Production" vs "Preview"

---

## Supabase Configuration

### Update Allowed URLs

Go to Supabase → Authentication → URL Configuration:

**Site URL:**
```
https://yourapp.com
```

**Redirect URLs (add all of these):**
```
https://yourapp.com/**
https://www.yourapp.com/**
https://your-project.vercel.app/**
http://localhost:3000/**
```

### Why This Matters

Supabase Auth only redirects to allowed URLs. If your production URL isn't listed, login will fail.

---

## Stripe Webhook Setup

Stripe needs to notify your app when payments happen.

### Step 1: Create Webhook in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourapp.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"

### Step 2: Get Webhook Secret

After creating, click the webhook → "Reveal" signing secret.

Copy the `whsec_...` value.

### Step 3: Add to Vercel

Add environment variable:
- Name: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_...`

### Step 4: Test Webhook

In Stripe dashboard, click "Send test webhook" to verify it works.

Check Vercel logs to confirm it's received.

---

## Monitoring Your Production App

### Vercel Analytics

1. Go to project → "Analytics" tab
2. Click "Enable"
3. Add to your layout:

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Vercel Logs

View real-time logs:
1. Project → "Logs" tab
2. Filter by:
   - Level (Error, Warning, Info)
   - Source (Function, Edge, Static)
   - Time range

### Error Tracking (Recommended)

For production apps, add Sentry:

```bash
npx @sentry/wizard@latest -i nextjs
```

This catches errors you might miss in logs.

---

## Deployment Checklist

### Before First Deploy

```markdown
- [ ] App builds locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Environment variables documented
- [ ] Supabase project created
- [ ] Stripe account set up (if applicable)
```

### Vercel Configuration

```markdown
- [ ] GitHub repo connected
- [ ] Environment variables added
- [ ] Build succeeds
- [ ] Site loads at Vercel URL
```

### Domain Setup

```markdown
- [ ] Domain purchased
- [ ] Domain added in Vercel
- [ ] DNS records configured
- [ ] SSL certificate active (automatic)
- [ ] www redirects to root (or vice versa)
```

### Service Configuration

```markdown
- [ ] Supabase redirect URLs updated
- [ ] Stripe webhook created
- [ ] Webhook secret added to Vercel
- [ ] Test webhook working
```

### Final Verification

```markdown
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Payment flow works (test mode first)
- [ ] All pages load
- [ ] No console errors
- [ ] Mobile responsive
```

---

## Common Issues

### Build Fails

**Check Vercel build logs for the actual error.**

Common causes:
- TypeScript errors (stricter in build than dev)
- Missing environment variables
- Import paths case sensitivity
- Dependencies not in package.json

### "500 Internal Server Error"

Check Vercel logs → Functions to see the actual error.

Common causes:
- Missing environment variables
- Database connection issues
- Unhandled exceptions in API routes

### Supabase Auth Not Working

1. Check redirect URLs in Supabase dashboard
2. Verify Site URL is set correctly
3. Check NEXT_PUBLIC_SUPABASE_URL is correct in Vercel

### Stripe Webhooks Not Received

1. Check webhook URL matches your API route exactly
2. Verify webhook secret is correct in Vercel
3. Check Vercel logs for the webhook route
4. Ensure your API route returns 200 status

### "Module not found" in Production

The server is case-sensitive. Check:
- `import { Button } from '@/components/button'`
- File is actually named `button.tsx` not `Button.tsx`

---

## Going Live Checklist

### Content Ready

```markdown
- [ ] Privacy Policy page exists
- [ ] Terms of Service page exists
- [ ] Contact information available
- [ ] All placeholder text replaced
- [ ] Real images (not placeholders)
```

### SEO Basics

```markdown
- [ ] Page titles set
- [ ] Meta descriptions set
- [ ] Open Graph images for social sharing
- [ ] favicon.ico uploaded
- [ ] robots.txt allows indexing (or blocks if not ready)
```

### Performance

```markdown
- [ ] Images optimized (use next/image)
- [ ] No massive bundle size
- [ ] Reasonable load time (<3 seconds)
```

### Security

```markdown
- [ ] No secrets in client code
- [ ] RLS policies active
- [ ] HTTPS working
- [ ] Error messages don't leak info
```

### Legal (if charging money)

```markdown
- [ ] Privacy Policy updated
- [ ] Terms of Service updated
- [ ] Cookie consent (if applicable)
- [ ] Refund policy clear
```

---

## Rollback if Something Goes Wrong

### Quick Rollback in Vercel

1. Go to Deployments tab
2. Find the last working deployment
3. Click "..." → "Promote to Production"

This instantly rolls back to a previous version.

### Preventing Bad Deploys

1. **Use Preview Deployments** - Test on branch before merging to main
2. **Check build logs** - Even if deploy succeeds, check for warnings
3. **Test critical paths** - After deploy, test signup, login, payment

---

## Costs

### Vercel

| Tier | Cost | Includes |
|------|------|----------|
| Hobby | Free | 100GB bandwidth, 100 deployments/day |
| Pro | $20/mo | 1TB bandwidth, team features, analytics |

Most indie apps fit on Hobby tier.

### Supabase

| Tier | Cost | Includes |
|------|------|----------|
| Free | $0 | 500MB database, 50K auth users |
| Pro | $25/mo | 8GB database, unlimited auth, daily backups |

### Domain

- `.com`: ~$10-15/year
- `.io`: ~$30-50/year
- `.dev`: ~$12-20/year

### Total Cost to Launch

| Tier | Monthly Cost |
|------|--------------|
| Minimum viable | $0 + domain |
| Comfortable | $45/mo (Vercel Pro + Supabase Pro) |
| Scale | $100+/mo |

---

## Quick Reference

### Deploy Manually (if needed)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (will prompt for project)
vercel

# Deploy to production
vercel --prod
```

### Check Build Locally

```bash
# Build exactly as Vercel does
npm run build

# Then test the production build
npm run start
```

### Environment Variable Commands

```bash
# List all env vars (Vercel CLI)
vercel env ls

# Pull env vars to local .env
vercel env pull
```

### Force Redeploy

If something's stuck:
1. Make a tiny change (add a comment)
2. Commit and push
3. Or: Vercel Dashboard → Deployments → "..." → "Redeploy"
