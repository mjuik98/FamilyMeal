# Read Path And State Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 기반 읽기 경로, stale 상태 방지, 인증 레이스 보호, 폼 제약 정합성을 한 번에 마무리한다.

**Architecture:** 식사 목록/주간 통계 읽기는 인증된 Route Handler 로 이동하고, 클라이언트는 이를 재사용하는 얇은 adapter 와 polling subscription facade 를 사용한다. 인증과 폼 상태는 현재 컴포넌트 구조를 유지하면서 경쟁 상태와 유효성만 좁게 보강한다.

**Tech Stack:** Next.js App Router, TypeScript, Firebase Admin SDK, Firebase client auth, Node test runner, react-test-renderer

---

## Chunk 1: Test Coverage First

### Task 1: Server meal read regression tests

**Files:**
- Create: `tests/meal-read-runtime.test.mts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the targeted runtime test to verify it fails**
- [ ] **Step 3: Implement the minimal server/client read path needed for the test**
- [ ] **Step 4: Re-run the targeted runtime test to verify it passes**

### Task 2: Auth race regression test

**Files:**
- Create: `tests/user-context-runtime.test.mts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the targeted runtime test to verify it fails**
- [ ] **Step 3: Add the minimal race guard in `context/UserContext.tsx`**
- [ ] **Step 4: Re-run the targeted runtime test to verify it passes**

### Task 3: Participant constraint regression test

**Files:**
- Modify: `tests/meal-image-runtime.test.mts`
- Modify: `lib/meal-form.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the targeted runtime test to verify it fails**
- [ ] **Step 3: Tighten the helper or submit guards with minimal code**
- [ ] **Step 4: Re-run the targeted runtime test to verify it passes**

## Chunk 2: Read Path Implementation

### Task 4: Server list/stats use cases and routes

**Files:**
- Modify: `lib/server/meals/meal-use-cases.ts`
- Modify: `app/api/meals/route.ts`
- Create: `app/api/meals/weekly-stats/route.ts`

- [ ] **Step 1: Add failing coverage already written in Chunk 1**
- [ ] **Step 2: Implement date-list and weekly-stats use cases**
- [ ] **Step 3: Expose them through authenticated route handlers**
- [ ] **Step 4: Re-run server meal read runtime tests**

### Task 5: Client read adapters and controllers

**Files:**
- Modify: `lib/client/meal-queries.ts`
- Modify: `lib/features/meals/ui/useWeeklyStatsController.ts`
- Modify: `lib/features/meals/ui/useMealsForDateController.ts`
- Modify: `app/meals/[id]/page.tsx`

- [ ] **Step 1: Switch date/stat reads to the new server APIs**
- [ ] **Step 2: Replace snapshot subscription with polling facade**
- [ ] **Step 3: Simplify weekly stats hook to explicit revalidation**
- [ ] **Step 4: Re-run targeted runtime and existing UI/API tests**

## Chunk 3: State Hardening

### Task 6: Auth state race guard

**Files:**
- Modify: `context/UserContext.tsx`

- [ ] **Step 1: Add request sequence guards around async profile loading**
- [ ] **Step 2: Verify race regression test passes**

### Task 7: Submit constraint alignment

**Files:**
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`
- Modify: `lib/meal-form.ts`

- [ ] **Step 1: Enforce non-empty participant selection before submit**
- [ ] **Step 2: Reflect the constraint in disabled states and messages**
- [ ] **Step 3: Re-run targeted runtime tests**

## Chunk 4: Final Verification

### Task 8: Adjust brittle source tests to the new architecture

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Update expectations from direct Firestore list reads to server-backed adapters**
- [ ] **Step 2: Keep assertions focused on architectural boundaries**

### Task 9: Full verification

**Files:**
- Modify: none

- [ ] **Step 1: Run `npm run lint`**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run test:ui`**
- [ ] **Step 4: Run `npm run test:api`**
- [ ] **Step 5: Run `npm run test:api:runtime`**
- [ ] **Step 6: Report any remaining unverified areas explicitly**
