# Existing Project Bootstrap

> **Integrate ZipBuild into any existing codebase.** Full audit, gap analysis, remediation plan.

---

## When To Use This

**Claude Code: Read this FIRST before doing anything else.**

Check the project root:
- If `/src` or `/app` or `/pages` contains code → THIS IS AN EXISTING PROJECT → Follow bootstrap process below
- If the project is empty or only has this `/docs` folder → THIS IS A NEW PROJECT → Skip to ZIP-00

---

## Bootstrap Process Overview

```
Step 1: Codebase Scan (what exists)
         ↓
Step 2: Security Audit (what's vulnerable)
         ↓
Step 3: Test Coverage Audit (what's unproven)
         ↓
Step 4: Documentation Generation (capture knowledge)
         ↓
Step 5: Gap Analysis (what's missing)
         ↓
Step 6: Remediation Plan (ZIPs to fix)
         ↓
Step 7: Report & Confirm
```

---

## Step 1: Codebase Scan

Examine the project structure. Document in IMPLEMENTATION-LOG.md:

### Technical Stack
```markdown
## Tech Stack
- Framework: [Next.js version / other]
- Language: [TypeScript / JavaScript]
- Database: [Supabase / Postgres / MongoDB / other]
- Auth: [Supabase Auth / NextAuth / custom]
- Hosting: [Vercel / other]
- Payments: [Stripe / other / none]
```

### Environment Variables
```markdown
## Environment Variables

| Variable | Purpose | Where Set | Sensitive? |
|----------|---------|-----------|------------|
| | | | |
```

### Database Schema
```markdown
## Database Tables

| Table | Purpose | Has RLS? | Tenant Column? |
|-------|---------|----------|----------------|
| | | | |
```

### Third-Party Integrations
```markdown
## Integrations

| Service | Purpose | API Key Location |
|---------|---------|------------------|
| | | |
```

---

## Step 2: Security Audit

Reference: `/docs/SECURITY-BASELINE.md`

### 2.1 Secrets Check

```markdown
## Secrets Audit

▢ No secrets hardcoded in source files
▢ No secrets in git history (run: git log -p | grep -i "key\|secret\|password")
▢ .env.local in .gitignore
▢ All NEXT_PUBLIC_ vars are safe to expose
▢ Service role key (if any) only used server-side

**Issues Found:**
- [ ] [Describe any issues]
```

### 2.2 RLS Audit

For EVERY table with user data:

```markdown
## RLS Audit

| Table | RLS Enabled? | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|-------|--------------|---------------|---------------|---------------|---------------|
| | | | | | |

**Critical Issues:**
- [ ] Tables without RLS: [list]
- [ ] Overly permissive policies (USING true): [list]
- [ ] Missing tenant isolation: [list]
```

### 2.3 Auth Audit

```markdown
## Authentication Audit

▢ Protected routes check authentication
▢ API routes verify user session
▢ No auth bypass possible
▢ Session expiry handled
▢ Password reset flow secure

**Issues Found:**
- [ ] Unprotected routes: [list]
- [ ] Auth bypass risks: [list]
```

### 2.4 Input Validation Audit

```markdown
## Input Validation Audit

▢ All API inputs validated (zod/yup/manual)
▢ File uploads validated (type, size)
▢ No raw SQL queries (parameterized only)
▢ HTML content sanitized

**Issues Found:**
- [ ] Unvalidated inputs: [list]
```

---

## Step 3: Test Coverage Audit

Reference: `/docs/TEST-PLAN.md`

### 3.1 Existing Tests

```markdown
## Current Test Coverage

**Test Framework**: [Vitest / Jest / none]
**Test Files**: [count]
**CI Pipeline**: [Yes / No]

| Test Type | Exists? | Passing? |
|-----------|---------|----------|
| Unit tests | | |
| Integration tests | | |
| E2E tests | | |
| Tenant isolation tests | | |
| Auth tests | | |
```

### 3.2 Critical Test Gaps

```markdown
## Missing Critical Tests

▢ Tenant isolation (cross-tenant access denied)
▢ Authentication (unauthenticated access denied)
▢ Authorization (role-based permissions)
▢ Payment webhook idempotency (if applicable)
▢ Rate limiting verification

**Priority Tests Needed:**
1. [Most critical]
2. [Second priority]
3. [Third priority]
```

---

## Step 4: Documentation Generation

### 4.1 Generate TECHNICAL-FLUENCY.md

Write these sections based on what you found:

1. **The Big Picture** - 2-3 paragraphs explaining what this system does. Use analogies.
2. **System Architecture** - How the pieces connect. Include an analogy and ASCII diagram.
3. **The Cast of Characters** - Key files table with plain English explanations.
4. **Concepts Explained** - Technical concepts already implemented.
5. **Investor-Ready Explanations** - Answers based on what exists.

### 4.2 Populate DECISIONS.md

Reverse-engineer architectural decisions:

```markdown
## [Date] — [Inferred Decision]

**What was chosen**: [Pattern/technology found in code]
**Likely reason**: [Why this makes sense]
**Evidence**: [Where in codebase]
**Recommendation**: [Keep / Revisit / Replace]
```

### 4.3 Create APP-SPECIFICATION.md (Reverse-Engineered)

```markdown
# [Project Name] - Specification (Reverse-Engineered)

## Overview
[What this app does based on codebase analysis]

## Core Features
[List features that exist]

## User Roles
[Roles found in auth/permissions]

## Data Model
[Key entities and relationships]

## Business Logic
[Core workflows identified]
```

