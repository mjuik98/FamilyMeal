# Security And Archive Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock down unsafe upload and legacy mutation paths, move archive access to a server-backed paginated API, and strengthen verification coverage.

**Architecture:** Keep current module boundaries, but move archive querying into server-side use-case helpers and authenticated route handlers. Apply fail-closed authorization for legacy meal mutations and remove caller-controlled upload paths so risky behavior disappears rather than being hidden behind conventions.

**Tech Stack:** Next.js Route Handlers, Firebase Admin SDK, Firebase client SDK, TypeScript, Node test runner, Playwright

---

## Chunk 1: Upload and authorization hardening

### Task 1: Lock upload paths to server-generated locations

**Files:**
- Modify: `app/api/uploads/meal-image/route.ts`
- Modify: `lib/uploadImage.ts`
- Test: `tests/api-security.test.mjs`

- [ ] Step 1: Write the failing regression test for path removal.
- [ ] Step 2: Run `npm run test:api` and confirm the new assertion fails for the current code.
- [ ] Step 3: Remove external `path` support from the upload helper and route.
- [ ] Step 4: Run `npm run test:api` and confirm the regression passes.

### Task 2: Fail closed for legacy meal mutation authorization

**Files:**
- Modify: `lib/server/meals/meal-use-cases.ts`
- Modify: `lib/server/meals/meal-types.ts`
- Modify: `docs/architecture.md`
- Test: `tests/api-security.test.mjs`

- [ ] Step 1: Write the failing regression test that forbids legacy participant mutation fallback.
- [ ] Step 2: Run `npm run test:api` and confirm the new assertion fails.
- [ ] Step 3: Replace fallback authorization with explicit owner requirement for update/delete.
- [ ] Step 4: Run `npm run test:api` and confirm the regression passes.

### Task 3: Add owner backfill helper for legacy meals

**Files:**
- Create: `scripts/backfill-meal-owners.mjs`
- Test: `tests/api-security.test.mjs`

- [ ] Step 1: Write the failing regression test that requires the migration helper.
- [ ] Step 2: Run `npm run test:api` and confirm the test fails.
- [ ] Step 3: Add a dry-run/backfill script that assigns `ownerUid` only when it can be inferred safely.
- [ ] Step 4: Run `npm run test:api` and confirm the regression passes.

## Chunk 2: Archive API and client migration

### Task 4: Add server-side archive query helpers and route

**Files:**
- Create: `app/api/archive/route.ts`
- Create: `lib/server/meals/archive-types.ts`
- Create: `lib/server/meals/archive-use-cases.ts`
- Modify: `lib/server-meals.ts`
- Test: `tests/api-security.test.mjs`

- [ ] Step 1: Write the failing regression test for the new archive route and server helpers.
- [ ] Step 2: Run `npm run test:api` and confirm the new assertions fail.
- [ ] Step 3: Implement validated archive query parsing, cursor handling, and serialized responses.
- [ ] Step 4: Run `npm run test:api` and confirm the regression passes.

### Task 5: Move archive page to the server-backed paginated client flow

**Files:**
- Modify: `lib/client/meal-queries.ts`
- Modify: `lib/client/meals.ts`
- Modify: `app/archive/page.tsx`
- Test: `tests/ui-theme.test.mjs`

- [ ] Step 1: Write the failing UI regression tests for archive pagination/search integration.
- [ ] Step 2: Run `npm run test:ui` and confirm the assertions fail.
- [ ] Step 3: Add authenticated archive client calls and update the page to use cursor pagination.
- [ ] Step 4: Run `npm run test:ui` and confirm the regression passes.

## Chunk 3: Verification pipeline

### Task 6: Strengthen CI coverage

**Files:**
- Modify: `package.json`
- Test: `tests/ui-theme.test.mjs`

- [ ] Step 1: Write the failing UI regression test for CI coverage changes if needed.
- [ ] Step 2: Run the relevant test command and confirm the assertion fails.
- [ ] Step 3: Add Playwright execution to the main verification script.
- [ ] Step 4: Run the relevant test command and confirm the regression passes.

### Task 7: Full verification

**Files:**
- Verify only

- [ ] Step 1: Run targeted API tests.
- [ ] Step 2: Run targeted UI tests.
- [ ] Step 3: Run lint.
- [ ] Step 4: Run typecheck.
- [ ] Step 5: Run e2e or document the exact blocker if environment prerequisites are missing.
