# Runtime And Bundle Optimizations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce initial client cost and avoid unnecessary work in update polling, client error ingestion, and weekly stats loading.

**Architecture:** Keep behavior stable while moving optional client code behind runtime gates and lazy boundaries. Home lazily loads the calendar UI, the root layout only mounts the update banner when PWA mode is enabled, `/api/client-errors` rejects oversized payloads before body reads when possible, and weekly stats reuse a lighter Firestore snapshot path with less effect churn in the hook.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Firebase Firestore, node:test

---

## Chunk 1: Regression Coverage

### Task 1: Lock the new optimization expectations in tests

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [x] **Step 1: Add failing assertions for lazy calendar loading**
- [x] **Step 2: Add failing assertions for server-gated PWA banner loading**
- [x] **Step 3: Add failing assertions for early content-length rejection**
- [x] **Step 4: Add failing assertions for weekly stats cache/query optimization**
- [x] **Step 5: Run `npm run test:ui` and confirm the new assertions fail before implementation**

## Chunk 2: Client Bundle Gating

### Task 2: Lazy-load the calendar and update banner

**Files:**
- Create: `components/LazyCalendar.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [x] **Step 1: Add a focused lazy calendar wrapper**
- [x] **Step 2: Replace direct `react-calendar` imports in home with a dynamic boundary**
- [x] **Step 3: Replace eager update banner import with a dynamic client-only import**
- [x] **Step 4: Mount the update banner only when `publicEnv.enablePwa` is true**

## Chunk 3: API And Data Path Tightening

### Task 3: Reduce unnecessary server and Firestore work

**Files:**
- Modify: `app/api/client-errors/route.ts`
- Modify: `components/hooks/useWeeklyStats.ts`
- Modify: `lib/data.ts`

- [x] **Step 1: Split client error payload-size validation into header and body checks**
- [x] **Step 2: Run the header check before reading the request body**
- [x] **Step 3: Reduce weekly stats hook effect churn to the current week cache entry**
- [x] **Step 4: Add a lightweight weekly-stats snapshot serializer instead of full meal normalization**

## Chunk 4: Verification

### Task 4: Re-run targeted and full verification

**Files:**
- Verify only

- [x] **Step 1: Run `npm run test:ui`**
- [x] **Step 2: Run `npm run test:api`**
- [x] **Step 3: Run `npm run lint`**
- [x] **Step 4: Run `npm run typecheck`**
- [x] **Step 5: Run `npm run build` and `npm run build:clean`**
