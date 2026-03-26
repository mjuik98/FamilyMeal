# Photo-First Home And Bottom Dock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild home around weekly date selection and meal imagery while making the bottom navigation feel like a persistent mobile dock.

**Architecture:** Keep the existing data model and meal-card interactions, but replace the home composition with a weekly journal header and photo-led daily feed. Move the main navigation to a stronger fixed dock and update tests to match the new structure before implementation.

**Tech Stack:** Next.js App Router, React, TypeScript, existing CSS files, Playwright, Node test runner

---

## Chunk 1: Tests First

### Task 1: Update static UI expectations

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [ ] Step 1: Write failing assertions for the new home and dock structure
- [ ] Step 2: Run `npm run test:ui`
- [ ] Step 3: Confirm it fails because home still references removed dashboard/filter surfaces

### Task 2: Update E2E expectations

**Files:**
- Modify: `tests/e2e/comment-input-visibility.spec.ts`

- [ ] Step 1: Replace dashboard/filter-specific home assertions with weekly-strip and persistent-dock assertions
- [ ] Step 2: Run `npx playwright test tests/e2e/comment-input-visibility.spec.ts -g "qa mock mode shows weekly date journal and persistent dock"`
- [ ] Step 3: Confirm it fails before implementation

## Chunk 2: Home Redesign

### Task 3: Add a focused weekly date strip component

**Files:**
- Create: `components/WeekDateStrip.tsx`
- Modify: `app/page.tsx`

- [ ] Step 1: Create a reusable weekly strip component with selected state, counts, and test ids
- [ ] Step 2: Integrate it into home above the meal list
- [ ] Step 3: Keep inline calendar expansion for non-week jumps

### Task 4: Remove home dashboard and filter surfaces

**Files:**
- Modify: `app/page.tsx`

- [ ] Step 1: Remove activity summary/feed and search/filter sections from the render tree
- [ ] Step 2: Simplify state to only what the redesigned home still needs
- [ ] Step 3: Preserve meal subscription and empty-state behavior

## Chunk 3: Navigation And Supporting Surfaces

### Task 5: Upgrade the persistent bottom dock

**Files:**
- Modify: `components/Navbar.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/styles/layout.css`
- Modify: `app/globals.css`

- [ ] Step 1: Make dock visibility and spacing deterministic with app-shell padding
- [ ] Step 2: Emphasize the center compose action and improve safe-area behavior
- [ ] Step 3: Add stable test ids for dock visibility checks

### Task 6: Tighten the add screen hierarchy

**Files:**
- Modify: `app/add/page.tsx`

- [ ] Step 1: Bring image capture area higher in the visual hierarchy
- [ ] Step 2: Shorten copy and align with photo-first positioning
- [ ] Step 3: Preserve existing validation and submission flow

## Chunk 4: Polish And Verification

### Task 7: Align styles with the new visual hierarchy

**Files:**
- Modify: `app/styles/layout.css`
- Modify: `app/globals.css`
- Modify: `components/MealCard.tsx` (only if needed for small hierarchy polish)

- [ ] Step 1: Add weekly-strip, journal-header, and dock styles
- [ ] Step 2: Ensure meals remain image-led on home
- [ ] Step 3: Keep spacing compatible with the fixed dock

### Task 8: Run full verification

**Files:**
- Verify only

- [ ] Step 1: Run `npm run lint`
- [ ] Step 2: Run `npm run typecheck`
- [ ] Step 3: Run `npm run test:ui`
- [ ] Step 4: Run `npm run test:api`
- [ ] Step 5: Run `npm run build`
- [ ] Step 6: Run `npm run test:rules`
- [ ] Step 7: Run `npx playwright test tests/e2e/comment-input-visibility.spec.ts`
