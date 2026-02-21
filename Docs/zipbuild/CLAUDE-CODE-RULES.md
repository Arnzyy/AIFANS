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

All UI must follow /docs/zipbuild/FRONTEND-DESIGN-SKILL.md. Never:

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

### 8. USE SUBAGENTS FOR SPECIALIZED WORK

For complex or specialized tasks:

- ✅ Use `frontend-developer` subagent for all UI component work
- ✅ Use `code-reviewer` subagent after completing features
- ✅ Say "use subagents" when you want Claude to parallelize work
- ✅ Subagents run in isolation - keeps main context clean

**Install subagents:**
```bash
npx claude-code-templates@latest --agent development-team/frontend-developer --yes
npx claude-code-templates@latest --agent development-tools/code-reviewer --yes
```

---

### 9. SELF-IMPROVE CLAUDE.md

After ANY mistake:

- ✅ User will say "Update CLAUDE.md so you don't make that mistake again"
- ✅ Add a specific rule to the "Project-Specific Rules" section
- ✅ Rules should be concrete and actionable
- ✅ Keep iterating until mistake rate measurably drops

Claude is eerily good at writing rules for itself. Use this.

---

## Advanced Prompting Patterns

Use these phrases from the Claude Code team:

### After Implementation
```
"Grill me on these changes and don't make a PR until I pass your test"
```

### Verify Behavior
```
"Prove to me this works" 
→ Claude will diff behavior between main and feature branch
```

### After a Mediocre Fix
```
"Knowing everything you know now, scrap this and implement the elegant solution"
```

### When Things Go Sideways
```
→ Switch back to plan mode (Shift+Tab)
→ Re-plan before continuing
→ Don't keep pushing through
```

### For Verification Steps
```
"Enter plan mode and verify this works"
→ Use plan mode for verification, not just planning
```

---

## Copy This Into Every Claude Code Session

```
RULES FOR THIS SESSION:

1. ALWAYS update /docs/IMPLEMENTATION-LOG.md after completing work
2. NEVER bodge RLS policies - always proper implementation
3. NEVER do workarounds - always fix root cause
4. NEVER skip security - validate everything
5. NEVER use generic UI - follow /docs/zipbuild/FRONTEND-DESIGN-SKILL.md
6. ALWAYS update /docs/TECHNICAL-FLUENCY.md for bugs/decisions
7. USE SUBAGENTS for UI work (frontend-developer) and reviews (code-reviewer)
8. If stuck, STOP and explain - don't hack around it
9. If unclear, ASK - don't assume
10. After mistakes, UPDATE CLAUDE.md with new rules

Advanced prompts to use:
- "Grill me on these changes"
- "Prove to me this works"
- "Scrap this and implement the elegant solution"
- Switch to plan mode when things go sideways

If you find yourself about to break these rules, STOP and tell me why.
```
