# ZipBuild Project — Claude Code Configuration

> **Claude Code reads this file automatically when you open the project.**
> **Read this ENTIRE file before responding to the user.**

---

## Project State Detection

**Claude: Detect the project state FIRST. Do NOT ask the user — figure it out yourself.**

Run these checks silently:

### State 0: UNCONFIGURED (Fresh Install)

**Detection:** ANY of these are true:
- `node_modules/` does not exist
- `.env.local` does not exist
- `.env.local` exists but contains only placeholder values (e.g., `your-anon-key`)

**Action:** Run the Setup Flow below. Walk the user through setup ONE STEP AT A TIME. Do not dump all steps at once.

---

### State 1: CONFIGURED — Ready to Plan

**Detection:** ALL of these are true:
- `node_modules/` exists
- `.env.local` exists with real values (not placeholders)
- Dev server can start (`npm run dev` works)
- `/docs/zips/` is empty (only `.gitkeep`)
- No `APP-SPECIFICATION.md` or `MASTER-PLAN.md` exists

**What the user says:** "start", "begin", "let's go", or anything indicating they want to begin.

**Action:** Read `/docs/ONBOARDING.md` and begin Discovery phase.

---

### State 1b: EXISTING PROJECT

**What the user says:** "bootstrap"

**Action:** Read `/docs/zipbuild/EXISTING-PROJECT-BOOTSTRAP.md` and begin audit.

---

### State 2: MID-BUILD

**Detection:**
- `/docs/IMPLEMENTATION-LOG.md` has at least one ZIP entry
- ZIP files exist in `/docs/zips/`
- Not all ZIPs are marked complete

**What the user says:** "Let's build ZIP-XX" or anything about continuing.

**Action:** Read the ZIP file at `/docs/zips/ZIP-XX.md`. Check IMPLEMENTATION-LOG.md for progress. If the previous ZIP was just completed, run the Testing Gate (see below) before starting the next one.

---

### State 3: ALL ZIPs COMPLETE — Pre-Deploy

**Detection:**
- All ZIPs in `/docs/zips/` are marked complete in IMPLEMENTATION-LOG.md
- App is not deployed (no production URL in IMPLEMENTATION-LOG.md)

**Action:** Run the Ship Checklist (see below), then guide them through deployment using `/docs/guides/DEPLOYMENT-GUIDE.md`.

---

### State 4: DEPLOYED

**Detection:**
- Production URL exists in IMPLEMENTATION-LOG.md
- All ZIPs complete

**Action:** Ask what they want to work on — new features, bug fixes, or optimizations. Treat each as a new ZIP.

---

### Special States

**User says "audit"** → Read `/docs/PROJECT-AUDIT.md` and run the audit framework.

**User says "red team this"** → Read `/docs/prompts/RED-TEAM-PROMPT.md` and attack the current plan.

**User says "reset"** → Read `/docs/prompts/RESET-PROMPT.md` and re-orient.

---

## Setup Flow (State 0)

When you detect State 0, guide the user step by step. ONE step at a time. Confirm each works before moving on.

### Step 1: Install Dependencies

```bash
npm install
```

> "Dependencies installed. You should see a `node_modules/` folder now. Good?"

### Step 2: Create Environment File

```bash
cp .env.example .env.local
```

Then walk them through each service ONE AT A TIME:

**Supabase first:**
> "We need your Supabase credentials. Do you have a Supabase project? If not, go to supabase.com, create a free account, and create a new project. Then come back with:
> - Your project URL (Settings → API → Project URL)
> - Your anon/public key (Settings → API → anon key)
> - Your service role key (Settings → API → service_role key)
>
> Paste them here and I'll update your .env.local."

**Then Stripe:**
> "Next, Stripe. Go to stripe.com, create an account or sign in, then go to Developers → API keys. Copy your test keys (the ones starting with `pk_test_` and `sk_test_`). We'll switch to live keys when you deploy."

**Then Resend (optional at setup):**
> "Finally, for email: go to resend.com, create an account, get an API key. If you want to skip this for now, that's fine — emails won't send but everything else will work."

### Step 3: Run Database Migration

**Try Supabase CLI first (preferred):**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

> "I'll run the database migration using the Supabase CLI. You'll need your project reference ID — it's the part of your Supabase URL between `https://` and `.supabase.co`. For example, if your URL is `https://abcdefg.supabase.co`, the ref is `abcdefg`."

If the CLI works, it pushes all migrations from `/supabase/migrations/` automatically.

**Fallback (if CLI has issues):**

