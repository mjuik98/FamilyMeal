# Polling And Archive Optimizations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce repeated archive computations and trim always-on client/runtime overhead in layout-level monitoring and PWA maintenance paths.

**Architecture:** Precompute archive engagement metrics once per meal instead of recalculating them during every filter and sort path. Move client error capture and service worker cleanup out of inline layout scripts into focused client components, keep cleanup to a versioned one-time run, and only poll for app updates when a service worker registration is actually present.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Firebase Firestore, node:test

---

## Chunk 1: Regression Coverage

### Task 1: Lock the optimization expectations in tests

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [x] **Step 1: Add failing assertions for externalized client error monitoring**
- [x] **Step 2: Add failing assertions for one-time service worker cleanup**
- [x] **Step 3: Add failing assertions for derived archive meal metrics**
- [x] **Step 4: Add failing assertions for service-worker-gated update polling**
- [x] **Step 5: Run `npm run test:ui` and confirm the new assertions fail before implementation**

## Chunk 2: Layout Runtime Cleanup

### Task 2: Replace inline layout scripts with focused client components

**Files:**
- Create: `components/ClientErrorMonitor.tsx`
- Create: `components/ServiceWorkerCleanup.tsx`
- Modify: `app/layout.tsx`

- [x] **Step 1: Add a dedicated client error monitor component**
- [x] **Step 2: Add a service worker cleanup component with versioned one-time storage gating**
- [x] **Step 3: Remove inline `next/script` payloads from the root layout**
- [x] **Step 4: Keep PWA-disabled cleanup conditional at layout render time**

## Chunk 3: Data And Polling Tightening

### Task 3: Reduce repeated calculations and unnecessary polling

**Files:**
- Modify: `lib/data.ts`
- Modify: `components/AppUpdateBanner.tsx`

- [x] **Step 1: Introduce derived archive meal metrics for comment/reaction/activity counts**
- [x] **Step 2: Filter and sort using the derived metrics instead of recomputing counts**
- [x] **Step 3: Gate update polling on an actual service worker registration**
- [x] **Step 4: Start recurring polling only after registration setup succeeds**

## Chunk 4: Verification

### Task 4: Re-run targeted and full verification

**Files:**
- Verify only

- [x] **Step 1: Run `npm run test:ui`**
- [x] **Step 2: Run `npm run test:api`**
- [x] **Step 3: Run `npm run lint`**
- [x] **Step 4: Run `npm run typecheck`**
- [x] **Step 5: Run `npm run build` and `npm run build:clean`**
