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
