# Route Delivery Normalization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans (or subagent-driven-development when explicitly allowed) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the remaining API delivery entrypoints around `handleRoute`, move request/body parsing into shared platform helpers, and extract client error ingestion out of the route file without changing runtime behavior.

**Architecture:** Continue the modular monolith migration. `app/api/*` stays as thin delivery code, `lib/platform/http/*` owns request parsing and route-level ingestion helpers, and domain/server modules continue to own business behavior. Route files should parse inputs, call application/server functions, and rely on the shared error envelope instead of hand-written `try/catch` response mapping.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner, ESLint

---

### Task 1: Lock the new route boundary rules in tests

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`

- [ ] **Step 1: Extend the route wrapper assertions so `app/api/meals/route.ts`, `app/api/meals/[id]/route.ts`, `app/api/meals/weekly-stats/route.ts`, and `app/api/client-errors/route.ts` must use `handleRoute`**
- [ ] **Step 2: Move the client error route expectations from inline Upstash/body logic to a platform helper ownership assertion**
- [ ] **Step 3: Keep existing business-level expectations intact so the refactor stays structural, not behavioral**
- [ ] **Step 4: Run the focused UI and architecture suites and confirm the new assertions fail before implementation**

### Task 2: Extract shared HTTP request helpers

**Files:**
- Create: `lib/platform/http/request-body.ts`
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/profile/role/route.ts`
- Modify: `app/api/profile/settings/route.ts`
- Modify: `app/api/uploads/meal-image/route.ts`
- Modify: `lib/modules/comments/server/comment-policy.ts`
- Modify: `lib/modules/reactions/server/reaction-policy.ts`

- [ ] **Step 1: Add a shared JSON body parser that throws the standard route errors and optionally validates with Zod**
- [ ] **Step 2: Migrate the touched routes and policy helpers off local `request.json()` try/catch blocks**
- [ ] **Step 3: Preserve custom meal route error typing where it already exists**
- [ ] **Step 4: Re-run focused tests to prove the helper replaces duplication without changing contracts**

### Task 3: Thin down the remaining meal routes

**Files:**
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/meals/weekly-stats/route.ts`

- [ ] **Step 1: Wrap every handler in `handleRoute` and remove inline error payload/status mapping**
- [ ] **Step 2: Keep delete/create cleanup logic inside the route handler body, then rethrow into the shared wrapper**
- [ ] **Step 3: Leave server use cases unchanged so this stays a delivery-layer refactor**
- [ ] **Step 4: Re-run meal-focused tests to confirm GET/POST/PATCH/DELETE behavior is preserved**

### Task 4: Move client error ingestion out of the route file

**Files:**
- Create: `lib/platform/http/client-error-ingest.ts`
- Modify: `app/api/client-errors/route.ts`

- [ ] **Step 1: Move rate limiting, payload size validation, JSON parsing, and logging into a platform helper**
- [ ] **Step 2: Keep lazy Upstash loading and the in-memory fallback behavior unchanged**
- [ ] **Step 3: Make the route file a thin `handleRoute` wrapper around the helper**
- [ ] **Step 4: Re-run focused UI/architecture tests to confirm the route boundary is now clean**

### Task 5: Verify the integrated result

**Files:**
- Verify only

- [ ] **Step 1: Run the focused UI and architecture suites for the route delivery changes**
- [ ] **Step 2: Run `npm run test`**
- [ ] **Step 3: Run `npm run lint` and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build` with placeholder `NEXT_PUBLIC_*` environment values**
