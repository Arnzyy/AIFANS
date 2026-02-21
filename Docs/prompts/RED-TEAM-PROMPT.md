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
