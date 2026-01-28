# ZIPBUILD - NEW PROJECT STARTER TEMPLATE

> **Methodology**: ZipBuild (zipbuild.dev)
> **Version**: 2.3 (with Technical Fluency Document)
> **Copy this entire /docs folder into your new project**

---

## CHANGELOG

### v2.3 (Current)
- **NEW**: TECHNICAL-FLUENCY.md - transforms every build into a learning experience
- **NEW**: PRODUCTION-READINESS-AUDIT.md - comprehensive security & scalability audit with scoring
- **NEW**: EXISTING-PROJECT-BOOTSTRAP.md - auto-detects and audits existing codebases
- **NEW**: Error Diary system for capturing lessons from bugs
- **NEW**: Investor-Ready Explanations section
- **UPDATED**: CLAUDE-CODE-RULES.md with Rule #7 (Technical Fluency updates)
- **UPDATED**: ZIP exit criteria now includes TECHNICAL-FLUENCY.md updates
- **UPDATED**: HOW TO USE now covers both new and existing projects

### v2.2
- Integrated FRONTEND-DESIGN-SKILL.md
- Added Red-Team Review process
- Anti-generic-UI rules

### v2.1
- Initial public release

---

## HOW TO USE

### For New Projects
1. Create your new project repo
2. Copy this `/docs` folder into it
3. Fill in PROJECT-INFO.md with your app details
4. Use DISCOVERY-PROMPT.md with Claude to create your spec
5. **🔴 RED-TEAM your spec** → Fix issues
6. Use ARCHITECTURE-PROMPT.md to create your master plan
7. **🔴 RED-TEAM your master plan** → Fix issues
8. Use ZIP-GENERATOR-PROMPT.md to create your ZIPs
9. **🔴 RED-TEAM each ZIP** → Fix issues
10. Build one ZIP at a time with Claude Code
11. **🎨 Reference FRONTEND-DESIGN-SKILL.md** for all UI work
12. **📚 TECHNICAL-FLUENCY.md** updates automatically as you build

### For Existing Projects
1. Copy this `/docs` folder into your existing project
2. Hand the entire ZIPBUILD file to Claude Code
3. Claude Code will **automatically detect** it's an existing project
4. Claude Code runs the **Bootstrap Process** (see FILE 16):
   - Scans your codebase
   - Populates IMPLEMENTATION-LOG.md
   - Generates TECHNICAL-FLUENCY.md
   - Identifies current state and proposes next ZIP
5. Review and confirm the audit
6. Continue with normal ZipBuild workflow

---

# FILE 1: PROJECT-INFO.md

```markdown
# [PROJECT NAME]

## Overview
**Name**: 
**One-liner**: 
**Domain**: 

## Tech Stack
- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Database: Supabase (Postgres)
- Auth: Supabase Auth
- Styling: Tailwind CSS
- Components: shadcn/ui
- Deployment: Vercel
- Payments: Stripe (if applicable)

## Design Direction
- Aesthetic: [Define from FRONTEND-DESIGN-SKILL.md]
- Theme: Light / Dark / Both
- Typography: [Display font] + [Body font]
- Key differentiator: [What makes this visually memorable?]

## Team
- Lead: [Name]
- Development: AI-assisted (Claude)

## Links
- Repo: 
- Production: 
- Staging: 
- Supabase: 
- Vercel: 
- Stripe: 

## Status
- [ ] Discovery complete
- [ ] Discovery red-teamed ✓
- [ ] Architecture complete
- [ ] Architecture red-teamed ✓
- [ ] Design direction chosen ✓
- [ ] ZIP-00 complete
- [ ] ZIP-01 complete
- [ ] ... (add as you go)
- [ ] TECHNICAL-FLUENCY.md complete
```

---

# FILE 2: DECISIONS.md

```markdown
# Architectural Decisions

## How To Use
Record every significant technical decision here BEFORE implementing.
This is the source of truth. If it's not here, it wasn't decided.

---

## [DATE] — Project Tech Stack

**Decision**: Next.js 15 + Supabase + Vercel + Tailwind

**Reason**:
- Modern, well-supported stack
- Supabase provides auth + DB + RLS
- Vercel has excellent Next.js support
- Tailwind for rapid UI development

**Alternatives considered**:
- [List what else you considered]

**Impact**:
- [What this affects]

---

## [DATE] — Design Direction

**Decision**: [Aesthetic choice from FRONTEND-DESIGN-SKILL.md]

**Reason**:
- [Why this aesthetic fits the product/audience]
- [What emotion/impression we want to create]

**Typography**:
- Display: [Font name]
- Body: [Font name]

**Color palette**:
- Primary: [Color]
- Accent: [Color]
- Background: [Color]

**Impact**:
- All UI components follow this direction
- No generic/default shadcn styling without customisation

---

## [DATE] — [Next Decision]

**Decision**: 

**Reason**:

**Alternatives considered**:

**Impact**:

---

[Add new decisions as you make them]
```

---

# FILE 3: ASSUMPTIONS.md

```markdown
# Scaling Assumptions

## Current Stage
[MVP / Beta / Production]

## Expected Scale

| Stage | Users | Timeline |
|-------|-------|----------|
| Early | 1-10 | Now |
| MVP | 100 | Month 2 |
| Growth | 1,000 | Month 6 |
| Scale | 10,000+ | Year 1 |

## Current Architecture Supports
- ✅ [What current setup handles]
- ✅ 
- ✅ 

## Non-Goals (For Now)

NOT building for until scale demands:
- ❌ [Thing we're not doing yet]
- ❌ 
- ❌ 

## When To Revisit

Revisit this document when:
- Hitting rate limits
- Response times > 2 seconds
- Approaching tier limits
- Preparing for funding/launch

## Upgrade Path

| Bottleneck | Solution | Cost |
|------------|----------|------|
| DB connections | Supabase Pro | $25/mo |
| API limits | Vercel Pro | $20/mo |
| [Other] | [Solution] | [Cost] |
```

---

# FILE 4: DISCOVERY-PROMPT.md

