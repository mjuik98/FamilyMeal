# Project Improvement Sweep Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans (or subagent-driven-development when explicitly allowed) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the highest-value improvement sweep across architecture, page orchestration, accessibility, and verification so the codebase is easier to change without altering core product behavior.

**Architecture:** Keep the current modular monolith and tighten it instead of rewriting it. `meals` should follow the same adapter boundary rules already used by other modules, page components should delegate request/auth orchestration to focused controller hooks, and small UX/accessibility fixes should be applied in place with regression tests before each production change.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner, ESLint

---

## Chunk 1: Lock the target boundaries and UX contracts

### Task 1: Add failing tests for meals server adapter ownership

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/api-security.test.mjs`

- [ ] **Step 1: Add failing assertions that `lib/modules/meals/server/*` no longer import `@/lib/firebase-admin` directly**
- [ ] **Step 2: Add failing assertions that meal routes import module-local adapters/use-cases consistent with the new boundary**
- [ ] **Step 3: Run `node --test tests/architecture-boundaries.test.mjs tests/api-security.test.mjs` and confirm the new assertions fail for the old structure**

### Task 2: Add failing tests for page-controller ownership

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/meal-read-service-runtime.test.mts`

- [ ] **Step 1: Add failing assertions that home/archive/detail pages delegate to module-local controller hooks**
- [ ] **Step 2: Add runtime-facing assertions for the controller contracts where needed**
- [ ] **Step 3: Run `node --test tests/ui-theme.test.mjs` and the targeted runtime suite to confirm failure before implementation**

### Task 3: Add failing tests for accessibility and profile feedback

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/user-context-runtime.test.mts`

- [ ] **Step 1: Add failing assertions for icon-button labels, image overlay dialog semantics, and profile save feedback hooks**
- [ ] **Step 2: Run the focused UI/runtime suites and confirm the new checks fail**

## Chunk 2: Refactor meals boundaries and page orchestration

### Task 4: Move meals persistence behind module-local adapters

**Files:**
- Create: `lib/modules/meals/adapters/firestore/meal-admin-store.ts`
- Create: `lib/modules/meals/adapters/firestore/meal-archive-store.ts`
- Create: `lib/modules/meals/adapters/firestore/meal-delete-store.ts`
- Modify: `lib/modules/meals/server/meal-read-use-cases.ts`
- Modify: `lib/modules/meals/server/meal-write-use-cases.ts`
- Modify: `lib/modules/meals/server/archive-use-cases.ts`
- Modify: `lib/modules/meals/server/meal-delete-use-cases.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Introduce focused Firestore adapters for meal reads, archive scans, writes, and delete jobs**
- [ ] **Step 2: Repoint meals server use-cases at those adapters without changing API contracts**
- [ ] **Step 3: Extend lint rules so meals server code cannot import `@/lib/firebase-admin` directly**
- [ ] **Step 4: Run focused architecture/API/runtime tests and confirm they pass**

### Task 5: Extract home/archive/detail controller hooks

**Files:**
- Create: `lib/modules/meals/ui/useHomePageController.ts`
- Create: `lib/modules/meals/ui/useArchivePageController.ts`
- Create: `lib/modules/meals/ui/useMealDetailPageController.ts`
- Modify: `app/page.tsx`
- Modify: `app/archive/page.tsx`
- Modify: `app/meals/[id]/page.tsx`

- [ ] **Step 1: Write page-level controller hooks that own auth gates, request sequencing, and derived view state**
- [ ] **Step 2: Update each page component to focus on layout and bind to the new controller only**
- [ ] **Step 3: Re-run focused UI/runtime tests to confirm behavior stays stable**

## Chunk 3: Accessibility, feedback, and test hardening

### Task 6: Improve button and dialog accessibility

**Files:**
- Modify: `components/meal-detail/MealPhotoStage.tsx`
- Modify: `components/meal-detail/MealDetailSummary.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add explicit `aria-label` values to icon-only actions**
- [ ] **Step 2: Turn the image overlay into a labeled modal dialog with keyboard-friendly close behavior**
- [ ] **Step 3: Re-run the focused UI tests and confirm the new accessibility assertions pass**

### Task 7: Improve profile notification save feedback

**Files:**
- Modify: `app/profile/page.tsx`
- Modify: `context/UserContext.tsx`

- [ ] **Step 1: Add toast/error handling around notification preference saves**
- [ ] **Step 2: Preserve or restore previous visible state when saves fail**
- [ ] **Step 3: Re-run the focused runtime/UI tests and confirm the feedback contract passes**

### Task 8: Reduce brittle UI test coupling where implementation details are over-specified

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [ ] **Step 1: Keep high-signal structural assertions but remove checks that only lock incidental implementation details**
- [ ] **Step 2: Prefer user-visible/accessibility contracts and controller-entrypoint ownership checks**
- [ ] **Step 3: Re-run `node --test tests/ui-theme.test.mjs` and confirm the suite stays green**

## Chunk 4: Integrated verification

### Task 9: Run the full verification stack

**Files:**
- Verify only

- [ ] **Step 1: Run `npm run test`**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run `npm run typecheck`**
- [ ] **Step 4: Run `npm run build` with placeholder `NEXT_PUBLIC_*` environment values**
