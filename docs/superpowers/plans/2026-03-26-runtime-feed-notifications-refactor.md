# Runtime Recovery, Feed, Notifications, And Comment Refactor Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 rules 실행 환경을 복구하고, 활동 피드/알림/검색/댓글 구조를 마무리한다.

**Architecture:** 로컬 JRE를 테스트 실행에만 주입하고, 홈 화면은 계산형 활동 피드와 브라우저 Notification API를 사용한다. 댓글 UI는 작은 클라이언트 컴포넌트들로 분리하고, 전역 CSS는 도메인별 파일로 import 한다.

**Tech Stack:** Next.js App Router, React 19, Firebase Rules Emulator, Playwright, Notification API, CSS imports

---

### Task 1: Recover local Java runtime for rules tests

**Files:**
- Modify: `package.json` (if needed)
- Create: helper scripts only if needed

- [ ] Download a local JRE into user-writable path
- [ ] Run rules tests with PATH/JAVA_HOME injection
- [ ] Keep app runtime untouched

### Task 2: Split comment UI into smaller components

**Files:**
- Create: `components/comments/CommentItem.tsx`
- Create: `components/comments/CommentThread.tsx`
- Create: `components/comments/CommentComposer.tsx`
- Modify: `components/MealCard.tsx`

- [ ] Move render logic into small components
- [ ] Preserve all existing test ids and behaviors
- [ ] Re-run E2E comment scenarios

### Task 3: Add activity feed and richer filters

**Files:**
- Create: `components/ActivityFeed.tsx`
- Modify: `components/ActivitySummary.tsx`
- Modify: `components/FilterChips.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/data.ts`

- [ ] Add computed activity feed items
- [ ] Add mine-only / engaged-only / 2+ comments filters
- [ ] Keep search and selected-date behavior intact

### Task 4: Add session-level browser interaction notifications

**Files:**
- Modify: `app/page.tsx`

- [ ] Track latest interaction signature
- [ ] Notify only on positive deltas
- [ ] Avoid noisy repeated alerts

### Task 5: Modularize CSS

**Files:**
- Modify: `app/globals.css`
- Create: `app/styles/layout.css`
- Create: `app/styles/forms.css`
- Create: `app/styles/comments.css`
- Create: `app/styles/activity.css`

- [ ] Move selectors by domain
- [ ] Keep theme tokens in globals
- [ ] Re-run build and UI/E2E tests
