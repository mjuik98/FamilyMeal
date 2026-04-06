# Activity And Profile Boundary Localization Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans (or subagent-driven-development when explicitly allowed) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `activity` and notification preference helpers into module-local homes so profile notification logic lives under `lib/modules/profile/*`, activity write side-effects live under `lib/modules/activity/*`, and the legacy root helpers remain only as compatibility shims.

**Architecture:** Keep the current modular monolith. Root `lib/activity.ts`, `lib/activity-log.ts`, and `lib/client/activity.ts` stop being implementation homes and become thin re-export shims. Production callers should depend on module-local profile or activity modules directly, while tests and any untouched legacy paths can continue to resolve through the shims during the transition.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner, ESLint

---

### Task 1: Lock the new ownership rules in tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/user-context-runtime.test.mts`

- [ ] **Step 1: Add failing assertions that activity logging now lives under `lib/modules/activity/server` and notification preference helpers live under `lib/modules/profile/*`**
- [ ] **Step 2: Keep the legacy root paths under test, but require them to be thin shims only**
- [ ] **Step 3: Update runtime mocks to the future module-local client adapter path**
- [ ] **Step 4: Run the focused suites and confirm the new expectations fail before implementation**

### Task 2: Create module-local implementations and legacy shims

**Files:**
- Create: `lib/modules/activity/server/activity-log.ts`
- Create: `lib/modules/profile/domain/notification-preferences.ts`
- Create: `lib/modules/profile/adapters/http/profile-notification-client.ts`
- Modify: `lib/activity-log.ts`
- Modify: `lib/activity.ts`
- Modify: `lib/client/activity.ts`

- [ ] **Step 1: Move the real activity write helpers into a dedicated activity module**
- [ ] **Step 2: Move notification preference defaults and normalization into the profile domain**
- [ ] **Step 3: Move the notification preference HTTP client into a profile adapter**
- [ ] **Step 4: Convert each legacy root helper into a shallow re-export shim**

### Task 3: Migrate active callers and enforce the dependency direction

**Files:**
- Modify: `app/profile/page.tsx`
- Modify: `lib/client/profile-session.ts`
- Modify: `lib/qa/session.ts`
- Modify: `lib/modules/profile/server/profile-use-cases.ts`
- Modify: `lib/modules/profile/infrastructure/user-session-runtime.ts`
- Modify: `lib/modules/comments/server/comment-use-cases.ts`
- Modify: `lib/modules/reactions/server/reaction-use-cases.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Update production callers to import module-local implementations directly**
- [ ] **Step 2: Leave compatibility shims in place but forbid new production imports of the root `activity*` helpers**
- [ ] **Step 3: Keep runtime behavior, Firestore structure, and API contracts unchanged**
- [ ] **Step 4: Re-run focused suites to prove the new dependency direction is active**

### Task 4: Verify the integrated result

**Files:**
- Verify only

- [ ] **Step 1: Run the focused UI, architecture, API security, and runtime suites**
- [ ] **Step 2: Run `npm run test`**
- [ ] **Step 3: Run `npm run lint` and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build` with placeholder `NEXT_PUBLIC_*` environment values**