```markdown
# App Discovery Session

## Instructions
1. Open a new Claude chat
2. Copy everything below the line
3. Paste and start answering questions
4. Save the output as /docs/APP-SPECIFICATION.md
5. **🔴 RED-TEAM IT** (see RED-TEAM-PROMPT.md)
6. Fix any critical issues before proceeding

---

I want you to help me plan an app. I have an idea but need help thinking through it properly.

Your job is to ask me questions ONE AT A TIME to understand:
1. What problem I'm solving
2. Who my users are
3. What the core features are
4. How the business model works
5. Technical constraints
6. **Design direction** (refer to FRONTEND-DESIGN-SKILL.md aesthetic options)

After each answer, ask a follow-up to go deeper.

When you have enough info (usually 15-25 questions), create a comprehensive App Specification:

## Output Structure

1. **Overview**
   - App name
   - One-line description
   - Problem statement
   - Solution summary

2. **Target Users**
   - Primary persona
   - Secondary personas
   - User goals and pain points

3. **Core Features** (prioritised)
   - Must have (MVP)
   - Should have (v1.1)
   - Nice to have (future)

4. **User Flows**
   - Main journey
   - Secondary flows

5. **Business Model**
   - Revenue streams
   - Pricing strategy

6. **Technical Considerations**
   - Scale expectations
   - Integrations needed
   - Data sensitivity

7. **Design Direction**
   - Aesthetic tone (from FRONTEND-DESIGN-SKILL.md options)
   - What makes this visually memorable?
   - Typography direction
   - Color mood

8. **Success Metrics**
   - How we know it's working

Start by asking: "What's the basic idea for your app? Describe it like you're telling a friend."
```

---

# FILE 5: ARCHITECTURE-PROMPT.md

```markdown
# Architecture Planning Session

## Instructions
1. Complete discovery first (have APP-SPECIFICATION.md)
2. Open a new Claude chat
3. Copy everything below the line
4. Paste your App Specification at the bottom
5. Save output as /docs/MASTER-PLAN.md
6. **🔴 RED-TEAM IT** (see RED-TEAM-PROMPT.md)
7. Fix any critical issues before generating ZIPs

---

I've attached my App Specification. Create a technical Master Implementation Plan.

**IMPORTANT**: Reference /docs/FRONTEND-DESIGN-SKILL.md for all UI/component decisions. No generic AI aesthetics.

## Required Sections

### 1. Database Schema
- All tables needed
- Relationships
- Key fields
- Indexes

### 2. Authentication
- User roles and permissions
- Sign up / login flows
- Session management

### 3. Row Level Security
- Who sees what
- Who edits what
- Tenant isolation (if applicable)

### 4. API Routes
- All endpoints
- What each does
- Request/response

### 5. Pages & Components
- All pages
- Key components
- Navigation
- **Design system foundation** (per FRONTEND-DESIGN-SKILL.md)

### 6. Third-Party Integrations
- What services
- How they connect

### 7. Implementation Stages
- Break into 10-15 ZIPs
- Each ZIP = 2-5 hours work
- Dependencies between stages
- Testing checkpoints
- **Include UI polish ZIP** near the end

### 8. Security Considerations
- Data protection
- Input validation
- Rate limiting

### 9. Scalability Notes
- Potential bottlenecks
- Future optimizations

### 10. Design System
- Chosen aesthetic direction
- Typography (display + body fonts)
- Color palette with CSS variables
- Component styling approach
- Motion/animation strategy

Format as detailed Markdown.

---

## My App Specification:

[PASTE YOUR APP-SPECIFICATION.md HERE]
```

---

# FILE 6: ZIP-GENERATOR-PROMPT.md

```markdown
# ZIP File Generator

## Instructions
1. Complete architecture first (have MASTER-PLAN.md)
2. Open a new Claude chat
3. Copy everything below the line
4. Paste your Master Plan at the bottom
5. Save each ZIP as /docs/zips/ZIP-XX-NAME.md
6. **🔴 RED-TEAM EACH ZIP** before building it

---

I've attached my Master Implementation Plan. Generate ZIP files for each stage.

**IMPORTANT**: Any ZIP that involves UI must reference /docs/FRONTEND-DESIGN-SKILL.md

## ZIP Structure (Follow Exactly)

# ZIP-[NUMBER]: [NAME]

> **Estimated Time**: X hours
> **Dependencies**: ZIP-XX
> **Status**: Not Started
> **Red-Teamed**: [ ] Yes
> **Has UI**: [ ] Yes → Must follow FRONTEND-DESIGN-SKILL.md

---

## RULES FOR THIS ZIP

1. **NO NEW CONCEPTS**: Only implement what's defined here or previous ZIPs
2. **NO SCOPE CREEP**: Note extras for future ZIPs
3. **NO PREMATURE ABSTRACTION**: Build for now
4. **ASK, DON'T ASSUME**: Unclear? Ask first
5. **NO GENERIC UI**: Follow FRONTEND-DESIGN-SKILL.md for all visual work

## ⛔ HARD RULES (See CLAUDE-CODE-RULES.md)

- **NEVER bodge RLS** - proper policies only, no workarounds
- **NEVER do workarounds** - fix root cause or STOP
- **NEVER skip security** - validate everything
- **NEVER use generic fonts** (Inter, Roboto, Arial) - see FRONTEND-DESIGN-SKILL.md
- **NEVER use default shadcn** without customisation to match design direction
- If stuck → STOP and explain, don't hack around it

---

## ENTRY CRITERIA

DO NOT start until:

▢ Previous ZIP exit criteria met
▢ Previous ZIP tests passed
▢ DB migrations applied
▢ App builds with zero errors
▢ No unresolved bugs
▢ This ZIP has been red-teamed
▢ Design direction confirmed (if UI work)

---

## PURPOSE

[2-3 sentences]

---

## WHAT THIS ZIP IS NOT

This ZIP does NOT:

- [Boundary 1]
- [Boundary 2]

---

## DATABASE CHANGES

### New Tables

| Table | Purpose |
|-------|---------|
| [name] | [what it stores] |

### New Policies

| Policy | Table | Rule |
|--------|-------|------|
| [name] | [table] | [who can do what] |

### Migrations

[List migration steps]

---

## FILES TO CREATE/MODIFY

### New Files

- `/path/to/file.tsx` - [purpose]
- …

### Modified Files

- `/path/to/existing.tsx` - [what changes]
- …

---

## DETAILED REQUIREMENTS

### [Requirement 1]

**What**: [Description]

**Acceptance criteria**:

- [ ] [Specific testable outcome]
- [ ] [Specific testable outcome]

**UI requirements** (if applicable):

- [ ] Follows FRONTEND-DESIGN-SKILL.md aesthetic
- [ ] Uses project typography
- [ ] Includes appropriate animations
- [ ] No generic styling

### [Requirement 2]

…

---

## EXIT CRITERIA

This ZIP is DONE when:

▢ [Specific testable outcome]
▢ [Specific testable outcome]
▢ All tests pass
▢ No TypeScript errors
▢ RLS policies tested
▢ IMPLEMENTATION-LOG.md updated
▢ TECHNICAL-FLUENCY.md updated (if new concepts/decisions/errors)
▢ UI matches design direction (if applicable)

---

## TESTING

### Manual Tests

1. [ ] [Test description]
2. [ ] [Test description]

### Automated Tests

- [ ] [Test file/description]

---

## NOTES

[Anything else relevant]

---

Generate these ZIPs:
- ZIP-00: Foundation (project setup, auth pages with design system)
- ZIP-01-XX: Feature ZIPs (include UI notes per FRONTEND-DESIGN-SKILL.md)
- ZIP-FINAL-1: UI Polish & Animation Pass

---

## My Master Plan:

[PASTE YOUR MASTER-PLAN.md HERE]
```

