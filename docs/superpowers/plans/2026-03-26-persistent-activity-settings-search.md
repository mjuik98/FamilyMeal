# Persistent Activity, Settings, And Search Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 활동 피드를 영속 로그와 읽음 처리 기반으로 전환하고, 알림 설정/검색 확장/QA 회귀를 함께 정리한다.

**Architecture:** 댓글과 반응 API에서 사용자별 activity 문서를 함께 갱신하고, 홈은 해당 컬렉션 subscription과 meal별 댓글 subscription을 조합해 실시간 요약을 그린다. 프로필은 사용자 문서의 알림 설정을 서버 route로 저장하고 홈 브라우저 알림 게이트에 반영한다.

**Tech Stack:** Next.js App Router, Firebase client/admin SDK, Firestore rules, React 19, Playwright, node:test

---

### Task 1: Add failing tests for persistent activity and settings

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/e2e/comment-input-visibility.spec.ts`
- Modify: `tests/firestore.rules.test.mjs`

- [ ] Add static assertions for activity route/helpers and profile settings route
- [ ] Add QA E2E scenario for unread badge, mark-all-read, notification settings
- [ ] Add rules test for reading own activity and denying others

### Task 2: Add shared activity/settings types and helpers

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/activity.ts`
- Modify: `lib/data.ts`
- Modify: `lib/qa.ts`

- [ ] Add notification preference and activity types
- [ ] Add client subscription/update helpers for user activity and settings
- [ ] Expand QA data for persistent feed and unread/read transitions

### Task 3: Persist activity documents from server routes

**Files:**
- Create: `lib/activity-log.ts`
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/reactions/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/reactions/route.ts`

- [ ] Write server helper that upserts/removes user activity docs
- [ ] Hook comment creation to meal owner / reply recipient activity creation
- [ ] Hook reaction toggles to activity upsert/remove

### Task 4: Add profile settings route and rules

**Files:**
- Create: `app/api/profile/settings/route.ts`
- Modify: `context/UserContext.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `firestore.rules`

- [ ] Save notification preferences through server route
- [ ] Expose context method for updating preferences
- [ ] Render settings toggles in profile UI
- [ ] Allow users to read/update own activity read state in rules

### Task 5: Switch home to persistent activity subscriptions and richer filters

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/ActivityFeed.tsx`
- Modify: `components/ActivitySummary.tsx`
- Modify: `components/FilterChips.tsx`
- Modify: `app/styles/activity.css`

- [ ] Replace computed feed source with persistent activity subscription
- [ ] Add unread count and mark-all-read action
- [ ] Respect saved notification preferences before showing browser notifications
- [ ] Add minimum reaction filter and activity-heavy sort option

### Task 6: Verify end-to-end

**Files:**
- Modify only if verification finds issues

- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run test:ui`
- [ ] Run `npm run test:api`
- [ ] Run `npm run build`
- [ ] Run `npx playwright test tests/e2e/comment-input-visibility.spec.ts`
- [ ] Run `npm run test:rules`
