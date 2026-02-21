# CI Checks

> **Automated quality gates that run on every push.** Nothing merges if these fail.

---

## Overview

Every pull request must pass these automated checks before merging:

| Check | What It Catches | Blocks Merge? |
|-------|-----------------|---------------|
| TypeScript | Type errors | ✅ Yes |
| ESLint | Code quality issues | ✅ Yes |
| Build | Compilation failures | ✅ Yes |
| Tests | Broken functionality | ✅ Yes |
| Security Audit | Vulnerable dependencies | ✅ Yes |
| Secrets Scan | Exposed credentials | ✅ Yes |

---

## GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  # Add any env vars needed for build/test
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint

      - name: Build
        run: npm run build

  security:
    name: Security
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  test:
    name: Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          # Test environment variables
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

---

## Required package.json Scripts

Ensure your `package.json` has these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Branch Protection Rules

Configure in GitHub: Settings → Branches → Branch protection rules

### For `main` branch:

```
✅ Require a pull request before merging
  ✅ Require approvals: 1 (or more for teams)
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Status checks required:
    - Code Quality
    - Security
    - Tests

✅ Require conversation resolution before merging

✅ Do not allow bypassing the above settings
```

---

## Local Pre-Commit Hooks

Run checks locally before pushing. Install husky:

```bash
npm install -D husky lint-staged
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

Create `.lintstagedrc.js`:

```javascript
module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,md}': [
    'prettier --write',
  ],
}
```

---

## Test Configuration

### Vitest Setup

Install:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

### Example Test File

Create `tests/tenant-isolation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('Tenant Isolation', () => {
  it('should not allow cross-tenant data access', async () => {
    // Setup: Create two tenants with data
    const tenantA = await createTestTenant('A')
    const tenantB = await createTestTenant('B')
    
    const recordInA = await createRecord(tenantA, { name: 'Secret' })
    
    // Test: Try to access A's data as B
    const result = await fetchRecordAs(tenantB, recordInA.id)
    
    // Assert: Should be denied
    expect(result).toBeNull() // or expect 403/404
  })
})
```

---

## Secrets Scanning

### TruffleHog (in CI)

Already included in the workflow above. Scans for:
- API keys
- Passwords
- Private keys
- Tokens

### GitGuardian (Alternative)

```yaml
- name: GitGuardian scan
  uses: GitGuardian/ggshield-action@v1
  env:
    GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
```

### Pre-Commit Secret Detection

```bash
npm install -D @secretlint/secretlint-rule-preset-recommend secretlint
```

Create `.secretlintrc.json`:

```json
{
  "rules": [
    {
      "id": "@secretlint/secretlint-rule-preset-recommend"
    }
  ]
}
```

Add to lint-staged:

```javascript
module.exports = {
  '*': ['secretlint'],
  // ... other rules
}
```

---

## Database Migration Checks

If using Supabase migrations:

```yaml
  migrations:
    name: Migration Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Validate migrations
        run: supabase db lint
```

---

## Deployment Gates

### Vercel Integration

Vercel automatically:
- Runs `npm run build`
- Creates preview deployments for PRs
- Only deploys to production on merge to main

### Additional Vercel Checks

In `vercel.json`:

```json
{
  "github": {
    "silent": false,
    "autoJobCancelation": true
  },
  "buildCommand": "npm run build",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD -- ."
}
```

---

## Check Failure Responses

### TypeScript Errors

```
Error: Type 'string' is not assignable to type 'number'
```

**Action:** Fix the type error. Do not use `any` or `@ts-ignore`.

### ESLint Errors

```
Error: 'x' is defined but never used
```

**Action:** Remove unused code or disable rule with justification comment.

### Security Audit Failures

```
found 2 high severity vulnerabilities
```

**Action:** 
1. Run `npm audit fix`
2. If can't auto-fix, check if vulnerability affects your code
3. Update the package or find alternative

### Secrets Detected

```
Detected AWS Access Key ID
```

**Action:**
1. IMMEDIATELY rotate the exposed credential
2. Remove from code
3. Add to environment variables
4. Check git history and clean if needed

---

## CI Dashboard

View all CI runs:
- GitHub: Actions tab in your repository
- Vercel: Deployments tab in your project

### Status Badges

Add to README:

```markdown
![CI](https://github.com/username/repo/workflows/CI/badge.svg)
![Deploy](https://vercel.com/button/deploy-status)
```

---

## Minimum Viable CI

If you're just starting, this is the minimum:

```yaml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm audit --audit-level=high
```

This catches:
- Build failures
- Type errors (if using TypeScript)
- High-severity vulnerabilities

Add more checks as your project matures.

---

## Checklist

```markdown
## CI Setup Checklist

- [ ] `.github/workflows/ci.yml` created
- [ ] Branch protection rules configured
- [ ] Status checks required for merge
- [ ] Husky pre-commit hooks installed
- [ ] Test framework configured
- [ ] Secrets scanning enabled
- [ ] Team notified of CI requirements
```
