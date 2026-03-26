# Photo Detail, Archive, and Fast Add Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식사 상세를 사진 중심으로 재구성하고, 작성 흐름을 단축하며, 주간 스트립과 아카이브를 탐색형으로 강화한다.

**Architecture:** 상세 화면은 사진 무대, 메타 요약, 대화 패널로 나누고, 작성 화면은 자동 설명과 날짜 복귀를 추가한다. 홈은 날짜 쿼리를 읽고 주간 스트립 상태를 강화하며, 아카이브는 월별 그룹과 탐색 칩을 계산형 UI로 확장한다.

**Tech Stack:** Next.js App Router, React client components, existing Firebase data helpers, Playwright, Node test runner

---

## Chunk 1: Tests First

### Task 1: 정적 테스트 업데이트

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [ ] 상세 분리 컴포넌트, 빠른 저장, 아카이브 월 그룹 기대값을 추가한다.
- [ ] `npm run test:ui`를 실행해 실패를 확인한다.

### Task 2: E2E 기대 시나리오 갱신

**Files:**
- Modify: `tests/e2e/comment-input-visibility.spec.ts`

- [ ] 같은 날 상세 이동, 설명 없이 저장, 아카이브 더 보기, 오늘 미기록 강조 시나리오를 추가한다.
- [ ] 해당 Playwright 테스트만 실행해 실패를 확인한다.

## Chunk 2: Detail Refactor

### Task 3: 상세 화면 분해

**Files:**
- Create: `components/meal-detail/MealPhotoStage.tsx`
- Create: `components/meal-detail/MealDetailSummary.tsx`
- Create: `components/meal-detail/MealConversationPanel.tsx`
- Modify: `components/MealCard.tsx`
- Modify: `app/meals/[id]/page.tsx`

- [ ] `MealCard`의 사진/메타/대화 책임을 나눈다.
- [ ] 상세 화면에서 같은 날짜의 기록 목록을 불러오고 현재 식사를 기준으로 썸네일 이동을 붙인다.
- [ ] 확대 보기와 같은 날 이동이 모두 동작하는지 검증한다.

## Chunk 3: Fast Add and Home Date Return

### Task 4: 빠른 작성 저장

**Files:**
- Modify: `app/add/page.tsx`
- Modify: `lib/meal-draft.ts`
- Create or Modify: `lib/meal-copy.ts`
- Modify: `app/page.tsx`

- [ ] 설명이 비어 있어도 기본 문구를 생성해 저장되게 한다.
- [ ] 저장 후 `?date=` 쿼리로 홈 복귀가 되도록 한다.
- [ ] 홈이 쿼리 날짜를 초기 선택값으로 읽도록 한다.
- [ ] 빠른 저장 카피와 보조 UI를 추가한다.

## Chunk 4: Week Strip and Archive Exploration

### Task 5: 주간 스트립 상태 강화

**Files:**
- Modify: `components/WeekDateStrip.tsx`
- Modify: `app/styles/layout.css`

- [ ] 오늘 미기록, 기록 있음, 선택 상태를 클래스와 데이터 속성으로 노출한다.
- [ ] 썸네일/카운트 배지를 더 선명하게 보이도록 조정한다.

### Task 6: 아카이브 탐색 확장

**Files:**
- Modify: `app/archive/page.tsx`
- Modify: `lib/data.ts`
- Modify: `components/MealPreviewCard.tsx`

- [ ] 결과를 월별로 그룹핑한다.
- [ ] 초기 노출 개수를 제한하고 `더 보기`를 추가한다.
- [ ] 현재 결과 기준 자주 함께 먹은 사람 추천 칩을 계산한다.

## Chunk 5: Verification

### Task 7: 전체 검증

**Files:**
- Modify as needed based on regressions

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:ui`
- [ ] `npm run test:api`
- [ ] `npm run test:rules`
- [ ] `npx playwright test tests/e2e/comment-input-visibility.spec.ts`
- [ ] `npm run build`