---

## Step 5: Gap Analysis

### 5.1 Security Gaps

```markdown
## Security Gap Analysis

| Gap | Severity | Effort to Fix | ZIP Priority |
|-----|----------|---------------|--------------|
| Missing RLS on [table] | 🔴 Critical | 2 hours | ZIP-SECURITY-01 |
| No rate limiting | 🟡 Warning | 4 hours | ZIP-SECURITY-02 |
| | | | |
```

### 5.2 Quality Gaps

Reference: `/docs/QUALITY-GATES.md`

```markdown
## Quality Gap Analysis

| Gate | Current Status | Gap |
|------|----------------|-----|
| TypeScript strict | ▢ Pass / ▢ Fail | |
| ESLint clean | ▢ Pass / ▢ Fail | |
| No secrets in code | ▢ Pass / ▢ Fail | |
| RLS on all tables | ▢ Pass / ▢ Fail | |
| Tenant isolation tested | ▢ Pass / ▢ Fail | |
| Error tracking active | ▢ Pass / ▢ Fail | |
| CI pipeline exists | ▢ Pass / ▢ Fail | |
```

### 5.3 Multi-Tenant Gaps (If Applicable)

Reference: `/docs/MULTI-TENANT-CONTRACT.md`

```markdown
## Multi-Tenant Contract Compliance

▢ Every table has tenant_id column
▢ RLS enforces tenant isolation (not app code)
▢ Cross-tenant tests exist and pass
▢ No service_role key client-side

**Violations:**
- [ ] [List any violations]
```

---

## Step 6: Remediation Plan

Generate ZIPs to fix issues, prioritized by severity:

### Priority 1: Critical Security (Do First)

```markdown
## ZIP-SECURITY-01: Critical Security Fixes

**Issues Addressed:**
- [Critical issue 1]
- [Critical issue 2]

**Tasks:**
- [ ] Enable RLS on [tables]
- [ ] Add tenant isolation policies
- [ ] Remove hardcoded secrets
- [ ] Add auth checks to [routes]

**Exit Criteria:**
- [ ] Security audit passes
- [ ] Tenant isolation test passes
```

### Priority 2: Test Infrastructure

```markdown
## ZIP-TEST-01: Test Infrastructure

**Tasks:**
- [ ] Set up Vitest/testing framework
- [ ] Create tenant isolation tests
- [ ] Create auth tests
- [ ] Set up CI pipeline

**Exit Criteria:**
- [ ] Critical tests exist and pass
- [ ] CI runs on every PR
```

### Priority 3: Quality Gates

```markdown
## ZIP-QUALITY-01: Quality Gates

**Tasks:**
- [ ] Fix TypeScript errors
- [ ] Fix ESLint errors
- [ ] Add error tracking (Sentry)
- [ ] Add structured logging

**Exit Criteria:**
- [ ] All quality gates pass
- [ ] Error tracking capturing errors
```

### Priority 4: Feature Work

```markdown
## ZIP-FEATURE-XX: [Next Feature]

[Only after security/quality ZIPs complete]
```

---

## Step 7: Report & Confirm

### Bootstrap Report Template

```markdown
# Bootstrap Report: [Project Name]

**Date**: 
**Auditor**: Claude Code

---

## Executive Summary

**Project Health**: 🔴 Critical Issues / 🟡 Needs Work / 🟢 Healthy

**Key Findings**:
- [Most important finding]
- [Second finding]
- [Third finding]

---

## Tech Stack
[From Step 1]

## Security Audit Results

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Secrets | ▢ Pass / ▢ Fail | |
| RLS | ▢ Pass / ▢ Fail | |
| Auth | ▢ Pass / ▢ Fail | |
| Input Validation | ▢ Pass / ▢ Fail | |

## Test Coverage

| Test Type | Status |
|-----------|--------|
| Tenant Isolation | ▢ Exists / ▢ Missing |
| Auth Tests | ▢ Exists / ▢ Missing |
| CI Pipeline | ▢ Exists / ▢ Missing |

## Multi-Tenant Compliance

▢ Compliant / ▢ Violations Found

---

## Recommended ZIP Sequence

1. **ZIP-SECURITY-01**: [Brief description] - 🔴 Critical
2. **ZIP-TEST-01**: [Brief description] - 🔴 Critical  
3. **ZIP-QUALITY-01**: [Brief description] - 🟡 Important
4. **ZIP-FEATURE-XX**: [Next feature] - When above complete

---

## Documents Generated

- [ ] IMPLEMENTATION-LOG.md populated
- [ ] TECHNICAL-FLUENCY.md generated
- [ ] DECISIONS.md populated
- [ ] APP-SPECIFICATION.md (reverse-engineered)
- [ ] Remediation ZIPs created

---

## Next Steps

1. Review this report
2. Confirm findings are accurate
3. Begin ZIP-SECURITY-01 (or highest priority)
4. Do NOT add features until security/quality ZIPs complete

---

Ready for your review before proceeding.
```

---

## Quick Bootstrap Command

When you open Claude Code in an existing project, just say:

```
bootstrap
```

Claude will:
1. Read this file
2. Execute all steps
3. Generate the report
4. Wait for your confirmation

---

## If The Codebase Is A Mess

If you find:
- Critical security vulnerabilities
- Missing RLS on user data
- Exposed secrets
- No tests whatsoever

**Be honest.** Document it. Create security ZIPs.

**Do NOT add features to an insecure codebase.**

Fix security first. Always.