---

# FILE 7: SOURCE-OF-TRUTH.md

```markdown
# Source of Truth

## Database
Single source: Supabase

## Auth
Single source: Supabase Auth

## Types
Single source: Auto-generated from Supabase

## UI/Components
Single source: shadcn/ui (customised per FRONTEND-DESIGN-SKILL.md)

## State
Single source: [Your choice - React state / Zustand / etc]

## Design Direction
Single source: FRONTEND-DESIGN-SKILL.md + DECISIONS.md design entry

## Styling
Single source: Tailwind CSS + CSS variables in globals.css

## Environment Variables
Single source: Vercel (production) / .env.local (development)

## Technical Knowledge
Single source: TECHNICAL-FLUENCY.md (for founder understanding)

---

NEVER duplicate any of these. NEVER create parallel versions.
If something doesn't fit, update the source of truth or discuss first.
```

---

# FILE 8: GOLDEN-PATHS.md

```markdown
# Golden Paths

## How To Use
These are the ONLY patterns to use. If you think you need something else, ask first.

---

## Data Fetching

### Server Component (default)
[standard pattern]

### Client Component with loading
[standard pattern]

---

## Forms

### Server Action Pattern
[standard pattern]

---

## Authentication

### Protected Page
[standard pattern]

### Protected API Route
[standard pattern]

---

## Database

### Query with RLS
[standard pattern]

---

## UI Components

### Basic Component Structure
```tsx
// Follow FRONTEND-DESIGN-SKILL.md for all styling decisions

import { cn } from "@/lib/utils"

interface ComponentProps {
  // props
}

export function Component({ ...props }: ComponentProps) {
  return (
    <div className={cn(
      // Base styles that match design direction
      // Use CSS variables from globals.css
      // Include motion/transitions where appropriate
    )}>
      {/* content */}
    </div>
  )
}
```

### Animation Pattern

```tsx
// Prefer CSS animations for simple effects
// Use Framer Motion for complex orchestration

// CSS approach (preferred for performance)
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

// Staggered children
<div style={{ animationDelay: `${index * 100}ms` }}>
```

---

NO OTHER PATTERNS. These are battle-tested.
```

---

# FILE 9: IMPLEMENTATION-LOG.md

```markdown
# Implementation Log

## How To Use
Claude Code updates this after completing ANY work.
This is the running record of what exists.

---

## Environment Variables

| Variable | Purpose | Set In |
|----------|---------|--------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Vercel |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | Vercel |
| | | |

---

## Database Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| | | |

---

## RLS Policies

| Policy | Table | Rule |
|--------|-------|------|
| | | |

---

## Design System

| Element | Value | Notes |
|---------|-------|-------|
| Display Font | | |
| Body Font | | |
| Primary Color | | CSS var: --primary |
| Accent Color | | CSS var: --accent |
| Aesthetic | | From FRONTEND-DESIGN-SKILL.md |

---

## ZIP Progress

### ZIP-00: Foundation
- Started: 
- Completed: 
- Notes:

### ZIP-01: [Name]
- Started: 
- Completed: 
- Notes:

---

## Third-Party Services

| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Supabase | DB + Auth | |
| Vercel | Hosting | |
| | | |

---

## Known Issues

| Issue | Severity | ZIP to fix |
|-------|----------|------------|
| | | |
```

---

# FILE 10: CLAUDE-CODE-RULES.md

```markdown
# Claude Code Rules

## ⛔ HARD RULES - NEVER BREAK THESE

These rules apply to EVERY ZIP, EVERY task, NO EXCEPTIONS.

---

### 1. ALWAYS UPDATE IMPLEMENTATION-LOG.md

After completing ANY work, update `/docs/IMPLEMENTATION-LOG.md`:

- ✅ Add any new environment variables
- ✅ Document new database tables and RLS policies
- ✅ Log what was built in the ZIP section
- ✅ Note any configuration steps needed
- ✅ Record any third-party services added
- ✅ Update design system values if changed

This is NON-NEGOTIABLE. The log is the team's reference.

---

### 2. NEVER BODGE RLS POLICIES

Row Level Security must be implemented CORRECTLY. Never:

- ❌ Disable RLS to "fix" a permissions issue
- ❌ Use `SECURITY DEFINER` to bypass RLS
- ❌ Create overly permissive policies (e.g., `USING (true)`)
- ❌ Skip RLS "for now" with plans to add it later
- ❌ Use service_role key client-side to bypass RLS

Instead:

- ✅ Debug why the policy isn't working
- ✅ Check auth.uid() is available in the context
- ✅ Verify the user has the correct role/permissions
- ✅ Test policies in Supabase SQL editor first
- ✅ Create granular policies (SELECT, INSERT, UPDATE, DELETE separately)

If RLS isn't working, STOP and fix the root cause.

---

### 3. NEVER DO WORKAROUNDS - ALWAYS PROPER FIXES

When something breaks, fix it properly. Never:

- ❌ Comment out broken code
- ❌ Add try/catch that swallows errors silently
- ❌ Hardcode values to "make it work"
- ❌ Skip validation "because it's just MVP"
- ❌ Use `any` type to silence TypeScript
- ❌ Disable ESLint rules
- ❌ Add // @ts-ignore

Instead:

- ✅ Understand WHY it's broken
- ✅ Fix the actual root cause
- ✅ If you can't fix it, STOP and explain the blocker
- ✅ Document the issue in the ZIP for review

---

### 4. NEVER SKIP SECURITY

Security is not optional, even for MVP. Never:

- ❌ Store sensitive data unencrypted
- ❌ Expose API keys client-side
- ❌ Trust user input without validation
- ❌ Skip rate limiting "for now"
- ❌ Use HTTP instead of HTTPS
- ❌ Log sensitive information

---

### 5. ASK, DON'T ASSUME

When requirements are unclear:

- ❌ Don't guess and implement
- ❌ Don't add features not in the ZIP
- ❌ Don't "improve" the architecture without discussion

Instead:

- ✅ STOP and ask for clarification
- ✅ List your assumptions explicitly
- ✅ Wait for confirmation before proceeding

---

### 6. NEVER USE GENERIC UI

All UI must follow FRONTEND-DESIGN-SKILL.md. Never:

- ❌ Use Inter, Roboto, Arial, or system fonts
- ❌ Use purple gradients on white backgrounds
- ❌ Use default shadcn styling without customisation
- ❌ Use predictable/cookie-cutter layouts
- ❌ Skip animations and micro-interactions
- ❌ Use flat solid color backgrounds without texture/depth

Instead:

- ✅ Follow the chosen aesthetic direction
- ✅ Use distinctive typography (display + body fonts)
- ✅ Apply CSS variables for consistent theming
- ✅ Add motion and micro-interactions
- ✅ Create visual depth with textures, shadows, gradients
- ✅ Make it memorable - what's the ONE thing users will notice?

---

### 7. ALWAYS UPDATE TECHNICAL-FLUENCY.md

This document transforms building into learning. Update it when:

- ✅ You fix a non-trivial bug → Add to Error Diary
- ✅ You make an architectural decision → Add to Key Technical Decisions
- ✅ You implement a core concept (RLS, auth, etc.) → Add to Concepts Explained
- ✅ You complete a major ZIP → Update Big Picture / Architecture sections

**Writing style requirements:**
- Use analogies, not jargon
- Explain WHY, not just WHAT
- Write like you're teaching a smart founder, not a developer
- If an investor could ask about it, prepare the answer
- Every bug is a lesson—capture the wrong assumption

This is NON-NEGOTIABLE. The build is not complete if the learning isn't captured.

---

## Copy This Into Every Claude Code Session

```
RULES FOR THIS SESSION:

