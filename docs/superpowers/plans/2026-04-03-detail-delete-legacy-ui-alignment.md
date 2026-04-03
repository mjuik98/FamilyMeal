# Detail Delete And Legacy UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align meal detail/delete UX with server mutation policy, normalize legacy participant display consistently, and prevent stale detail fetches from overwriting newer state.

**Architecture:** Keep the existing page/component structure, but make ownership checks fail closed in `MealCard`, preserve delete route status through the client mutation helper, reuse the same legacy participant fallback wherever participant-derived UI is built, and add request sequencing to detail-page loads.

**Tech Stack:** Next.js App Router, TypeScript, Firebase client/auth HTTP helpers, Node test runner, Playwright

---

## Chunk 1: Regression coverage

### Task 1: Add failing UI/API regression assertions for detail/delete/legacy behavior

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] Step 1: Add failing assertions for fail-closed detail ownership, delete status handling, shared legacy participant fallback, and detail-page request sequencing.
- [ ] Step 2: Run `npm run test:ui` and `npm run test:api` to confirm the new assertions fail.

## Chunk 2: Client and UI implementation

### Task 2: Implement the detail/delete/legacy alignment changes

**Files:**
- Modify: `components/MealCard.tsx`
- Modify: `components/MealPreviewCard.tsx`
- Modify: `components/meal-detail/MealDetailSummary.tsx`
- Modify: `app/archive/page.tsx`
- Modify: `app/meals/[id]/page.tsx`
- Modify: `lib/client/meal-mutations.ts`
- Modify: `lib/client/meal-filters.ts`
- Modify: `lib/meal-errors.ts`

- [ ] Step 1: Make detail ownership checks require explicit `ownerUid`.
- [ ] Step 2: Preserve delete route status and map it to precise toast copy.
- [ ] Step 3: Normalize legacy participant fallback consistently across rendering/filtering paths.
- [ ] Step 4: Add request sequence guards to detail-page fetch effects.
- [ ] Step 5: Re-run `npm run test:ui` and `npm run test:api` and confirm they pass.

## Chunk 3: Browser verification

### Task 3: Keep archive/detail e2e behavior green

**Files:**
- Modify only if needed: `tests/e2e/comment-input-visibility.spec.ts`

- [ ] Step 1: Run the focused detail/archive Playwright coverage.
- [ ] Step 2: Fix any UI expectation drift uncovered by the new behavior.

## Chunk 4: Full verification

### Task 4: Run complete verification

**Files:**
- Verify only

- [ ] Step 1: Run targeted tests.
- [ ] Step 2: Run `npm run ci:verify`.
