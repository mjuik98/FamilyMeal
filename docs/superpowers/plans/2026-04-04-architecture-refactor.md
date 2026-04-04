# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore clearer module boundaries without rewriting the app, while keeping current behavior stable.

**Architecture:** Introduce feature-level application services for meals and profile, push QA branching behind those services, split overloaded server meal use-cases by responsibility, and keep route handlers thin.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase client/admin SDK, Node test runner

---

## Chunk 1: Guardrails And Tests

### Task 1: Add failing architecture regression tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`
- Create: `tests/meal-read-service-runtime.test.mts`
- Create: `tests/meal-editor-service-runtime.test.mts`

- [ ] Add source-level assertions for thin meal routes and feature-level service imports.
- [ ] Add runtime tests for meal read service QA/remote branching.
- [ ] Add runtime tests for meal editor service upload/save/cleanup behavior.
- [ ] Run the focused tests to confirm they fail for the intended reason.

## Chunk 2: Feature Services

### Task 2: Introduce meals application services

**Files:**
- Create: `lib/features/meals/application/meal-read-service.ts`
- Create: `lib/features/meals/application/meal-editor-service.ts`
- Modify: `lib/features/meals/ui/useMealsForDateController.ts`
- Modify: `lib/features/meals/ui/useWeeklyStatsController.ts`
- Modify: `app/archive/page.tsx`
- Modify: `app/meals/[id]/page.tsx`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`

- [ ] Add a meal read service that selects QA or production data sources in one place.
- [ ] Add a meal editor service that centralizes add/edit submission flow and upload cleanup.
- [ ] Switch meals pages/controllers to those services.
- [ ] Run focused runtime tests and fix regressions.

### Task 3: Introduce profile session application service

**Files:**
- Create: `lib/features/profile/application/user-session-service.ts`
- Modify: `context/UserContext.tsx`

- [ ] Add a profile session service for QA-aware session/profile operations.
- [ ] Shrink `UserContext` to orchestration instead of mixed infrastructure logic.
- [ ] Run the user context runtime test.

## Chunk 3: Server Meal Boundaries

### Task 4: Split overloaded meal server use-cases

**Files:**
- Create: `lib/server/meals/meal-read-use-cases.ts`
- Create: `lib/server/meals/meal-write-use-cases.ts`
- Create: `lib/server/meals/meal-delete-use-cases.ts`
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/meals/weekly-stats/route.ts`

- [ ] Split meal read/write/delete responsibilities into focused modules.
- [ ] Update routes to import only the modules they need.
- [ ] Keep behavior and error contracts unchanged.
- [ ] Run meal API/runtime tests.

### Task 5: Unify meal route auth path

**Files:**
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `lib/server/route-auth.ts` (if helper expansion is needed)

- [ ] Replace direct `verifyRequestUser/getUserRole` orchestration with shared route auth helper usage where possible.
- [ ] Run focused auth/source regression tests.

## Chunk 4: Final Verification

### Task 6: Full verification sweep

**Files:**
- Modify only as needed for fixes discovered during verification

- [ ] Run `npm run test:ui`.
- [ ] Run `npm run test:api`.
- [ ] Run `npm run test:api:runtime`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
