# Architecture Modularization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce architectural coupling without rewriting the app by extracting shared config/policy modules, splitting client data access by domain, and moving comment server logic into explicit use cases.

**Architecture:** Keep the existing Next.js modular monolith, but introduce clearer internal boundaries inside `lib/`, `app/api/`, `components/hooks/`, and `context/`. The end state of this plan is not a brand-new directory tree; it is a safer transition layer that makes later domain-by-domain moves realistic.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Firebase client SDK, Firebase Admin SDK, Zod, Node test runner

---

## Chunk 1: Shared Boundaries

### Task 1: Extract shared config and policy modules

**Files:**
- Create: `lib/config/public-env.ts`
- Create: `lib/config/server-env.ts`
- Create: `lib/domain/meal-policy.ts`
- Modify: `lib/env.ts`
- Modify: `lib/server-auth.ts`
- Modify: `lib/firebase-admin.ts`
- Modify: `lib/server-meals.ts`
- Modify: `app/api/uploads/meal-image/route.ts`
- Test: `tests/api-security.test.mjs`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run `npm run test:api` and verify the new assertions fail**
- [ ] **Step 3: Add focused config and policy modules with minimal behavior changes**
- [ ] **Step 4: Update server modules to read settings through shared config**
- [ ] **Step 5: Run `npm run test:api` and verify it passes**

## Chunk 2: Client Data Access Split

### Task 2: Split `lib/data.ts` into domain-scoped client adapters

**Files:**
- Create: `lib/client/http.ts`
- Create: `lib/client/meals.ts`
- Create: `lib/client/comments.ts`
- Create: `lib/client/reactions.ts`
- Create: `lib/client/activity.ts`
- Create: `lib/client/meal-query.ts`
- Create: `lib/client/profile.ts`
- Modify: `lib/data.ts`
- Modify: `components/MealPreviewCard.tsx`
- Modify: `components/MealCard.tsx`
- Modify: `components/hooks/useMealComments.ts`
- Modify: `components/hooks/useMealReactions.ts`
- Modify: `components/hooks/useMealsForDate.ts`
- Modify: `components/hooks/useWeeklyStats.ts`
- Modify: `app/archive/page.tsx`
- Modify: `app/meals/[id]/page.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `context/UserContext.tsx`
- Test: `tests/ui-theme.test.mjs`
- Test: `tests/api-security.test.mjs`

- [ ] **Step 1: Write failing structural tests that expect extracted client modules**
- [ ] **Step 2: Run the targeted tests and confirm failure**
- [ ] **Step 3: Move authenticated fetch, meal readers, comment mutations, reaction mutations, activity/profile helpers into separate files**
- [ ] **Step 4: Keep `lib/data.ts` as a compatibility barrel during the transition**
- [ ] **Step 5: Update UI modules to import from domain-scoped adapters**
- [ ] **Step 6: Run `npm run test:ui` and `npm run test:api`**

## Chunk 3: Comment Use Cases

### Task 3: Extract comment route logic into server use cases

**Files:**
- Create: `lib/server/comments/comment-types.ts`
- Create: `lib/server/comments/comment-policy.ts`
- Create: `lib/server/comments/comment-use-cases.ts`
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/route.ts`
- Test: `tests/api-security.test.mjs`

- [ ] **Step 1: Add failing tests that assert routes delegate to extracted use cases**
- [ ] **Step 2: Run `npm run test:api` and verify failure**
- [ ] **Step 3: Move transaction, payload parsing support, and response serialization into comment use-case helpers**
- [ ] **Step 4: Reduce route handlers to controller orchestration**
- [ ] **Step 5: Run `npm run test:api` and verify it passes**

## Chunk 4: Session/Profile Boundary Cleanup

### Task 4: Narrow `UserContext` responsibility

**Files:**
- Create: `lib/client/auth-http.ts`
- Create: `lib/client/profile-session.ts`
- Modify: `context/UserContext.tsx`
- Test: `tests/ui-theme.test.mjs`

- [ ] **Step 1: Add failing structural tests that expect extracted profile/session helpers**
- [ ] **Step 2: Run `npm run test:ui` and verify failure**
- [ ] **Step 3: Move profile fetch/update HTTP and normalization helpers out of the React context**
- [ ] **Step 4: Keep QA behavior intact while reducing direct infra knowledge in `UserContext`**
- [ ] **Step 5: Run `npm run test:ui` and verify it passes**

## Chunk 5: Full Verification

### Task 5: Verify the transition end-to-end

**Files:**
- Modify: `README.md` (only if command references or architecture notes need updates)
- Test: `tests/ui-theme.test.mjs`
- Test: `tests/api-security.test.mjs`

- [ ] **Step 1: Run `npm run lint`**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run test:ui`**
- [ ] **Step 4: Run `npm run test:api`**
- [ ] **Step 5: Run `npm run build`**
- [ ] **Step 6: Fix regressions and repeat until green**
