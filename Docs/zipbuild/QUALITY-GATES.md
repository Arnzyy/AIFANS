# Quality Gates

> **Definition of Done for every ZIP.** Nothing ships until these pass.

---

## How To Use

Every ZIP must satisfy ALL gates before marking complete. No exceptions.

Claude Code: Check these gates before declaring a ZIP "done". If any fail, the ZIP is not complete.

---

## Gate 1: Code Quality

```
▢ TypeScript strict mode passes (no errors)
▢ ESLint passes (no errors, warnings reviewed)
▢ No `// @ts-ignore` or `any` types without justification
▢ No `eslint-disable` without justification
▢ No TODO/FIXME left unaddressed in this ZIP's code
▢ No console.log statements (use proper logging)
```

---

## Gate 2: Security

```
▢ No secrets in code (API keys, passwords, tokens)
▢ No secrets in git history
▢ All user input validated and sanitized
▢ All API routes check authentication
▢ All API routes check authorization (user can do this action)
▢ Rate limiting on auth endpoints (login, signup, password reset)
▢ Rate limiting on expensive operations
▢ No service_role key used client-side
▢ HTTPS enforced (no HTTP in production)
```

---

## Gate 3: Database & RLS

```
▢ All new tables have RLS enabled
▢ All tables have appropriate policies (SELECT, INSERT, UPDATE, DELETE)
▢ No USING (true) policies without explicit justification
▢ No SECURITY DEFINER functions without explicit justification
▢ Tenant isolation tested (see TEST-PLAN.md)
▢ Indexes added for query patterns
▢ Foreign keys have ON DELETE behavior defined
▢ Migrations are reversible or have rollback plan
```

---

## Gate 4: Testing

```
▢ Tenant isolation tests pass (cross-tenant access denied)
▢ Auth tests pass (unauthenticated requests denied)
▢ Permission tests pass (unauthorized actions denied)
▢ Happy path manually tested
▢ Error states manually tested
▢ Empty states manually tested
▢ Edge cases documented and tested
```

---

## Gate 5: Observability

```
▢ Error tracking captures exceptions (Sentry or equivalent)
▢ API routes have structured logging
▢ Request IDs propagate through the stack
▢ Sensitive actions have audit logging
▢ Alerts configured for error spikes
```

---

## Gate 6: Documentation

```
▢ IMPLEMENTATION-LOG.md updated
▢ TECHNICAL-FLUENCY.md updated (if new concepts/bugs/decisions)
▢ DECISIONS.md updated (if architectural decisions made)
▢ API routes documented (request/response)
▢ Environment variables documented
▢ Any manual setup steps documented
```

---

## Gate 7: Production Readiness

```
▢ Works in production environment (not just localhost)
▢ Environment variables set in Vercel/hosting
▢ Database migrations applied to production
▢ No hardcoded localhost URLs
▢ Graceful error handling (no stack traces to users)
▢ Loading states for async operations
▢ Error states with user-friendly messages
```

---

## ZIP Sign-Off

Before marking a ZIP complete, confirm:

```markdown
## ZIP-XX Sign-Off

**Date**: 
**Completed by**: 

### Gates Passed
- [ ] Gate 1: Code Quality
- [ ] Gate 2: Security
- [ ] Gate 3: Database & RLS
- [ ] Gate 4: Testing
- [ ] Gate 5: Observability
- [ ] Gate 6: Documentation
- [ ] Gate 7: Production Readiness

### Exceptions (if any)
[List any gates skipped with justification]

### Notes
[Any relevant notes for future reference]
```

---

## When Gates Fail

If a gate fails:

1. **Do not mark ZIP complete**
2. **Do not move to next ZIP**
3. Fix the issue
4. Re-run the gate check
5. Only proceed when all gates pass

---

## Minimum Viable Gates (MVP Only)

For true MVP with limited time, these are the absolute minimum:

```
▢ No secrets in code
▢ RLS enabled on all tables
▢ Tenant isolation tested
▢ Auth routes protected
▢ Error tracking active
▢ TypeScript compiles
```

Everything else can be technical debt for post-MVP, but document it in IMPLEMENTATION-LOG.md under "Known Issues".
