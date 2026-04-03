# Legacy Read And Edit Effect Tightening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict legacy read fallback to true legacy documents, make legacy write denial explicit in rules, narrow edit-page reload triggers, and align unknown delete-status messaging with the actual error path.

**Architecture:** Keep the change set local to Firestore rules, the edit page, and delete error handling. Add regression tests first, then make the smallest code changes needed to satisfy them.

**Tech Stack:** Next.js, TypeScript, Firebase Firestore rules, Node test runner, Playwright

---

### Task 1: Add regression coverage

**Files:**
- Modify: `tests/firestore.rules.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`

- [ ] Step 1: Add a failing rules test showing a modern meal with `userId` set does not grant read access to that role.
- [ ] Step 2: Add failing static assertions for legacy-only `userId` read fallback and explicit owner guards in rules.
- [ ] Step 3: Add failing static assertions for narrowed edit effect dependencies and unexpected delete-status message mapping.
- [ ] Step 4: Run targeted tests and confirm the new checks fail for the intended reasons.

### Task 2: Implement minimal fixes

**Files:**
- Modify: `firestore.rules`
- Modify: `app/edit/[id]/page.tsx`
- Modify: `components/MealCard.tsx`
- Modify: `lib/meal-errors.ts`

- [ ] Step 1: Restrict `userId` participation checks to legacy documents and guard owner comparisons explicitly.
- [ ] Step 2: Narrow the edit-page load effect to primitive identity dependencies and a toast ref.
- [ ] Step 3: Remove the unreachable delete-status UI fallback and map `Unexpected delete status` through shared error copy.

### Task 3: Verify end to end

**Files:**
- Modify: none

- [ ] Step 1: Run `npm run test:rules`.
- [ ] Step 2: Run `npm run test:api`.
- [ ] Step 3: Run `npm run test:ui`.
- [ ] Step 4: Run `npm run ci:verify`.
