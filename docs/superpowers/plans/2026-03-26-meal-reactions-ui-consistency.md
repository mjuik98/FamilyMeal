# Meal Reactions And UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식사/댓글 이모지 반응과 통일된 앱 UI 패턴을 추가한다.

**Architecture:** 서버 API에서 식사 문서와 댓글 문서의 반응 맵을 트랜잭션으로 토글하고, 클라이언트는 공통 반응 바 UI와 정규화 로직으로 렌더링한다. 화면은 기존 색 체계를 유지하면서 공통 셸/섹션/칩/버튼 클래스로 재구성한다.

**Tech Stack:** Next.js App Router, React 19, Firebase Firestore, Playwright, Node test

---

## Chunk 1: Tests First

### Task 1: Add failing reaction and UI consistency tests

**Files:**
- Modify: `tests/e2e/comment-input-visibility.spec.ts`
- Modify: `tests/ui-theme.test.mjs`

- [ ] Step 1: Add Playwright expectations for meal/comment reaction toggles in QA mock mode
- [ ] Step 2: Run the targeted Playwright test file and verify the new assertions fail for missing UI/data hooks
- [ ] Step 3: Add static test coverage for shared page shell classes and reaction API wiring
- [ ] Step 4: Run `node --test tests/ui-theme.test.mjs` and verify failure

## Chunk 2: Data And API

### Task 2: Add reaction types, normalization, and client helpers

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`
- Create: `lib/reactions.ts`

- [ ] Step 1: Add the failing types/helpers expectations from tests
- [ ] Step 2: Implement shared reaction constants and normalize helpers
- [ ] Step 3: Implement client helpers for meal/comment reaction toggle requests
- [ ] Step 4: Run lint/typecheck on changed files

### Task 3: Add server routes for toggling reactions

**Files:**
- Create: `app/api/meals/[id]/reactions/route.ts`
- Create: `app/api/meals/[id]/comments/[commentId]/reactions/route.ts`

- [ ] Step 1: Implement request parsing and emoji validation
- [ ] Step 2: Implement Firestore transaction toggle behavior
- [ ] Step 3: Return normalized reaction payloads
- [ ] Step 4: Re-run static tests

## Chunk 3: UI Integration

### Task 4: Add shared reaction bar and integrate meal/comment reactions

**Files:**
- Create: `components/ReactionBar.tsx`
- Modify: `components/MealCard.tsx`
- Modify: `app/qa/meal-card/page.tsx`
- Modify: `lib/qa.ts`

- [ ] Step 1: Render meal reaction bar with optimistic toggles
- [ ] Step 2: Render comment reaction bars with optimistic toggles
- [ ] Step 3: Ensure QA mock mode keeps reactions entirely local
- [ ] Step 4: Run targeted Playwright tests

### Task 5: Unify page shells and shared surface styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `components/Navbar.tsx`

- [ ] Step 1: Introduce shared layout/surface/button/chip classes
- [ ] Step 2: Refactor home page to shared classes while keeping existing behavior
- [ ] Step 3: Refactor add/edit/profile pages to the same system
- [ ] Step 4: Run UI/theme tests and typecheck

## Chunk 4: Verification

### Task 6: Full verification

**Files:**
- Modify as needed based on failures

- [ ] Step 1: Run `npm run lint`
- [ ] Step 2: Run `npm run typecheck`
- [ ] Step 3: Run `npm run test:ui`
- [ ] Step 4: Run `npm run test:e2e -- tests/e2e/comment-input-visibility.spec.ts`
- [ ] Step 5: Fix failures and re-run until green