> "The CLI isn't cooperating. No problem — we'll do it manually. Go to your Supabase dashboard → SQL Editor → click 'New query' → paste the contents of `supabase/migrations/00001_initial.sql` → click Run."
>
> "This creates your profiles table, RLS policies, and the auto-signup trigger. Let me know when it's done — if you get an error, copy the error message and paste it here."

### Step 4: Verify the App

```bash
npm run dev
```

> "Open http://localhost:3000 in your browser. You should see the landing page. Tell me what you see — or send a screenshot."

If it works:
> "Your app is running. Try clicking Sign Up to make sure auth works. Once you've confirmed the landing page loads, we're ready to start planning what to build."

If it doesn't work, use the Debugging Playbook below.

### Step 5: Initial Git Commit

The user should have cloned a GitHub repo before starting. Check if this is a git repo:

```bash
git status
```

If it IS a git repo:
```bash
git add -A
git commit -m "Initial commit: ZipBuild starter"
git push origin main
```

> "Your project is committed and pushed to GitHub. This means we have version control from the start, and deploying to Vercel later will be easy."

If it is NOT a git repo, ask if they want to set one up:
> "I notice this isn't connected to GitHub yet. Would you like to set that up now? It'll make deployment easier later. If you want to skip it for now, we can do it before you deploy."

### Step 6: Update IMPLEMENTATION-LOG.md

Log that setup is complete. Update the Environment Variables section with what's configured.

Then transition to State 1: "Now let's figure out what you're building. Say 'start' when you're ready."

---

## Project Identity

**Name**: [Set during onboarding]
**One-liner**: [Set during onboarding]
**Current ZIP**: [Updated as you build]

---

## Pre-Flight Checklist

Before writing ANY code, read these files in order:

### Always Read
1. `/docs/DECISIONS.md` — What's been decided
2. `/docs/IMPLEMENTATION-LOG.md` — What exists
3. `/docs/TECHNICAL-FLUENCY.md` — System understanding
4. Current ZIP file in `/docs/zips/`

### Read When Relevant
5. `/docs/zipbuild/CLAUDE-CODE-RULES.md` — Hard rules (read on first session)
6. `/docs/zipbuild/QUALITY-GATES.md` — Definition of Done (before completing any ZIP)
7. `/docs/zipbuild/FRONTEND-DESIGN-SKILL.md` — If doing UI work
8. `/docs/zipbuild/SECURITY-BASELINE.md` — If doing auth/data/API work
9. `/docs/zipbuild/MULTI-TENANT-CONTRACT.md` — If doing tenant-scoped work
10. `/docs/zipbuild/TEST-PLAN.md` — Before marking any ZIP complete
11. `/docs/zipbuild/GOLDEN-PATHS.md` — Code patterns to follow

---

## Testing Gate — Between Every ZIP

**This is mandatory. NEVER skip. NEVER auto-advance to the next ZIP.**

After you finish the code for a ZIP, run this gate:

### Step 1: Self-Check Quality Gates

Read `/docs/zipbuild/QUALITY-GATES.md`. Verify all gates pass for this ZIP. If any fail, fix them before presenting to the user.

### Step 2: Tell the User What to Test

Be SPECIFIC. Give exact actions and expected results. Never say "test the feature."

Example:
> "ZIP-02 is built. Before we move on, let's verify it works:
>
> 1. Go to localhost:3000/signup
> 2. Enter a test email and password → click Sign Up
> 3. Check your email for the verification link → click it
> 4. You should be redirected to /dashboard
> 5. Click the profile icon → Sign Out
> 6. Try logging back in with the same credentials
>
> Does all of that work? If anything looks off, send me a screenshot or copy the error."

### Step 3: Wait for Confirmation

Do NOT proceed until the user explicitly confirms. Acceptable: "works", "looks good", "all passed", "yes", etc.

If they go silent:
> "Have you had a chance to test those items? Let me know what you see."

### Step 4: If Something Is Broken

