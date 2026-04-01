# Loading And Auth Optimizations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove stale meal rendering after failed date loads, avoid redundant weekly stats reads within the same week, and enforce a server-only auth allowlist source.

**Architecture:** Keep the existing hook boundaries introduced in the previous refactor, but tighten each hook's state transitions. `useMealsForDate` will explicitly reset remote state when the selected date changes or when a subscription fails, `useWeeklyStats` will cache resolved stats by computed week key inside the hook, and `server-auth` will read only the server allowlist environment variable while preserving the early-reject JWT decode path.

**Tech Stack:** Next.js App Router, React hooks, Node test runner, Firebase client/admin SDKs

---

### Task 1: Lock the new behavior in tests

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Add source-level assertions for stale meal clearing and weekly cache usage**

Add assertions that `useMealsForDate` clears remote meals and resets the loaded key, and that `useWeeklyStats` keeps a week-keyed cache.

- [ ] **Step 2: Add source-level assertion that server auth no longer references `NEXT_PUBLIC_ALLOWED_EMAILS`**

Update the auth security test so it fails until the public env fallback is removed.

- [ ] **Step 3: Run the targeted tests and verify they fail**

Run: `node --test tests/ui-theme.test.mjs tests/api-security.test.mjs`
Expected: FAIL because the hooks and auth code do not yet match the new assertions.

### Task 2: Implement the hook and auth changes

**Files:**
- Modify: `components/hooks/useMealsForDate.ts`
- Modify: `components/hooks/useWeeklyStats.ts`
- Modify: `lib/server-auth.ts`
- Modify: `lib/data.ts`

- [ ] **Step 1: Prevent stale meals from surviving a failed or in-flight date load**

Reset remote meals and loading markers when the selected date changes away from the last loaded key, and clear remote meals on subscription error.

- [ ] **Step 2: Cache weekly stats by computed week key**

Compute a stable week key, serve cached results immediately when available, and store successful responses in the cache.

- [ ] **Step 3: Remove the public allowlist env fallback**

Read only `process.env.ALLOWED_EMAILS`, preserve the production fail-closed guard, and keep early JWT email rejection behavior unchanged.

- [ ] **Step 4: Remove dead client comment subscription code if it is no longer referenced**

Delete the unused `subscribeMealComments` export and keep related helpers intact only if they are still used elsewhere.

### Task 3: Verify targeted and full-project health

**Files:**
- Test: `tests/ui-theme.test.mjs`
- Test: `tests/api-security.test.mjs`

- [ ] **Step 1: Run targeted tests**

Run: `node --test tests/ui-theme.test.mjs tests/api-security.test.mjs`
Expected: PASS

- [ ] **Step 2: Run project verification**

Run:
- `npm run test:api`
- `npm run test:ui`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: all commands exit successfully.
