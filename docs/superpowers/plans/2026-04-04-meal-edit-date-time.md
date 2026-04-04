# Meal Edit Date Time Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an existing meal record change its date and time through the edit flow while keeping ownership and validation rules intact.

**Architecture:** Keep the current single `timestamp` data model. Extend only the edit path: the client edit page derives and validates local date/time strings, the meal editor service forwards a combined timestamp, and the patch route plus server write use case persist it as a Firestore `Timestamp`.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Zod, Firebase/Firestore, Node test runner

---

## Chunk 1: Tests First

### Task 1: Lock the new edit behavior in tests

**Files:**
- Modify: `tests/meal-editor-service-runtime.test.mts`
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Write a failing runtime test for edit timestamp forwarding**
- [ ] **Step 2: Run `npm exec -- node --import tsx --experimental-test-module-mocks --test tests/meal-editor-service-runtime.test.mts` and verify the new test fails for missing `timestamp`**
- [ ] **Step 3: Add source assertions for edit-page date/time inputs and patch-route timestamp support**
- [ ] **Step 4: Run `node --test tests/ui-theme.test.mjs tests/api-security.test.mjs` and verify the new assertions fail**

## Chunk 2: Implement the Timestamp Edit Path

### Task 2: Add edit-page date/time state and submission wiring

**Files:**
- Modify: `app/edit/[id]/page.tsx`
- Modify: `lib/date-utils.ts`
- Modify: `lib/features/meals/application/meal-editor-service.ts`

- [ ] **Step 1: Add small date/time formatting and parsing helpers**
- [ ] **Step 2: Prefill edit-page date/time state from `meal.timestamp`**
- [ ] **Step 3: Validate and combine date/time values before submit**
- [ ] **Step 4: Pass the combined timestamp through `updateExistingMealRecord`**

### Task 3: Persist timestamp updates through the mutation stack

**Files:**
- Modify: `lib/client/meal-mutations.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `lib/server/meals/meal-types.ts`
- Modify: `lib/server/meals/meal-write-use-cases.ts`

- [ ] **Step 1: Allow `timestamp` in the client PATCH payload**
- [ ] **Step 2: Extend the patch schema and update input type to include `timestamp`**
- [ ] **Step 3: Write the new Firestore timestamp in `updateMealDocument`**
- [ ] **Step 4: Keep the returned serialized meal aligned with the saved timestamp**

## Chunk 3: Verify End to End

### Task 4: Run focused verification

**Files:**
- Test: `tests/meal-editor-service-runtime.test.mts`
- Test: `tests/ui-theme.test.mjs`
- Test: `tests/api-security.test.mjs`

- [ ] **Step 1: Run `npm exec -- node --import tsx --experimental-test-module-mocks --test tests/meal-editor-service-runtime.test.mts`**
- [ ] **Step 2: Run `node --test tests/ui-theme.test.mjs tests/api-security.test.mjs`**
- [ ] **Step 3: If all pass, summarize behavior change and residual risks**