Use the Debugging Playbook below. The cycle is:
1. Ask for evidence (don't guess)
2. Diagnose (read the code, trace the logic)
3. Fix ONE thing
4. Have them re-test THAT specific thing
5. Repeat until clean

### Step 5: Log Completion

Update `/docs/IMPLEMENTATION-LOG.md` with:
- ZIP status: COMPLETE
- Date completed
- What was built
- Issues found during testing and how they were resolved
- Test results

Also update `/docs/TECHNICAL-FLUENCY.md` if new concepts, bugs, or decisions were involved.

### Step 6: Announce Next ZIP

> "ZIP-XX is done and verified ✅
>
> Next up is ZIP-YY: [name]. Here's what it covers: [brief summary].
> Ready to continue, or want a break?"

---

## Debugging Playbook

When something breaks, guide the user to give you evidence. **Never guess. Always ask first.**

> Full debugging techniques and examples are in `/docs/guides/DEBUGGING-GUIDE.md`. Reference it when you need detailed patterns.

### Quick Reference — What to Ask For

**UI/Visual Issues:**
> "Send me a screenshot of what you're seeing."

**Browser Errors:**
> "Open browser dev tools (right-click → Inspect → Console tab). Copy any red error messages and paste them here."

**Terminal/Server Errors:**
> "Check the terminal where `npm run dev` is running. Copy the error and paste it here — even if it looks like gibberish."

**Build Errors:**
> "Run `npm run build` and paste the output."

**API/Network Errors:**
> "Open dev tools → Network tab → try the action again → click the red/failed request → Response tab → copy what's there."

**Auth Issues:**
> "Check Supabase dashboard → Authentication → Users. Is the user there? Also check Authentication → URL Configuration — is localhost:3000 in the redirect URLs?"

**Stripe Issues:**
> "Check Stripe dashboard → Developers → Events. Find the recent event. What's its status?"

**Database Issues:**
> "In Supabase SQL Editor, run: `SELECT * FROM [table] ORDER BY created_at DESC LIMIT 5;` and paste the result."

**Production/Vercel Issues:**
> "Vercel dashboard → Deployments → click latest → Build Logs for build errors, or Logs tab for runtime errors. Copy what you see."

### Debugging Rules

1. Ask for the error first — don't guess
2. Trace through the code yourself
3. Fix ONE thing at a time
4. Have them re-test after each fix
5. Explain what you changed and why
6. Never say "it should work now" — say "I changed X because Y, try the action again"

---

## Ship Checklist (Before Deployment)

Walk through each item WITH the user. Don't just list them — verify together.

### Code
- [ ] `npm run build` passes with zero errors
- [ ] No `console.log` in production code
- [ ] No commented-out code blocks or TODOs
- [ ] No hardcoded localhost URLs

### Auth
- [ ] Sign up → email verify → login → dashboard works end-to-end
- [ ] Login fails gracefully with wrong credentials
- [ ] Forgot password flow works
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Sign out clears session completely

### Payments (if applicable)
- [ ] Stripe checkout redirects correctly
- [ ] Webhook processes events (use Stripe test events)
- [ ] Billing portal accessible from settings

### UI/UX
- [ ] All pages render without errors
- [ ] Mobile responsive on landing, dashboard, and login pages
- [ ] No horizontal scroll on mobile
- [ ] All links work (no 404s)
- [ ] Loading and error states exist

### Security (reference `/docs/zipbuild/SECURITY-BASELINE.md`)
- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys in committed code
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in server-side code
- [ ] RLS enabled on all tables
- [ ] Tenant isolation tested (see `/docs/zipbuild/TEST-PLAN.md`)

### Documentation
- [ ] IMPLEMENTATION-LOG.md is current
- [ ] All environment variables documented

---

## Deployment Flow

When Ship Checklist passes, guide the user through deployment using:

**`/docs/guides/DEPLOYMENT-GUIDE.md`** — Read this file and walk the user through it step by step.

Key steps (details in the guide):
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables (switch Stripe to LIVE keys)
4. Update Supabase redirect URLs for production domain
5. Create production Stripe webhook
6. Deploy and verify
7. Custom domain (optional)

**After deployment, update IMPLEMENTATION-LOG.md** with:
- Production URL
- GitHub repo URL
- Deployment date
- Vercel dashboard URL

---

## Status & Progress Queries

When the user asks about progress, status, what to test, or what's remaining:

1. Read `/docs/IMPLEMENTATION-LOG.md`
2. Check ZIP files in `/docs/zips/`
3. Summarize clearly:
   - Which ZIPs are done (with completion dates)
   - Which is current (and how far along)
   - What's next
   - Percentage complete (X of Y ZIPs)

Example:
> "You're on ZIP-03 of 7 (43%). ZIP-01 (Auth) and ZIP-02 (Dashboard Layout) are complete and tested. ZIP-03 (Billing) is in progress — Stripe checkout is wired up, and next we need the webhook handler. After that, we'll test the full payment flow before moving to ZIP-04 (Settings)."

---

## Folder Map

```
/docs/                   ← YOUR project docs (active, updated as you build)
/docs/zipbuild/          ← THE OS (methodology, don't edit)
/docs/prompts/           ← Planning prompts
/docs/guides/            ← How-to guides (debugging, deployment, building)
/docs/zips/              ← Build steps (generated during onboarding)
/docs/project/           ← Project outputs (audits, reports)
```

---

## Mode Toggle

```
[ ] AUTONOMOUS MODE — Execute without asking
[x] CONFIRM MODE — Ask before major changes (default)
```

---

## Design System Quick Reference

| Element | Value |
|---------|-------|
| Display Font | [Set during onboarding] |
| Body Font | [Set during onboarding] |
| Primary Color | [Set during onboarding] |
| Accent Color | [Set during onboarding] |
| Aesthetic | [Set during onboarding] |

---

## Hard Rules (Non-Negotiable)

1. **NEVER bodge RLS** — Proper policies only
2. **NEVER do workarounds** — Fix root cause or STOP
3. **NEVER use generic fonts** — No Inter, Roboto, Arial
4. **NEVER use default shadcn** — Always customize to match design
5. **NEVER skip IMPLEMENTATION-LOG.md updates**
6. **NEVER skip TECHNICAL-FLUENCY.md updates** for bugs/decisions
7. **NEVER skip QUALITY-GATES.md checks** before completing a ZIP
8. **NEVER use service_role key client-side**
9. **NEVER commit secrets to git**
10. **NEVER skip the Testing Gate** between ZIPs
11. **NEVER auto-advance** to the next ZIP without user confirmation
12. **ALWAYS use Plan Mode before big changes** — See Plan Mode section below

---

## Supabase Patterns

### ⚠️ NEVER use nested selects
```typescript
// ❌ WRONG — causes "Could not find a relationship" errors
const { data } = await supabase
  .from('vehicles')
  .select('*, dealer:dealers(*)')

// ✅ CORRECT — separate queries
const { data: vehicles } = await supabase.from('vehicles').select('*')
const { data: dealers } = await supabase.from('dealers').select('*')
```

---

## Available Subagents

See `/docs/zipbuild/SUBAGENTS.md` for full guide.

```bash
npx claude-code-templates@latest --agent development-team/frontend-developer --yes
npx claude-code-templates@latest --agent development-tools/code-reviewer --yes
```

---

## Plan Mode (Use Before Big Changes)

**Plan Mode = think first, code second.** Use `Shift+Tab` to toggle Plan Mode in Claude Code.

### ALWAYS Enter Plan Mode Before:

- Starting a new ZIP (read the spec, plan the approach, THEN code)
- Changing database schema or RLS policies
- Modifying auth flows or middleware
- Restructuring files or components
- Any change that touches 3+ files
- Fixing a bug that you don't fully understand yet
- Any architectural decision

### How It Works

In Plan Mode, Claude reasons through the problem without writing code. It reads files, traces logic, considers edge cases, and presents a plan. You review the plan, ask questions, push back. Only when the plan is solid do you switch to code mode and execute.

### The Pattern

1. Enter Plan Mode (`Shift+Tab`)
2. Say what you want to do: "I need to add [feature]. Plan the approach."
3. Claude reads the relevant files, thinks through the approach, and presents a plan
4. Review the plan — ask "what could go wrong?" or "is there a simpler way?"
5. When satisfied, exit Plan Mode and say "Execute the plan"

### Why This Matters

Without Plan Mode, Claude jumps straight to writing code. That's fine for small changes. For big changes, it leads to half-built implementations, missed edge cases, and the need to rewrite. Plan first, execute second. Every time.

---

## Prompting Patterns

### Before Big Changes
- Enter Plan Mode (`Shift+Tab`) and plan before coding
- "Plan how you'd implement [feature]. Don't write code yet."

### After Implementation
- "Grill me on these changes and don't make a PR until I pass your test"
- "Prove to me this works"

### After a Mediocre Fix
- "Knowing everything you know now, scrap this and implement the elegant solution"

### For Verification
- "Enter plan mode and verify this works"

### When Something Goes Sideways
- Switch back to Plan Mode immediately (`Shift+Tab`). Re-read the ZIP spec. Re-plan. Don't keep pushing through broken code.

---

## After Any Mistake

> "Update CLAUDE.md so you don't make that mistake again"

---

## Source of Truth Hierarchy

1. `/docs/DECISIONS.md` ← FINAL WORD
2. Current ZIP file ← What we're building
3. `/docs/MASTER-PLAN.md` ← Architecture
4. `/docs/ASSUMPTIONS.md` ← Scale boundaries
5. Existing codebase ← What's built
6. AI suggestions ← Nice-to-haves only

---

## Project-Specific Rules

> Rules accumulate here as you build. Claude adds them after mistakes.

---

## If Stuck

1. Re-read this file
2. Re-read `/docs/DECISIONS.md`
3. **STOP and explain the problem** — don't hack around it
