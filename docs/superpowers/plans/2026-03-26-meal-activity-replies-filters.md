# Meal Activity, Replies, And Filters Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 활동 요약, 댓글 답글/멘션, 공통 UI 컴포넌트, rules 보강, 검색 필터를 추가한다.

**Architecture:** 댓글은 동일 서브컬렉션에서 `parentId` 기반 1단계 스레드로 관리하고, 홈 활동 요약은 선택 날짜의 식사와 댓글을 집계해 계산한다. 화면 구조는 공통 헤더/섹션/필터 컴포넌트로 정리한다.

**Tech Stack:** Next.js App Router, React 19, Firebase Firestore, Firestore Rules, Playwright, Node test

---

## Chunk 1: Tests

### Task 1: Add failing tests for replies, activity summary, and filters

**Files:**
- Modify: `tests/e2e/comment-input-visibility.spec.ts`
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/firestore.rules.test.mjs`

- [ ] Step 1: Add QA mock reply, activity summary, and filter assertions
- [ ] Step 2: Add static assertions for reply API and shared components
- [ ] Step 3: Add rules assertions for hardened reaction fields
- [ ] Step 4: Run targeted tests and watch them fail

## Chunk 2: Data And Rules

### Task 2: Extend comment types and APIs for threaded replies

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/route.ts`

- [ ] Step 1: Add parent/mention fields
- [ ] Step 2: Support reply creation and delete guard
- [ ] Step 3: Preserve reply metadata in edit/response paths
- [ ] Step 4: Run typecheck

### Task 3: Harden Firestore rules and tests

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore.rules.test.mjs`

- [ ] Step 1: Add reaction/read structure validation helpers
- [ ] Step 2: Keep client comment mutations denied
- [ ] Step 3: Verify rules tests

## Chunk 3: Home UX

### Task 4: Add activity summary and advanced filters

**Files:**
- Modify: `lib/qa.ts`
- Modify: `app/page.tsx`
- Create: `components/ActivitySummary.tsx`
- Create: `components/FilterChips.tsx`

- [ ] Step 1: Expand QA meal set for realistic filtering/activity
- [ ] Step 2: Render summary cards and interaction alerts
- [ ] Step 3: Add type/participant/sort filters to search results and day list
- [ ] Step 4: Run E2E coverage

### Task 5: Add shared page primitives

**Files:**
- Create: `components/PageHeader.tsx`
- Create: `components/SurfaceSection.tsx`
- Modify: `app/page.tsx`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`
- Modify: `app/profile/page.tsx`

- [ ] Step 1: Replace repeated header/section markup with shared components
- [ ] Step 2: Keep behavior unchanged while reducing duplication
- [ ] Step 3: Re-run lint and UI tests

## Chunk 4: Comment UX

### Task 6: Add reply/mention UI to MealCard

**Files:**
- Modify: `components/MealCard.tsx`

- [ ] Step 1: Group comments into parent + reply threads
- [ ] Step 2: Add reply actions and reply state UI
- [ ] Step 3: Keep optimistic comment/reaction flows working in QA and live modes
- [ ] Step 4: Run E2E and build
