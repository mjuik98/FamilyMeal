# Architecture Refactor Execution Phase 2

> **For agentic workers:** Use `superpowers:executing-plans` to carry this plan through implementation and verification. Keep behavior stable, add tests before structural edits where practical, and leave compatibility shims in place until callers are migrated.

**Goal:** Finish the highest-value remaining architecture cleanup without rewriting the system: move meal image upload logic into the meals module, move comment read/subscription adapters into the comments module, and lock the new boundaries with tests and lint rules.

**Architecture:** Preserve the current modular monolith. Delivery stays in `app/api/*`, feature orchestration stays in `lib/features/*`, and external integration code moves under module-local adapters. Legacy root/server entrypoints remain as shims until every caller is moved.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner

---

### Task 1: Lock the new upload/comment boundaries with tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/meal-image-runtime.test.mts`
- Modify: `tests/meal-comment-service-runtime.test.mts`

- [ ] **Step 1: Add failing assertions for module-local upload and comment adapters**
- [ ] **Step 2: Run focused test suites and confirm the new assertions fail**
- [ ] **Step 3: Implement the minimal structure/code needed to satisfy them**
- [ ] **Step 4: Re-run focused tests and confirm they pass**

### Task 2: Move meal image upload logic into the meals module

**Files:**
- Create: `lib/modules/meals/adapters/storage/meal-image-upload.ts`
- Modify: `app/api/uploads/meal-image/route.ts`
- Modify: `lib/server/uploads/meal-image-use-cases.ts`

- [ ] **Step 1: Introduce a module-local upload adapter**
- [ ] **Step 2: Point the upload route at the module-local adapter**
- [ ] **Step 3: Convert the legacy upload file into a shim**
- [ ] **Step 4: Keep request/response and storage behavior unchanged**

### Task 3: Move comment read/subscription adapters into the comments module

**Files:**
- Create: `lib/modules/comments/adapters/firestore/comment-client.ts`
- Create: `lib/modules/comments/adapters/firestore/comment-subscription-store.ts`
- Modify: `lib/modules/comments/infrastructure/comment-runtime.ts`
- Modify: `lib/client/comments.ts`
- Modify: `lib/meal-comments-store.ts`

- [ ] **Step 1: Introduce module-local comment client/store adapters**
- [ ] **Step 2: Update the runtime adapter to depend on module-local adapters only**
- [ ] **Step 3: Convert the old root/client files into compatibility shims**
- [ ] **Step 4: Preserve QA behavior and optimistic UI contracts**

### Task 4: Harden the boundary and route delivery rules

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `app/api/uploads/meal-image/route.ts`

- [ ] **Step 1: Prevent modules from importing legacy upload/comment adapter paths directly**
- [ ] **Step 2: Switch the upload route to the shared route handler wrapper**
- [ ] **Step 3: Ensure error mapping stays centralized**

### Task 5: Verify the integrated result

**Files:**
- Verify only

- [ ] **Step 1: Run focused API/runtime/UI tests**
- [ ] **Step 2: Run lint and typecheck**
- [ ] **Step 3: Run the broader test suite needed to prove no regression**
