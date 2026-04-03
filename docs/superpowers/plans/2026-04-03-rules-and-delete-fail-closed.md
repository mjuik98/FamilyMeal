# Rules And Delete Fail-Closed Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Firestore rules, serializers, delete state handling, and edit-page async guards with the current fail-closed server behavior.

**Architecture:** Keep the changes local to the existing rules, serializer, mutation helper, and route page modules. Add regression coverage first, then make the minimal code changes needed to satisfy those regressions.

**Tech Stack:** Next.js, TypeScript, Firebase Firestore rules, Playwright, Node test runner

---

### Task 1: Add regression coverage

**Files:**
- Modify: `tests/firestore.rules.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`

- [ ] Step 1: Add a failing Firestore rules test showing a legacy participant cannot update a legacy meal.
- [ ] Step 2: Add failing static assertions for empty-array participant fallback in both serializers.
- [ ] Step 3: Add failing static assertions for delete-status validation and edit-page request guards.
- [ ] Step 4: Run `npm run test:rules && npm run test:api && npm run test:ui` and confirm the new checks fail for the expected reasons.

### Task 2: Implement minimal fixes

**Files:**
- Modify: `firestore.rules`
- Modify: `lib/server/meals/meal-types.ts`
- Modify: `lib/client/serializers.ts`
- Modify: `lib/client/meal-mutations.ts`
- Modify: `components/MealCard.tsx`
- Modify: `app/edit/[id]/page.tsx`

- [ ] Step 1: Remove the legacy participant update allowance from Firestore rules.
- [ ] Step 2: Normalize `userIds` with a fallback when the filtered array is empty.
- [ ] Step 3: Validate delete statuses against a closed union and keep the UI fail-closed.
- [ ] Step 4: Add request-sequencing guards to the edit page load flow.

### Task 3: Verify end to end

**Files:**
- Modify: none

- [ ] Step 1: Run `npm run test:rules`.
- [ ] Step 2: Run `npm run test:api`.
- [ ] Step 3: Run `npm run test:ui`.
- [ ] Step 4: Run `npm run ci:verify`.
