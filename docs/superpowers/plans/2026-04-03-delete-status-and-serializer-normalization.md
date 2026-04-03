# Delete Status And Serializer Normalization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the delete/detail cleanup by handling `already_deleted` correctly, exiting dead detail routes after terminal delete outcomes, normalizing server participant data, and aligning the remaining client keyword matcher with legacy participant fallback.

**Architecture:** Keep current route and component boundaries, but make deletion status a structured result all the way into `MealCard`, add an optional delete-complete callback for the detail page, normalize legacy `userId` into `userIds` in the server serializer, and update the residual client-side keyword helper to match on normalized participant roles.

**Tech Stack:** Next.js App Router, TypeScript, Firebase client/admin helpers, Node test runner, Playwright

---

## Chunk 1: Regression coverage

### Task 1: Add failing tests for delete terminal states and serializer normalization

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] Step 1: Add failing assertions for `already_deleted` handling, delete completion callback wiring, server serializer participant normalization, and legacy-aware client keyword matching.
- [ ] Step 2: Run `npm run test:ui` and `npm run test:api` to confirm the new assertions fail.

## Chunk 2: Implementation

### Task 2: Implement delete status completion and serializer normalization

**Files:**
- Modify: `components/MealCard.tsx`
- Modify: `app/meals/[id]/page.tsx`
- Modify: `lib/client/meal-mutations.ts`
- Modify: `lib/client/meal-queries.ts`
- Modify: `lib/server/meals/meal-types.ts`

- [ ] Step 1: Preserve structured delete statuses with terminal-state handling in `MealCard`.
- [ ] Step 2: Redirect from the real detail page after `completed` and `already_deleted`.
- [ ] Step 3: Normalize legacy `userId` into `userIds` in the server serializer.
- [ ] Step 4: Make the remaining client keyword helper search normalized participant roles.
- [ ] Step 5: Re-run `npm run test:ui` and `npm run test:api` and confirm they pass.

## Chunk 3: Verification

### Task 3: Run focused browser checks and full verification

**Files:**
- Verify only

- [ ] Step 1: Run focused Playwright coverage for archive/detail.
- [ ] Step 2: Run `npm run ci:verify`.
