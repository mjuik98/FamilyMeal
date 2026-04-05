# Platform Boundaries Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move shared auth and HTTP error helpers under `lib/platform`, keep compatibility shims, and re-point callers to the new boundaries without changing runtime behavior.

**Architecture:** Preserve the modular monolith and Next.js runtime flow, but make `platform/auth` and `platform/http` the real home for cross-cutting concerns. Existing root and `lib/server` entrypoints remain as compatibility shims so the migration can stay incremental and low-risk.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner

---

### Task 1: Lock platform boundary expectations with tests

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Add failing assertions for platform-local auth/error/http implementations**
- [ ] **Step 2: Run the focused architecture tests and confirm they fail**
- [ ] **Step 3: Add minimal assertions for compatibility shims and updated imports**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**

### Task 2: Move platform implementations behind new paths

**Files:**
- Create: `lib/platform/http/route-errors.ts`
- Create: `lib/platform/http/auth-http.ts`
- Create: `lib/platform/auth/server-auth.ts`
- Create: `lib/platform/auth/route-auth.ts`
- Modify: `lib/route-errors.ts`
- Modify: `lib/client/auth-http.ts`
- Modify: `lib/server-auth.ts`
- Modify: `lib/server/route-auth.ts`

- [ ] **Step 1: Copy the current implementations into the new platform files**
- [ ] **Step 2: Convert the old entrypoints into re-export shims**
- [ ] **Step 3: Keep exported contracts identical so runtime callers do not break**
- [ ] **Step 4: Re-run focused tests**

### Task 3: Update callers to depend on platform boundaries directly

**Files:**
- Modify: `app/api/client-errors/route.ts`
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/meals/weekly-stats/route.ts`
- Modify: `app/api/uploads/meal-image/route.ts`
- Modify: `app/api/archive/route.ts`
- Modify: `app/api/profile/session/route.ts`
- Modify: `app/api/profile/role/route.ts`
- Modify: `app/api/profile/settings/route.ts`
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/route.ts`
- Modify: `app/api/meals/[id]/reactions/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/reactions/route.ts`
- Modify: `lib/platform/http/route-handler.ts`
- Modify: `lib/server/comments/comment-policy.ts`
- Modify: `lib/server/comments/comment-use-cases.ts`
- Modify: `lib/server/reactions/reaction-policy.ts`
- Modify: `lib/server/reactions/reaction-use-cases.ts`
- Modify: `lib/server/profile/profile-use-cases.ts`
- Modify: `lib/server/uploads/meal-image-use-cases.ts`
- Modify: `lib/client/meal-queries.ts`
- Modify: `lib/client/meal-mutations.ts`
- Modify: `lib/client/comments.ts`
- Modify: `lib/client/reactions.ts`
- Modify: `lib/client/activity.ts`
- Modify: `lib/client/profile-session.ts`
- Modify: `lib/uploadImage.ts`

- [ ] **Step 1: Point server-side imports to `@/lib/platform/auth/*` and `@/lib/platform/http/*`**
- [ ] **Step 2: Point client-side imports to `@/lib/platform/http/auth-http`**
- [ ] **Step 3: Leave tests on old paths only when explicitly validating shim behavior**
- [ ] **Step 4: Re-run focused tests**

### Task 4: Verify integrated behavior

**Files:**
- Verify only

- [ ] **Step 1: Run focused architecture and API tests**
- [ ] **Step 2: Run runtime tests that cover auth/error delivery**
- [ ] **Step 3: Run `npm run test`**
- [ ] **Step 4: Run `npm run lint`, `npm run typecheck`, and `npm run build`**
