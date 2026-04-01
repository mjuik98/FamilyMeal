# Maintainability, Security, And Comment Runtime Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 댓글 구독 비용, 레거시 권한 위험, 느슨한 직렬화, API 에러 중복, 무거운 식사 상세 상태 관리를 한 번에 정리한다.

**Architecture:** 서버 쪽은 공통 route error 유틸과 명시적 meal 직렬화를 사용하고, 레거시 role 기반 삭제 권한을 더 이상 허용하지 않는다. 클라이언트 쪽은 meal 단위 댓글 구독을 공유 캐시로 통합하고, `MealCard` 의 상태/액션 로직을 커스텀 훅과 유틸로 분리해 렌더링 컴포넌트 역할을 선명하게 만든다.

**Tech Stack:** Next.js App Router, React 19, Firebase Firestore, TypeScript, node:test, ESLint, tsc

---

### Task 1: Lock down backend primitives

**Files:**
- Create: `lib/route-errors.ts`
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/reactions/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/reactions/route.ts`
- Modify: `app/api/profile/settings/route.ts`
- Modify: `app/api/profile/role/route.ts`
- Modify: `app/api/uploads/meal-image/route.ts`
- Test: `tests/api-security.test.mjs`

- [ ] Add failing source-level regression checks for shared route error usage and tightened legacy delete permission.
- [ ] Run `npm run test:api` and confirm the new checks fail for the current code.
- [ ] Implement `lib/route-errors.ts` and migrate route files to it without changing response shapes.
- [ ] Remove role-only legacy delete permission from comment delete flow while preserving owner/author access.
- [ ] Re-run `npm run test:api` and confirm the checks pass.

### Task 2: Replace loose meal serialization with explicit mapping

**Files:**
- Modify: `lib/data.ts`
- Test: `tests/api-security.test.mjs`

- [ ] Add a failing regression check that `lib/data.ts` no longer uses `...data` plus `as Meal` in `convertMeal`/`getMealById`.
- [ ] Run `npm run test:api` and confirm the new serialization check fails first.
- [ ] Extract a shared explicit serializer in `lib/data.ts` and update all client-side meal readers to use it.
- [ ] Remove the stale `buildActivityFeed` export if it is still unused after the serializer refactor.
- [ ] Re-run `npm run test:api`.

### Task 3: Share comment subscriptions and split `MealCard` logic

**Files:**
- Create: `lib/meal-comments-store.ts`
- Create: `lib/time.ts`
- Create: `components/hooks/useMealComments.ts`
- Create: `components/hooks/useMealReactions.ts`
- Modify: `components/MealCard.tsx`
- Modify: `components/comments/CommentItem.tsx`
- Modify: `components/comments/CommentThread.tsx`
- Modify: `components/meal-detail/MealConversationPanel.tsx`
- Test: `tests/ui-theme.test.mjs`

- [ ] Add failing regression checks that comment subscriptions are shared through a store module and `MealCard` uses extracted hooks/utilities.
- [ ] Run `npm run test:ui` and confirm the new checks fail first.
- [ ] Implement a shared comment subscription store with reference counting and snapshot fan-out by meal id.
- [ ] Move comment CRUD state into `useMealComments` and reaction state into `useMealReactions`.
- [ ] Move relative time formatting into `lib/time.ts` and import it where needed.
- [ ] Re-run `npm run test:ui`.

### Task 4: Apply low-risk cleanup tied to the refactor

**Files:**
- Modify: `components/Navbar.tsx`
- Modify: `components/WeekDateStrip.tsx`
- Modify: `app/styles/layout.css`
- Modify: `lib/qa.ts`
- Test: `tests/ui-theme.test.mjs`

- [ ] Add failing regression checks for CSS-based navbar styling, week strip accessibility labels, and readable QA Korean strings.
- [ ] Run `npm run test:ui` and confirm the checks fail first.
- [ ] Move navbar styles into `app/styles/layout.css` without disturbing existing user edits.
- [ ] Add descriptive `aria-label` values to week date buttons.
- [ ] Replace escaped Korean literals in `lib/qa.ts` with direct Korean text.
- [ ] Re-run `npm run test:ui`.

### Task 5: Full verification

**Files:**
- Modify only as required by fixes from verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test:api`.
- [ ] Run `npm run test:ui`.
- [ ] Run `npm run build`.
- [ ] Fix any regressions and re-run the failing command until all checks are green.
