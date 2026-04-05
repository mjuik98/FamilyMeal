# Meals Server Boundaries Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `meals` server-side implementations under `lib/modules/meals/server/*` while preserving route behavior and leaving compatibility shims behind.

**Architecture:** Keep the current modular monolith and Firebase-backed request flow, but make the `meals` module the real home for server query, mutation, archive, and storage helper logic. Existing `lib/server/meals/*` paths remain as shims so the migration stays incremental and low-risk.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner

---

### Task 1: Lock the meals-server boundary with tests

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/archive-query.test.mjs`
- Modify: `tests/ui-theme.test.mjs`

- [ ] **Step 1: Add failing assertions for module-local `meals` server implementations**
- [ ] **Step 2: Add failing assertions for legacy `lib/server/meals/*` shim behavior**
- [ ] **Step 3: Run focused tests and confirm they fail**
- [ ] **Step 4: Re-run after implementation and confirm they pass**

### Task 2: Move meals server implementations under the module

**Files:**
- Create: `lib/modules/meals/server/meal-types.ts`
- Create: `lib/modules/meals/server/meal-read-use-cases.ts`
- Create: `lib/modules/meals/server/meal-write-use-cases.ts`
- Create: `lib/modules/meals/server/meal-delete-use-cases.ts`
- Create: `lib/modules/meals/server/archive-types.ts`
- Create: `lib/modules/meals/server/archive-use-cases.ts`
- Create: `lib/modules/meals/server/meal-image-url.ts`
- Create: `lib/modules/meals/server/meal-storage.ts`
- Modify: `lib/server/meals/meal-types.ts`
- Modify: `lib/server/meals/meal-read-use-cases.ts`
- Modify: `lib/server/meals/meal-write-use-cases.ts`
- Modify: `lib/server/meals/meal-delete-use-cases.ts`
- Modify: `lib/server/meals/archive-types.ts`
- Modify: `lib/server/meals/archive-use-cases.ts`
- Modify: `lib/server/meals/meal-image-url.ts`
- Modify: `lib/server/meals/meal-storage.ts`

- [ ] **Step 1: Copy current implementations into module-local server files**
- [ ] **Step 2: Update intra-module imports to stay module-local**
- [ ] **Step 3: Convert old `lib/server/meals/*` files into re-export shims**
- [ ] **Step 4: Re-run focused tests**

### Task 3: Re-point routes to module-local meals server implementations

**Files:**
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/meals/weekly-stats/route.ts`
- Modify: `app/api/archive/route.ts`
- Modify: `app/api/uploads/meal-image/route.ts`

- [ ] **Step 1: Point meal list/create route to module-local `meals` server files**
- [ ] **Step 2: Point meal detail/update/delete route to module-local `meals` server files**
- [ ] **Step 3: Point archive and upload routes to module-local `meals` server files**
- [ ] **Step 4: Re-run focused tests**

### Task 4: Verify integrated behavior

**Files:**
- Verify only

- [ ] **Step 1: Run focused architecture/API/archive/UI tests**
- [ ] **Step 2: Run `npm run test`**
- [ ] **Step 3: Run `npm run lint` and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build`**