1. ALWAYS update /docs/IMPLEMENTATION-LOG.md after completing work
   - New ENV vars, tables, RLS policies, what was built
2. NEVER bodge RLS policies - always proper implementation
3. NEVER do workarounds - always fix root cause
4. NEVER skip security - validate everything
5. NEVER use generic UI - follow FRONTEND-DESIGN-SKILL.md
   - No Inter/Roboto/Arial fonts
   - No default shadcn without customisation
   - Add animations and visual depth
6. If stuck, STOP and explain - don't hack around it
7. If unclear, ASK - don't assume
8. ALWAYS update /docs/TECHNICAL-FLUENCY.md when you:
   - Fix a non-trivial bug (Error Diary)
   - Make a decision with tradeoffs (Key Decisions)
   - Implement core concepts (Concepts Explained)
   Write engagingly—analogies over jargon. Every project is a lesson.

If you find yourself about to break these rules, STOP and tell me why.
```
```

---

# FILE 11: RESET-PROMPT.md

```markdown
# Claude Reset Prompt

Use when Claude seems confused or goes off-track.

---

STOP. Reset context.

Ignore all previous assumptions from this conversation.

Re-read these files in order:
1. /docs/DECISIONS.md
2. /docs/ASSUMPTIONS.md
3. /docs/CLAUDE-CODE-RULES.md
4. /docs/FRONTEND-DESIGN-SKILL.md
5. /docs/IMPLEMENTATION-LOG.md
6. /docs/TECHNICAL-FLUENCY.md
7. Current ZIP file
8. /docs/SOURCE-OF-TRUTH.md

Confirm your understanding:
- What ZIP are we on?
- What are the exit criteria?
- What are we NOT building?
- What are the HARD RULES?
- What ENV vars are already configured?
- What tables/RLS exist?
- What is our design direction?
- What fonts and colors are we using?
- What's in the Error Diary?

Do not write code until you've confirmed.
```

---

# FILE 12: RED-TEAM-PROMPT.md

```markdown
# Red Team Review Prompt

## Purpose
Catch problems BEFORE you build them. Run this after generating any major document.

## When To Use

| After generating... | Red-team it? |
|---------------------|--------------|
| APP-SPECIFICATION.md | ✅ Yes |
| MASTER-PLAN.md | ✅ Yes |
| Any ZIP file | ✅ Yes |
| DECISIONS.md updates | ⚠️ Optional |
| Bug fixes | ❌ No |

## Instructions
1. Generate your document first
2. In the SAME Claude chat, paste the prompt below
3. Review the output
4. Fix all 🔴 Critical issues before proceeding
5. Fix 🟡 Warnings if time permits
6. Note 🟢 Suggestions for future

---

## The Prompt

STOP. Switch modes.

You are now a critical technical reviewer. Your job is to RED-TEAM the [document/ZIP] you just created.

Be harsh. Be skeptical. Assume I will hit every edge case.

Review for:

### 1. What could break?
- Race conditions
- Edge cases
- Missing error handling
- Network failures
- Empty states
- Concurrent users

### 2. What assumptions are wrong?
- Scale assumptions
- User behavior assumptions
- Third-party reliability
- Data consistency
- Timing assumptions

### 3. What's missing?
- Security gaps
- Validation gaps
- Missing user flows
- Error messages
- Loading states
- Rollback plans

### 4. What's over-engineered?
- Premature optimization
- Unnecessary complexity
- Features we don't need yet
- Abstractions without purpose

### 5. What conflicts with existing decisions?
- Check against DECISIONS.md
- Check against ASSUMPTIONS.md
- Check against previous ZIPs
- Check against FRONTEND-DESIGN-SKILL.md

### 6. UI/Design Issues (if applicable)
- Generic "AI slop" aesthetics?
- Using banned fonts (Inter, Roboto, Arial)?
- Missing animations/micro-interactions?
- Inconsistent with design direction?
- Cookie-cutter layouts?

Output format:

## 🔴 Critical (Must Fix Before Proceeding)
- [Issue]: [Why it matters] → [Suggested fix]

## 🟡 Warning (Should Fix)
- [Issue]: [Why it matters] → [Suggested fix]

## 🟢 Suggestions (Nice to Have)
- [Issue]: [Why it matters]

## ✅ What Looks Good
- [Thing that's well designed]

Do not defend your previous work. Attack it.

---

## After Red-Teaming

1. Fix all 🔴 Critical issues
2. Update DECISIONS.md if architectural changes needed
3. Regenerate the document if major changes
4. Mark as red-teamed in PROJECT-INFO.md status
5. Proceed to next step
```

---

# FILE 13: RED-TEAM-QUICK.md

```markdown
# Quick Red-Team (5 Minutes)

Use for faster reviews when you're confident.

---

Quick red-team check on what you just generated:

1. What's the most likely thing to break?
2. What happens if the database is empty?
3. What happens if the user is malicious?
4. What did you assume that I didn't tell you?
5. What would a senior dev criticize?
6. **Does the UI look like generic AI output?** (Check against FRONTEND-DESIGN-SKILL.md)

Keep it brief. Bullet points only.
```

---

# FILE 14: FRONTEND-DESIGN-SKILL.md

