# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve behavior while moving meals helper logic into module-local structure, extracting page orchestration controllers, and standardizing route handler delivery.

**Architecture:** Keep the current modular monolith and Firebase runtime model. Introduce new internal seams first, leave compatibility shims in place, and prove behavior with architecture and utility tests before moving callers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner

---

### Task 1: Lock the new structure with tests

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Create: `tests/route-handler-runtime.test.mts`

- [ ] **Step 1: Add failing structure/runtime tests**
- [ ] **Step 2: Run the new tests and confirm they fail**
- [ ] **Step 3: Implement the minimal code to satisfy them**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**

### Task 2: Move meals helpers behind module-local implementations

**Files:**
- Create: `lib/modules/meals/domain/meal-image-policy.ts`
- Create: `lib/modules/meals/domain/meal-form.ts`
- Create: `lib/modules/meals/domain/meal-copy.ts`
- Create: `lib/modules/meals/domain/meal-draft.ts`
- Create: `lib/modules/meals/ui/meal-error-messages.ts`
- Modify: `lib/meal-image-policy.ts`
- Modify: `lib/meal-form.ts`
- Modify: `lib/meal-copy.ts`
- Modify: `lib/meal-draft.ts`
- Modify: `lib/meal-errors.ts`

- [ ] **Step 1: Add module-local implementations**
- [ ] **Step 2: Convert legacy root files into shims**
- [ ] **Step 3: Update direct callers where useful**
- [ ] **Step 4: Re-run focused structure tests**

### Task 3: Extract add/edit page controllers

**Files:**
- Create: `lib/modules/meals/ui/useAddMealPageController.ts`
- Create: `lib/modules/meals/ui/useEditMealPageController.ts`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`

- [ ] **Step 1: Add failing boundary tests for page/controller split**
- [ ] **Step 2: Implement add/edit controllers**
- [ ] **Step 3: Slim the pages down to composition**
- [ ] **Step 4: Run focused tests**

### Task 4: Standardize route delivery

**Files:**
- Create: `lib/platform/http/route-handler.ts`
- Modify: `app/api/profile/session/route.ts`
- Modify: `app/api/profile/role/route.ts`
- Modify: `app/api/profile/settings/route.ts`
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/route.ts`
- Modify: `app/api/meals/[id]/reactions/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/reactions/route.ts`
- Modify: `app/api/archive/route.ts`
- Modify: `app/api/version/route.ts`

- [ ] **Step 1: Add failing route wrapper tests**
- [ ] **Step 2: Implement wrapper**
- [ ] **Step 3: Migrate low-risk routes first**
- [ ] **Step 4: Run focused tests**

### Task 5: Verify integrated behavior

**Files:**
- Verify only

- [ ] **Step 1: Run architecture and focused runtime tests**
- [ ] **Step 2: Run lint and typecheck**
- [ ] **Step 3: Run broader API/runtime regression suite**
