# Architecture Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce cross-layer coupling by removing UI access to `lib/client/*`, routing meal/profile reads through authenticated server APIs, and hardening script environment resolution.

**Architecture:** Keep the current Next.js + Firebase modular monolith, but make boundaries more explicit. UI should depend on feature/domain APIs, server reads should centralize visibility/auth rules, and operational scripts should fail closed instead of guessing deployment context.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Client/Admin SDK, Node test runner, ESLint

---

### Task 1: Lock UI-to-client boundaries with tests

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Add a failing architecture test for direct `lib/client/*` imports from UI files**
- [ ] **Step 2: Run `node --test tests/architecture-boundaries.test.mjs tests/api-security.test.mjs` and confirm failure**
- [ ] **Step 3: Implement code changes that remove current violations and add the lint guard**
- [ ] **Step 4: Re-run `node --test tests/architecture-boundaries.test.mjs tests/api-security.test.mjs` and confirm the boundary checks pass**

### Task 2: Route meal detail reads through the server

**Files:**
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `lib/server/meals/meal-read-use-cases.ts`
- Modify: `lib/client/meal-queries.ts`

- [ ] **Step 1: Add a failing test for authenticated meal detail GET handling**
- [ ] **Step 2: Run `node --test tests/meal-read-runtime.test.mts` and confirm failure**
- [ ] **Step 3: Add server read use case + route GET + client query update**
- [ ] **Step 4: Re-run `node --test tests/meal-read-runtime.test.mts` and confirm the new path passes**

### Task 3: Route profile session reads through the server

**Files:**
- Add: `app/api/profile/session/route.ts`
- Modify: `lib/server/profile/profile-use-cases.ts`
- Modify: `lib/client/profile-session.ts`

- [ ] **Step 1: Add a failing source-level test for profile session route and client-session boundary**
- [ ] **Step 2: Run `node --test tests/api-security.test.mjs` and confirm failure**
- [ ] **Step 3: Implement the route and switch the client profile loader to authenticated HTTP**
- [ ] **Step 4: Re-run `node --test tests/api-security.test.mjs tests/user-context-runtime.test.mts` and confirm they pass**

### Task 4: Move pure meal presentation logic out of `lib/client`

**Files:**
- Add: `lib/domain/meal-engagement.ts`
- Modify: `lib/client/meal-filters.ts`
- Modify: `lib/client/meals.ts`
- Modify: `components/MealPreviewCard.tsx`
- Modify: `components/MealCard.tsx`
- Modify: `lib/features/meals/application/meal-editor-service.ts`
- Modify: `app/profile/page.tsx`

- [ ] **Step 1: Add or extend a failing boundary test covering current UI imports**
- [ ] **Step 2: Run the focused boundary tests and confirm failure**
- [ ] **Step 3: Extract pure helpers, route delete through the feature layer, and replace `lib/client/profile` usage with domain constants**
- [ ] **Step 4: Re-run the focused tests and confirm the UI layer no longer imports `lib/client/*`**

### Task 5: Harden admin script environment resolution

**Files:**
- Modify: `scripts/lib/firebase-admin-app.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Add a failing test that forbids a hardcoded Firebase project fallback**
- [ ] **Step 2: Run `node --test tests/api-security.test.mjs` and confirm failure**
- [ ] **Step 3: Make script env resolution fail closed when no project id is configured**
- [ ] **Step 4: Re-run `node --test tests/api-security.test.mjs` and confirm the script guard passes**

### Task 6: Verify the integrated result

**Files:**
- Modify: `package.json` only if verification coverage requires it

- [ ] **Step 1: Run `npm run test:api`**
- [ ] **Step 2: Run `npm run test:api:runtime`**
- [ ] **Step 3: Run `npm run lint`**
- [ ] **Step 4: Run `npm run typecheck`**
- [ ] **Step 5: Run `npm run build`**