```markdown
# Frontend Design Skill

> Source: Anthropic Agent Skills (github.com/anthropics/skills)
> Purpose: Create distinctive, production-grade interfaces that avoid generic "AI slop"

---

## When To Use

Reference this file for ANY UI work:
- Component creation
- Page layouts
- Styling decisions
- Animation implementation
- Design system setup

---

## Design Thinking Process

Before writing ANY UI code, answer these:

### 1. Purpose
What problem does this interface solve? Who uses it?

### 2. Tone
Pick a BOLD aesthetic direction. Options include:
- Brutally minimal
- Maximalist chaos
- Retro-futuristic
- Organic/natural
- Luxury/refined
- Playful/toy-like
- Editorial/magazine
- Brutalist/raw
- Art deco/geometric
- Soft/pastel
- Industrial/utilitarian

**Choose ONE and commit fully.**

### 3. Constraints
Technical requirements (framework, performance, accessibility)

### 4. Differentiation
What makes this UNFORGETTABLE? What's the ONE thing someone will remember?

---

## ⛔ NEVER USE (Generic AI Aesthetics)

These make your app look like every other AI-generated UI:

### Fonts
- ❌ Inter
- ❌ Roboto
- ❌ Arial
- ❌ System fonts
- ❌ Space Grotesk (overused)

### Colors
- ❌ Purple gradients on white backgrounds
- ❌ Timid, evenly-distributed palettes
- ❌ Generic blue (#0066FF type colors)

### Layouts
- ❌ Predictable grid patterns
- ❌ Cookie-cutter component arrangements
- ❌ Default shadcn styling without customisation

### Overall
- ❌ Designs that lack context-specific character
- ❌ Safe, forgettable aesthetics

---

## ✅ DO USE (Distinctive Design)

### Typography
- Choose fonts that are beautiful, unique, interesting
- Pair a distinctive DISPLAY font with a refined BODY font
- Unexpected, characterful choices
- Examples: Playfair Display, Cabinet Grotesk, Instrument Serif, Satoshi, General Sans, Clash Display

### Color & Theme
- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with SHARP accents
- Bold palettes outperform timid ones

### Motion & Animation
- Add animations for effects and micro-interactions
- CSS-only solutions preferred for HTML
- Framer Motion for React when needed
- Focus on HIGH-IMPACT moments:
  - Page load with staggered reveals (animation-delay)
  - Scroll-triggered animations
  - Hover states that surprise
- One well-orchestrated page load > scattered micro-interactions

### Spatial Composition
- Unexpected layouts
- Asymmetry
- Overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

### Backgrounds & Visual Details
- Create atmosphere and depth (not solid colors)
- Add contextual effects matching the aesthetic:
  - Gradient meshes
  - Noise textures
  - Geometric patterns
  - Layered transparencies
  - Dramatic shadows
  - Decorative borders
  - Custom cursors
  - Grain overlays

---

## Implementation Complexity

Match code complexity to aesthetic vision:

### Maximalist Design
- Elaborate code
- Extensive animations
- Multiple effects
- Rich interactions

### Minimalist/Refined Design
- Restraint and precision
- Perfect spacing
- Subtle details
- Careful typography
- Elegance from execution

---

## CSS Variables Template

Add to your `globals.css`:

```css
:root {
  /* Typography */
  --font-display: 'Your Display Font', serif;
  --font-body: 'Your Body Font', sans-serif;
  
  /* Colors - commit to your palette */
  --color-primary: ;
  --color-accent: ;
  --color-background: ;
  --color-surface: ;
  --color-text: ;
  --color-text-muted: ;
  
  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;
  
  /* Animation */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

---

## Animation Patterns

### Staggered Reveal (Page Load)

```css
.animate-in {
  animation: fadeSlideIn var(--duration-slow) var(--ease-out-expo) forwards;
  opacity: 0;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply delays to children */
.stagger-1 { animation-delay: 100ms; }
.stagger-2 { animation-delay: 200ms; }
.stagger-3 { animation-delay: 300ms; }
```

### Hover Effects

```css
.hover-lift {
  transition: transform var(--duration-normal) var(--ease-out-expo),
              box-shadow var(--duration-normal) var(--ease-out-expo);
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}
```

---

## The Golden Rule

> **Claude is capable of extraordinary creative work. Don't hold back. Show what can truly be created when thinking outside the box and committing fully to a distinctive vision.**

Every interface should be MEMORABLE. If someone can't tell your app from a generic template, you haven't followed this guide.

---

## Checklist Before Shipping UI

- [ ] Distinctive typography (not Inter/Roboto/Arial)
- [ ] Bold, cohesive color palette
- [ ] Animations on page load
- [ ] Hover states that delight
- [ ] Visual depth (not flat solid colors)
- [ ] Consistent with chosen aesthetic
- [ ] Something MEMORABLE about it
```

---

# FILE 15: TECHNICAL-FLUENCY.md

```markdown
# [PROJECT NAME] - Technical Fluency Document

> **Purpose**: Transform every build into a learning experience
> **Updated by**: Claude Code (continuously during development)
> **Goal**: Founder can explain every technical decision with confidence

---

## How This Document Works

Claude Code updates this document automatically as you build. It captures:
- How the system works (in plain language)
- Why decisions were made (not just what)
- Bugs encountered and how they were solved
- Technical concepts explained simply

By project completion, you'll have a personalised technical education—not generic documentation, but knowledge transfer designed for YOUR level of understanding.

---

## The Big Picture

> *Claude: Write 2-3 paragraphs explaining what this system does. Use analogies. Write like you're explaining to a smart friend over coffee, not writing a technical manual.*

[To be generated after ZIP-00]

---

## System Architecture

> *Claude: Explain how all the pieces connect. Use a central analogy (factory, restaurant kitchen, postal system, orchestra, etc.) that makes the data flow intuitive. Include ASCII diagrams if helpful.*

### The Analogy

[To be generated after architecture is implemented]

### How Data Flows

[To be generated - trace a typical user action through the entire system]

### The Cast of Characters (Key Files)

| File | Role | Plain English |
|------|------|---------------|
| | | |

---

## Key Technical Decisions

> *Claude: When you make a significant decision or implement something with tradeoffs, document it here. Explain the WHY, not just the WHAT.*

### [Date] — [Decision Title]

**What we chose**: 

**Why this over alternatives**:

**Tradeoffs we accepted**:

**When we might revisit this**:

---

## The Error Diary

> *Claude: Every non-trivial bug is a lesson. When you fix something interesting, add it here. Be specific about the wrong assumption—that's where the learning lives.*

### [Date] — [Short Descriptive Title]

**What broke**: 
[Describe the symptom]

**What I initially assumed**: 
[The wrong mental model]

**Actual root cause**: 
[What was really happening]

**The fix**: 
[What we did]

**The lesson**: 
[One sentence takeaway for future projects]

**Technical concept unlocked**: 
[If this taught a broader concept, name it]

---

## Concepts Explained

> *Claude: When you use a technical concept that's central to how this app works, add a plain-language explanation here. Write it so someone could explain it in a meeting without sounding like they're reading documentation.*

### Row Level Security (RLS)

[To be explained when first implemented]

### [Concept Name]

[Explanation]

---

## Investor-Ready Explanations

> *Claude: Anticipate technical questions an investor or partner might ask. Prepare confident, jargon-appropriate answers.*

### "How does the multi-tenant architecture work?"

[To be generated after relevant ZIP]

### "What happens if you get 10x the users tomorrow?"

[To be generated - reference ASSUMPTIONS.md]

### "How do you handle security / user data?"

[To be generated after auth + RLS implemented]

### "What's your tech stack and why?"

[To be generated from DECISIONS.md, but conversational]

### "How long would it take another developer to understand this codebase?"

[To be generated at project completion]

---

## If I Had To Rebuild This

> *Claude: At project completion, write a "lessons learned" summary. What would you do differently? What patterns worked well? What should be the template for next time?*

[To be generated at project completion]

---

## Quick Reference

### This App In One Sentence

[To be generated]

### The Three Most Important Files

1. [File] — because [reason]
2. [File] — because [reason]
3. [File] — because [reason]

### The Most Clever Thing About This Build

[To be generated - what's the elegant solution worth remembering?]

### The Biggest Gotcha For Future Maintenance

[To be generated - what will bite you if you forget it?]
```

---

# FILE 16: PRODUCTION-READINESS-AUDIT.md

```markdown
# Production Readiness Audit

> **Purpose**: Comprehensive evaluation before launch
> **Output**: Score out of 100 + GO / CONDITIONAL / NO-GO verdict
> **Run by**: Claude Code during bootstrap or on-demand

---

## When To Run This Audit

- Before launching to production
- Before accepting paying customers
- After major architectural changes
- Before investor demos (know your vulnerabilities)
- Quarterly health checks

---

## How To Use

Paste this prompt into Claude Code:

---

Run a comprehensive Production Readiness Audit on this codebase.

Examine every category below. For each item, provide:
- ✅ PASS (fully implemented)
- ⚠️ PARTIAL (exists but incomplete)
- ❌ FAIL (missing or broken)
- N/A (not applicable to this project)

Be harsh. Attempt to find vulnerabilities. Test multi-tenant isolation by examining whether queries are properly scoped. Check for actual security issues, not theoretical ones.

Output a full PRODUCTION-READINESS-AUDIT.md with scores and findings.

---

## Audit Categories

### 1. Authentication & Access Control (15 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Password hashing | 2 | bcrypt/argon2 with appropriate cost factor, never plain text or MD5/SHA1 |
| Session management | 2 | Secure token generation, httpOnly cookies, appropriate expiry |
| Token refresh logic | 2 | Refresh tokens rotate, old tokens invalidated |
| Logout invalidation | 1 | Sessions actually destroyed server-side |
| Role-based access | 3 | Roles enforced server-side, not just UI hiding |
| Account lockout | 2 | Brute force protection after failed attempts |
| Password reset security | 2 | Time-limited tokens, single use, secure delivery |
| MFA available | 1 | Optional: 2FA/MFA for sensitive accounts |

**Testing approach**:
- Attempt to access admin routes as regular user
- Check if expired tokens are rejected
- Verify password reset tokens can't be reused

---

### 2. Multi-Tenancy Isolation (15 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Query scoping | 4 | EVERY database query includes tenant filter |
| RLS policies (Supabase) | 3 | All tables have appropriate policies, no `USING (true)` on sensitive data |
| MongoDB tenant isolation | 3 | Tenant ID in all queries, compound indexes include tenant |
| Cross-tenant leak test | 3 | Actually attempt to fetch another tenant's data via API |
| File upload isolation | 1 | Uploaded files scoped to tenant, can't access others' files |
| Cache isolation | 1 | Cached data doesn't leak between tenants |

**Testing approach**:
- Create two test tenants
- As Tenant A, attempt to access Tenant B's data through every endpoint
- Check API responses for data leakage
- Examine all database queries for missing tenant filters

**Critical patterns to flag**:
```javascript
// ❌ DANGEROUS - no tenant scoping
const users = await db.collection('users').find({})

// ✅ CORRECT - tenant scoped
const users = await db.collection('users').find({ tenantId: currentTenantId })
```

```sql
-- ❌ DANGEROUS - RLS too permissive
CREATE POLICY "open" ON users USING (true);

-- ✅ CORRECT - properly scoped
CREATE POLICY "tenant_isolation" ON users 
  USING (tenant_id = auth.jwt()->>'tenant_id');
```

---

### 3. Database Security (15 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Connection string security | 2 | Not in code, not in client bundle, env vars only |
| Service role key protection | 2 | Supabase service_role NEVER in client-side code |
| Field-level encryption | 2 | Sensitive fields (API keys, tokens) encrypted at rest |
| Query injection protection | 2 | Parameterised queries, no string concatenation |
| Database user permissions | 2 | Principle of least privilege, not using root/admin |
| Backup encryption | 2 | Backups encrypted, tested restore process |
| Connection pooling | 2 | Limits configured, connections don't exhaust |
| Sensitive data identification | 1 | Know what PII exists and where |

**Testing approach**:
- Search codebase for hardcoded connection strings
- Check client bundle for leaked keys (`grep -r "service_role"`)
- Attempt SQL/NoSQL injection on input fields
- Review database user permissions

---

### 4. API & Input Security (10 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Rate limiting | 2 | All endpoints rate limited, especially auth |
| Input validation | 2 | All inputs validated server-side (not just client) |
| Output encoding | 1 | XSS prevention, HTML escaped |
| CORS configuration | 2 | Specific origins, not wildcard in production |
| Auth on protected routes | 2 | Every protected endpoint checks authentication |
| File upload validation | 1 | Type checking, size limits, content scanning |

**Testing approach**:
- Send malformed inputs to all endpoints
- Test CORS from unauthorized origins
- Attempt to access protected routes without auth
- Upload files with spoofed extensions

---

### 5. Data Protection & GDPR (10 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| PII inventory | 2 | Documented list of all personal data collected |
| Consent mechanisms | 1 | Clear consent before data collection |
| Data export (SAR) | 2 | Can export all user data on request |
| Data deletion | 2 | Can delete all user data on request (cascading) |
| Retention policies | 1 | Defined how long data is kept, auto-deletion |
| Privacy policy | 1 | Exists, accurate, covers all data processing |
| Cookie consent | 1 | Banner/consent for non-essential cookies |

**Testing approach**:
- Request data export as test user—is it complete?
- Request deletion—is data actually removed from all tables?
- Review privacy policy against actual data practices
- Check third-party data sharing is disclosed

**GDPR Critical Requirements**:
- 72-hour breach notification capability
- Data Processing Agreements with all third parties
- ICO registration (UK) or equivalent

---

### 6. Infrastructure & Deployment (10 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| HTTPS everywhere | 2 | No mixed content, HSTS enabled |
| Security headers | 2 | CSP, X-Frame-Options, X-Content-Type-Options |
| Environment variables | 2 | All secrets in env vars, not in code |
| Dependency vulnerabilities | 2 | `npm audit` / `pip audit` clean or justified |
| Error handling | 1 | No stack traces in production responses |
| Build security | 1 | No secrets in build logs, source maps disabled |

**Testing approach**:
- Run `npm audit` and review results
- Check response headers with browser dev tools
- Trigger errors and verify no sensitive info leaked
- Search codebase for hardcoded secrets

**Required headers**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: [appropriate policy]
```

---

### 7. Logging & Monitoring (5 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Audit logs | 2 | Sensitive actions logged (login, data changes, admin actions) |
| No sensitive data in logs | 1 | Passwords, tokens, PII not logged |
| Alerting | 1 | Alerts for errors, unusual activity |
| Log retention | 1 | Defined retention, compliant with regulations |

**Testing approach**:
- Review log outputs for sensitive data
- Check if failed login attempts are logged
- Verify alerting actually fires

---

### 8. Scalability & Resilience (10 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Database limits understood | 2 | Know connection limits, have headroom |
| Caching strategy | 2 | Appropriate caching, cache invalidation works |
| Rate limit headroom | 2 | Current usage vs limits documented |
| Graceful degradation | 2 | App doesn't crash under load, queues work |
| Backup tested | 1 | Actually restored from backup successfully |
| Disaster recovery | 1 | Plan exists, RTO/RPO defined |

**Testing approach**:
- Document current tier limits vs usage
- Test behaviour when database is slow/unavailable
- Verify backups can actually be restored

---

### 9. Business Continuity (5 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Documentation | 2 | Architecture documented, runbooks exist |
| Bus factor | 1 | More than one person can maintain this |
| Vendor assessment | 1 | Know what happens if Supabase/Vercel/etc goes down |
| Cost projection | 1 | Know costs at 10x current scale |

---

### 10. Legal & Compliance (5 points)

| Check | Points | What To Verify |
|-------|--------|----------------|
| Terms of Service | 2 | Exists, reviewed by legal, covers liability |
| Privacy Policy | 2 | Exists, accurate, GDPR compliant |
| Necessary registrations | 1 | ICO (UK), other regulatory requirements |

---

## Scoring

| Score | Verdict | Action |
|-------|---------|--------|
| 90-100 | **🟢 GO** | Production ready. Launch with confidence. |
| 75-89 | **🟡 CONDITIONAL** | Can launch. Fix flagged items within 30 days. |
| 60-74 | **🟠 HOLD** | Significant gaps. Fix critical issues before launch. |
| Below 60 | **🔴 NO-GO** | Critical vulnerabilities. Not safe to launch. |

---

## Output Template

Generate PRODUCTION-READINESS-AUDIT.md with this structure:

```markdown
# Production Readiness Audit Report

**Project**: [Name]
**Date**: [Date]
**Auditor**: Claude Code

---

## Executive Summary

**Score**: [X] / 100
**Verdict**: [GO / CONDITIONAL / HOLD / NO-GO]

### Top 3 Critical Issues
1. [Issue]
2. [Issue]
3. [Issue]

---

## Category Breakdown

| Category | Score | Max | Status |
|----------|-------|-----|--------|
| Authentication & Access Control | X | 15 | ✅/⚠️/❌ |
| Multi-Tenancy Isolation | X | 15 | ✅/⚠️/❌ |
| Database Security | X | 15 | ✅/⚠️/❌ |
| API & Input Security | X | 10 | ✅/⚠️/❌ |
| Data Protection & GDPR | X | 10 | ✅/⚠️/❌ |
| Infrastructure & Deployment | X | 10 | ✅/⚠️/❌ |
| Logging & Monitoring | X | 5 | ✅/⚠️/❌ |
| Scalability & Resilience | X | 10 | ✅/⚠️/❌ |
| Business Continuity | X | 5 | ✅/⚠️/❌ |
| Legal & Compliance | X | 5 | ✅/⚠️/❌ |
| **TOTAL** | **X** | **100** | |

---

## Detailed Findings

### 🔴 Critical (Must Fix Before Launch)

#### [CRIT-001] [Title]
**Category**: [Category]
**Finding**: [What's wrong]
**Evidence**: [Where/how you found it]
**Risk**: [What could happen]
**Remediation**: [How to fix]

---

### 🟡 Warnings (Fix Within 30 Days)

#### [WARN-001] [Title]
**Category**: [Category]
**Finding**: [What's wrong]
**Remediation**: [How to fix]

---

### 🟢 Recommendations (Best Practice)

#### [REC-001] [Title]
**Category**: [Category]
**Suggestion**: [What to improve]

---

## Evidence Log

| Check | Method | Result |
|-------|--------|--------|
| [What was checked] | [How] | [Pass/Fail] |

---

## Retest Checklist

After fixes applied, verify:

- [ ] [CRIT-001] - [Brief description]
- [ ] [CRIT-002] - [Brief description]
- [ ] [WARN-001] - [Brief description]

---

## Certification

This audit represents the state of the codebase at the time of review.
Score is valid for 90 days or until significant architectural changes.

Next audit recommended: [Date + 90 days]
```

---

## Quick Audit (15 minutes)

For faster checks between full audits:

```
Quick security check:

1. Any new tables without RLS policies?
2. Any new API routes without auth checks?
3. Any new environment variables exposed client-side?
4. npm audit results?
5. Any new third-party services added without DPA?

Report findings only. No full scoring.
```
```

---

# FILE 17: EXISTING-PROJECT-BOOTSTRAP.md

```markdown
# Existing Project Bootstrap

## When To Use This

**Claude Code: Read this FIRST before doing anything else.**

Check the project root:
- If `/src` or `/app` or `/pages` contains code → THIS IS AN EXISTING PROJECT → Follow bootstrap process below
- If the project is empty or only has this `/docs` folder → THIS IS A NEW PROJECT → Skip to ZIP-00

---

## Bootstrap Process (Existing Projects Only)

Before writing ANY new code, complete these steps in order:

### Step 1: Scan The Codebase

Examine the project structure. Identify:
- Framework and tech stack in use
- Database schema (check Supabase or migrations folder)
- Authentication setup
- Existing components and pages
- Third-party integrations
- Environment variables referenced

### Step 2: Populate IMPLEMENTATION-LOG.md

Document everything that already exists:

```markdown
## Environment Variables
[List all ENV vars referenced in the code]

## Database Tables
[List all tables, their purpose, and RLS status]

## RLS Policies
[List existing policies]

## Design System
[Document current fonts, colors, aesthetic direction]

## Third-Party Services
[List all integrations]

## Current State
[What's working, what's incomplete]
```

### Step 3: Generate TECHNICAL-FLUENCY.md

Write these sections based on what you found:

1. **The Big Picture** - 2-3 paragraphs explaining what this system does. Use analogies.
2. **System Architecture** - How the pieces connect. Include an analogy and ASCII diagram.
3. **The Cast of Characters** - Key files table with plain English explanations.
4. **Concepts Explained** - Any technical concepts already implemented (RLS, auth patterns, etc.)
5. **Investor-Ready Explanations** - Prepare answers based on what exists.

**Writing style**: Engaging, analogy-driven, not dry documentation. Write like you're teaching a smart founder.

### Step 4: Identify Current ZIP Equivalent

Based on what exists, determine:
- What ZIP stage is this project at?
- What would the next logical ZIP be?
- Are there incomplete features that need finishing first?

Create a proposed ZIP for the next piece of work.

### Step 5: Report Back

Summarise your findings:

```
## Bootstrap Complete

**Project**: [Name]
**Tech Stack**: [What's in use]
**Current State**: [ZIP equivalent, e.g. "Between ZIP-03 and ZIP-04"]
**What's Working**: [List]
**What's Incomplete**: [List]
**Proposed Next ZIP**: [Brief description]

**TECHNICAL-FLUENCY.md Status**: Generated / Updated
**IMPLEMENTATION-LOG.md Status**: Populated

Ready for your review before proceeding.
```

---

## After Bootstrap

Once you've confirmed the audit is correct:

1. Continue with normal ZipBuild workflow
2. Create ZIPs for remaining work
3. Red-team each ZIP before building
4. Update TECHNICAL-FLUENCY.md continuously as you build
5. Update IMPLEMENTATION-LOG.md after each piece of work
6. **Run PRODUCTION-READINESS-AUDIT.md before launch**

---

## Optional: Run Security Audit During Bootstrap

For existing projects approaching launch, add this to your bootstrap request:

```
Also run a full PRODUCTION-READINESS-AUDIT.md and include the score in your report.
```

This gives you an immediate security baseline for inherited or legacy codebases.

---

## If The Codebase Is A Mess

If you find:
- Inconsistent patterns
- Security issues (exposed keys, missing RLS)
- Workarounds or bodged code
- Technical debt

**Document it honestly** in your report. Recommend a "ZIP-CLEANUP" before adding new features if necessary. Don't pretend problems don't exist.
```

---

# FOLDER STRUCTURE

After setup, your `/docs` folder should look like:

```
/docs
├── PROJECT-INFO.md
├── DECISIONS.md
├── ASSUMPTIONS.md
├── SOURCE-OF-TRUTH.md
├── GOLDEN-PATHS.md
├── CLAUDE-CODE-RULES.md
├── FRONTEND-DESIGN-SKILL.md
├── TECHNICAL-FLUENCY.md              ← NEW IN v2.3
├── PRODUCTION-READINESS-AUDIT.md     ← NEW IN v2.3
├── EXISTING-PROJECT-BOOTSTRAP.md     ← NEW IN v2.3
├── IMPLEMENTATION-LOG.md             (updated by Claude Code as you build)
├── APP-SPECIFICATION.md              (generated from discovery)
├── MASTER-PLAN.md                    (generated from architecture)
├── /prompts
│   ├── DISCOVERY-PROMPT.md
│   ├── ARCHITECTURE-PROMPT.md
│   ├── ZIP-GENERATOR-PROMPT.md
│   ├── RESET-PROMPT.md
│   ├── RED-TEAM-PROMPT.md
│   └── RED-TEAM-QUICK.md
└── /zips
    ├── ZIP-00-FOUNDATION.md
    ├── ZIP-01-AUTH.md
    ├── ZIP-02-[FEATURE].md
    └── …
```

---

# QUICK START CHECKLIST

```
▢ Created repo
▢ Copied /docs folder
▢ Filled in PROJECT-INFO.md
▢ Ran discovery session → APP-SPECIFICATION.md
▢ 🔴 Red-teamed spec → Fixed issues
▢ Ran architecture session → MASTER-PLAN.md
▢ 🔴 Red-teamed master plan → Fixed issues
▢ 🎨 Chose design direction (FRONTEND-DESIGN-SKILL.md)
▢ Generated ZIPs → /docs/zips/
▢ 🔴 Red-teamed ZIP-00
▢ Started ZIP-00
▢ 📚 TECHNICAL-FLUENCY.md updating as you build
▢ Building…
▢ 🔒 Pre-launch: Run PRODUCTION-READINESS-AUDIT.md
▢ Fix all 🔴 Critical issues
▢ Launch!
```

---

# WORKFLOW SUMMARY

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  DISCOVERY  │ ──▶ │  RED-TEAM   │ ──▶ │    FIX      │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ARCHITECTURE│ ──▶ │  RED-TEAM   │ ──▶ │    FIX      │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                    ┌─────────────┐
                    │   DESIGN    │
                    │  DIRECTION  │
                    └─────────────┘
                          │
                          ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ GENERATE ZIP│ ──▶ │  RED-TEAM   │ ──▶ │    FIX      │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                    ┌─────────────┐
                    │    BUILD    │
                    │  (w/ style) │
                    └─────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  TECHNICAL-FLUENCY.md │
              │  updates continuously │
              └───────────────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  NEXT ZIP   │
                    └─────────────┘
```

---

# THE PHILOSOPHY

ZipBuild exists because:

1. **AI-assisted development is powerful but chaotic** — Without structure, you end up with inconsistent code, forgotten decisions, and knowledge that lives only in chat logs.

2. **Building should teach you** — Every project is an opportunity to become more technical. The TECHNICAL-FLUENCY.md ensures you understand what you've built, not just that it works.

3. **Quality comes from constraints** — The rules aren't bureaucracy; they're guardrails that prevent the shortcuts that create technical debt.

4. **Design matters** — Generic UI signals generic thinking. Your product should look like someone cared.

5. **Documentation is for humans** — Not future developers. For YOU, six months from now, when you've forgotten everything.

---

*Methodology: ZipBuild v2.3 (zipbuild.dev)*
*Red-Team Review + Frontend Design Skill + Technical Fluency*
*Build products. Learn engineering. Ship quality.*
