# Meal Detail, Archive, And Draft Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate meal browsing from interaction by moving comments/reactions into detail, add a dedicated archive route, enrich weekly date thumbnails, and shorten the add flow with remembered defaults.

**Architecture:** Home and archive use a new summary-card component, while the existing interactive meal card becomes the detail surface behind a dedicated route. Weekly stats gain preview thumbnails, QA data expands to a full week dataset, and add-flow defaults are stored locally for fast repeat entry.

**Tech Stack:** Next.js App Router, React, TypeScript, Firebase client SDK, localStorage helpers, Playwright, Node test runner

---

## Chunk 1: Tests First

### Task 1: Update static UI expectations

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [ ] Step 1: Assert dedicated meal detail and archive routes plus summary-card usage
- [ ] Step 2: Run `npm run test:ui`
- [ ] Step 3: Confirm failure before implementation

### Task 2: Update E2E flows

**Files:**
- Modify: `tests/e2e/comment-input-visibility.spec.ts`

- [ ] Step 1: Move meal interaction tests to the detail route flow
- [ ] Step 2: Add archive and add-default persistence checks
- [ ] Step 3: Run targeted Playwright tests and confirm failure

## Chunk 2: Data And Mock Support

### Task 3: Expand weekly preview data

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`
- Modify: `lib/qa.ts`

- [ ] Step 1: Add a reusable weekly stat type with preview image support
- [ ] Step 2: Update real weekly stats query to include preview image URLs
- [ ] Step 3: Expand QA meals into a deterministic week dataset with thumbnails

### Task 4: Add add-flow draft helpers

**Files:**
- Create: `lib/meal-draft.ts`
- Modify: `app/add/page.tsx`

- [ ] Step 1: Add local storage helpers for type and participant defaults
- [ ] Step 2: Restore defaults on page open
- [ ] Step 3: Persist defaults on successful save

## Chunk 3: Routes And Components

### Task 5: Create meal summary card and use it on home

**Files:**
- Create: `components/MealPreviewCard.tsx`
- Modify: `app/page.tsx`
- Modify: `app/styles/layout.css`

- [ ] Step 1: Build a photo-led summary card with open-detail CTA
- [ ] Step 2: Replace home list rendering with summary cards
- [ ] Step 3: Add a home link to archive

### Task 6: Add dedicated meal detail route

**Files:**
- Create: `app/meals/[id]/page.tsx`
- Modify: `components/MealCard.tsx` only if detail-specific polish is needed

- [ ] Step 1: Load one meal by id
- [ ] Step 2: Reuse existing interactive meal card on the detail route
- [ ] Step 3: Handle missing and unauthorized records safely

### Task 7: Add archive route

**Files:**
- Create: `app/archive/page.tsx`
- Modify: `lib/data.ts`
- Modify: `app/styles/layout.css`

- [ ] Step 1: Add a recent-meals query helper for archive landing state
- [ ] Step 2: Render search and simple filters in archive
- [ ] Step 3: Reuse summary cards for archive results

## Chunk 4: Polish And Verification

### Task 8: Upgrade week strip visuals

**Files:**
- Modify: `components/WeekDateStrip.tsx`
- Modify: `app/styles/layout.css`

- [ ] Step 1: Render thumbnails for days with representative images
- [ ] Step 2: Keep selection and count states readable on mobile
- [ ] Step 3: Preserve accessibility and test ids

### Task 9: Verify end to end

**Files:**
- Verify only

- [ ] Step 1: Run `npm run lint`
- [ ] Step 2: Run `npm run typecheck`
- [ ] Step 3: Run `npm run test:ui`
- [ ] Step 4: Run `npm run test:api`
- [ ] Step 5: Run `npm run build`
- [ ] Step 6: Run `npm run test:rules`
- [ ] Step 7: Run `npx playwright test tests/e2e/comment-input-visibility.spec.ts`
