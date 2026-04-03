# Archive Access And Cursor Stability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore archive authorization parity with Firestore rules, make pagination stable under concurrent writes, align edit UX with legacy mutation policy, and reduce brittle archive e2e assertions.

**Architecture:** Keep the authenticated archive route and server-side scan model, but push caller identity into the archive use case, anchor cursors to the last returned meal, and surface partial-scan state explicitly. Update the edit page to fail early for legacy meals instead of trying client-side owner adoption, then relax e2e assertions so they validate behavior instead of fixture-specific counts.

**Tech Stack:** Next.js Route Handlers, Firebase Admin SDK, Firebase client SDK, TypeScript, Node test runner, Playwright

---

## Chunk 1: Archive authorization and cursor semantics

### Task 1: Add failing coverage for participant-scoped archive results and stable cursors

**Files:**
- Modify: `tests/archive-query.test.mjs`
- Test: `tests/archive-query.test.mjs`

- [ ] Step 1: Add a failing test that excludes meals where the caller role is not a participant.
- [ ] Step 2: Add a failing test that expects cursor payloads to be seek-based rather than offset-based.
- [ ] Step 3: Run `npm run test:api -- tests/archive-query.test.mjs` or the nearest equivalent command and confirm the new assertions fail.

### Task 2: Implement archive auth filtering, seek cursors, and partial-result signaling

**Files:**
- Modify: `app/api/archive/route.ts`
- Modify: `lib/server/meals/archive-types.ts`
- Modify: `lib/server/meals/archive-use-cases.ts`
- Modify: `lib/client/meal-queries.ts`
- Modify: `app/archive/page.tsx`

- [ ] Step 1: Thread caller uid/role into the archive use case and enforce participant visibility.
- [ ] Step 2: Replace offset cursor parsing with a stable seek cursor based on the last delivered meal.
- [ ] Step 3: Return and render a partial-result indicator when the scan budget is exhausted.
- [ ] Step 4: Run the archive API tests again and confirm they pass.

## Chunk 2: Legacy edit UX alignment

### Task 3: Add failing coverage for legacy edit failure messaging

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Test: `tests/ui-theme.test.mjs`

- [ ] Step 1: Add a failing regression assertion for the new legacy edit messaging path.
- [ ] Step 2: Run `npm run test:ui` and confirm the assertion fails.

### Task 4: Remove client-side owner adoption and surface migration-required UX

**Files:**
- Modify: `app/edit/[id]/page.tsx`
- Modify: `lib/meal-errors.ts`

- [ ] Step 1: Remove `ownerUid` self-adoption from the edit submit path.
- [ ] Step 2: Prevent save attempts for legacy meals and show a migration-required message.
- [ ] Step 3: Re-run `npm run test:ui` and confirm the regression passes.

## Chunk 3: Less brittle archive e2e coverage

### Task 5: Relax QA archive assertions to behavior-focused expectations

**Files:**
- Modify: `tests/e2e/comment-input-visibility.spec.ts`
- Test: `tests/e2e/comment-input-visibility.spec.ts`

- [ ] Step 1: Replace exact archive card/month assertions with checks that prove filters and search change the visible result set.
- [ ] Step 2: Run `npm run test:e2e -- --grep \"archive supports search and filters\"` and confirm the test still covers the intended behavior.

## Chunk 4: Full verification

### Task 6: Run complete verification

**Files:**
- Verify only

- [ ] Step 1: Run targeted archive API tests.
- [ ] Step 2: Run targeted UI tests.
- [ ] Step 3: Run targeted e2e coverage.
- [ ] Step 4: Run `npm run ci:verify`.
