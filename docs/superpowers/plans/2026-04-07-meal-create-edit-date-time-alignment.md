# Meal Create/Edit Date Time Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose editable date and time inputs on the create meal form so create and edit share the same timestamp-oriented UI and save behavior.

**Architecture:** Keep the single `timestamp` model end to end. Add a small pure date/time default helper in `lib/date-utils.ts`, render a shared date/time field block from both add and edit pages, and have the add page controller validate and combine the user-selected date/time before calling the existing create service.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Node test runner, React Test Renderer

---

## Chunk 1: Lock the Behavior in Tests

### Task 1: Add failing tests for create-form date/time alignment

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/meal-read-runtime.test.mts`
- Modify: `tests/meal-editor-service-runtime.test.mts`

- [ ] **Step 1: Write a failing source-level test for add-page date/time inputs**
  Add assertions that `app/add/page.tsx` exposes `type="date"`, `type="time"`, `data-testid="add-meal-date-input"`, and `data-testid="add-meal-time-input"`, and that `lib/modules/meals/ui/useAddMealPageController.ts` uses `combineDateAndTime` and `formatTimeKey`.

- [ ] **Step 2: Run the focused source test and verify it fails for the missing create date/time UI**
  Run: `node --test tests/ui-theme.test.mjs`
  Expected: FAIL with missing add-page date/time assertions.

- [ ] **Step 3: Add a failing runtime test for create date/time defaults**
  Add a date-utils test that expects a helper to preserve the query date while sourcing the initial time from `now`, and to fall back to the current date/time when no query date is supplied.

- [ ] **Step 4: Run the focused runtime test and verify it fails for the missing helper**
  Run: `npm exec -- node --import tsx --experimental-test-module-mocks --test tests/meal-read-runtime.test.mts`
  Expected: FAIL because the new date-utils helper does not exist yet.

- [ ] **Step 5: Add runtime coverage for create timestamp forwarding**
  Extend `tests/meal-editor-service-runtime.test.mts` with a successful non-QA create test that asserts the saved payload includes the selected `timestamp`.

## Chunk 2: Implement Shared Date/Time UI and Create Controller Wiring

### Task 2: Add a shared meal date/time field block

**Files:**
- Create: `components/meal-editor/MealDateTimeFields.tsx`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`

- [ ] **Step 1: Create `MealDateTimeFields` with shared labels, inputs, and test id support**
- [ ] **Step 2: Replace the inline edit-page date/time markup with the shared component**
- [ ] **Step 3: Render the same component on the add page inside `MealDetailsSection`**

### Task 3: Add create-form date/time state and validation

**Files:**
- Modify: `lib/date-utils.ts`
- Modify: `lib/modules/meals/ui/useAddMealPageController.ts`

- [ ] **Step 1: Add a pure helper in `lib/date-utils.ts` for create-form date/time defaults**
- [ ] **Step 2: Initialize add-page `recordDateValue` and `recordTimeValue` from query date plus current time**
- [ ] **Step 3: Validate create-form date/time with `combineDateAndTime` before saving**
- [ ] **Step 4: Pass the combined `recordDate` to `createMealRecord` and redirect using the selected date**

## Chunk 3: Green the Tests and Verify the Feature

### Task 4: Run focused verification until green

**Files:**
- Test: `tests/ui-theme.test.mjs`
- Test: `tests/meal-read-runtime.test.mts`
- Test: `tests/meal-editor-service-runtime.test.mts`

- [ ] **Step 1: Run `node --test tests/ui-theme.test.mjs` and verify it passes**
- [ ] **Step 2: Run `npm exec -- node --import tsx --experimental-test-module-mocks --test tests/meal-read-runtime.test.mts tests/meal-editor-service-runtime.test.mts` and verify both pass**

### Task 5: Run broader regression coverage

**Files:**
- Test: `tests/api-security.test.mjs`
- Test: `tests/meal-form-runtime.test.mts`
- Test: `tests/meal-image-runtime.test.mts`

- [ ] **Step 1: Run `npm test` from the worktree and verify the full suite remains green**
- [ ] **Step 2: Inspect the diff and summarize the behavioral change plus any important assumptions**
