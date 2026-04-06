# Module Feature Convergence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans (or subagent-driven-development when explicitly allowed) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the active application and UI entrypoints from `lib/features/*` into `lib/modules/*` without breaking the running system, while preserving legacy feature paths as compatibility shims.

**Architecture:** Keep the current modular monolith and continue the incremental migration strategy. `lib/modules/*` becomes the real home for domain-facing application/UI logic, while `lib/features/*` remains only as a shallow re-export layer until every caller and test is migrated. Also fix the clean-install runtime dependency drift so new worktrees and fresh installs behave like the warmed main workspace.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner, ESLint

---

### Task 1: Lock clean-install runtime dependencies before refactoring

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/architecture-boundaries.test.mjs`

- [ ] **Step 1: Add a failing assertion that the runtime dependency required by server Firebase imports is declared explicitly**
- [ ] **Step 2: Run the focused architecture/boundary test and confirm it fails on the current clean-install state**
- [ ] **Step 3: Add the minimal package dependency needed to make fresh installs deterministic**
- [ ] **Step 4: Re-run the focused test and the affected runtime suites to confirm the clean-install failure is gone**

### Task 2: Add failing tests for module-local application and UI ownership

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/meal-read-service-runtime.test.mts`
- Modify: `tests/meal-editor-service-runtime.test.mts`
- Modify: `tests/meal-comment-service-runtime.test.mts`
- Modify: `tests/meal-reaction-service-runtime.test.mts`

- [ ] **Step 1: Add failing assertions that app/components/context and module-local controllers import `lib/modules/*` instead of `lib/features/*`**
- [ ] **Step 2: Add failing assertions that the legacy `lib/features/*` files are compatibility shims only**
- [ ] **Step 3: Update runtime tests to target the future module-local application paths and confirm they fail before implementation**
- [ ] **Step 4: Run the focused UI, architecture, and runtime suites and verify the new expectations fail for the right reason**

### Task 3: Create module-local application and UI entrypoints

**Files:**
- Create: `lib/modules/meals/application/meal-read-service.ts`
- Create: `lib/modules/meals/application/meal-editor-service.ts`
- Create: `lib/modules/comments/application/meal-comment-service.ts`
- Create: `lib/modules/reactions/application/meal-reaction-service.ts`
- Create: `lib/modules/profile/application/user-session-service.ts`
- Create: `lib/modules/meals/ui/useMealsForDateController.ts`
- Create: `lib/modules/meals/ui/useWeeklyStatsController.ts`
- Create: `lib/modules/comments/ui/useMealCommentsController.ts`
- Create: `lib/modules/comments/ui/types.ts`
- Create: `lib/modules/reactions/ui/useMealReactionsController.ts`
- Modify: `lib/features/meals/application/meal-read-service.ts`
- Modify: `lib/features/meals/application/meal-editor-service.ts`
- Modify: `lib/features/comments/application/meal-comment-service.ts`
- Modify: `lib/features/reactions/application/meal-reaction-service.ts`
- Modify: `lib/features/profile/application/user-session-service.ts`
- Modify: `lib/features/meals/ui/useMealsForDateController.ts`
- Modify: `lib/features/meals/ui/useWeeklyStatsController.ts`
- Modify: `lib/features/comments/ui/useMealCommentsController.ts`
- Modify: `lib/features/comments/ui/types.ts`
- Modify: `lib/features/reactions/ui/useMealReactionsController.ts`

- [ ] **Step 1: Copy the current application/UI implementations into module-local homes with identical public contracts**
- [ ] **Step 2: Convert every legacy `lib/features/*` file into a shallow re-export shim**
- [ ] **Step 3: Keep QA/runtime/logging behavior unchanged during the move**
- [ ] **Step 4: Re-run the focused runtime tests to verify the module-local services/controllers behave exactly like the old paths**

### Task 4: Migrate active callers and enforce the new dependency direction

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/archive/page.tsx`
- Modify: `app/meals/[id]/page.tsx`
- Modify: `components/MealCard.tsx`
- Modify: `components/comments/CommentComposer.tsx`
- Modify: `components/meal-detail/MealConversationPanel.tsx`
- Modify: `context/UserContext.tsx`
- Modify: `lib/modules/meals/ui/useAddMealPageController.ts`
- Modify: `lib/modules/meals/ui/useEditMealPageController.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Update active callers to import module-local application/UI paths directly**
- [ ] **Step 2: Add lint restrictions so app/components/context/modules cannot import `@/lib/features/*` anymore**
- [ ] **Step 3: Preserve tests that intentionally inspect legacy shims, but stop production code from reintroducing feature-path coupling**
- [ ] **Step 4: Re-run focused suites to verify no production caller still depends on `lib/features/*`**

### Task 5: Verify the integrated result

**Files:**
- Verify only

- [ ] **Step 1: Run focused UI, architecture, and runtime tests for the migrated services/controllers**
- [ ] **Step 2: Run `npm run test`**
- [ ] **Step 3: Run `npm run lint` and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build` with placeholder `NEXT_PUBLIC_*` environment values**
