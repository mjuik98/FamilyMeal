# Modern Write Preview Delete Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent new deprecated `userId` writes, clean old ones during server updates, eliminate add/edit preview races, and harden detail delete UX against duplicate actions.

**Architecture:** Keep the changes inside the existing Firestore rules, meal update use case, detail card, summary actions, and add/edit page modules. Add regression coverage first, then apply the smallest behavior changes that satisfy those regressions.

**Tech Stack:** Next.js, TypeScript, Firebase Firestore rules, Node test runner, Playwright

---

### Task 1: Add regression coverage

**Files:**
- Modify: `tests/firestore.rules.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`

- [ ] Step 1: Add a failing Firestore rules test showing modern meal creation with `userId` is rejected.
- [ ] Step 2: Add failing static assertions for deprecated-field cleanup in server meal updates.
- [ ] Step 3: Add failing static assertions for delete pending state and add/edit preview request sequencing.
- [ ] Step 4: Run the targeted tests and confirm the new checks fail for the expected reasons.

### Task 2: Implement minimal fixes

**Files:**
- Modify: `firestore.rules`
- Modify: `lib/server/meals/meal-use-cases.ts`
- Modify: `components/MealCard.tsx`
- Modify: `components/meal-detail/MealDetailSummary.tsx`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`

- [ ] Step 1: Block deprecated `userId` on modern create and direct client mutation paths.
- [ ] Step 2: Delete stale `userId` during modern server updates and stop feeding it back into keyword generation.
- [ ] Step 3: Add local delete pending state and informational handling for `already_processing`.
- [ ] Step 4: Add latest-request-wins guards to add/edit image preview reads.

### Task 3: Verify end to end

**Files:**
- Modify: none

- [ ] Step 1: Run `node --test tests/api-security.test.mjs`.
- [ ] Step 2: Run `node --test tests/ui-theme.test.mjs`.
- [ ] Step 3: Run `node scripts/run-firestore-rules.mjs`.
- [ ] Step 4: Run `npm run ci:verify`.
