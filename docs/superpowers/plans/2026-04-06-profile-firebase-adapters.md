# Profile Firebase Adapter Extraction Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans (or subagent-driven-development when explicitly allowed) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove direct `firebase-admin` usage from the profile server layer by introducing module-local Firebase adapters under `lib/modules/profile/adapters/firebase/*`, while preserving existing route contracts and runtime behavior.

**Architecture:** Keep `lib/modules/profile/server/*` focused on application logic and move Firestore/AdminAuth access into profile-owned adapters. `profile-auth-context.ts` and `profile-use-cases.ts` should depend on adapter functions, not on `@/lib/firebase-admin` directly.

**Tech Stack:** Next.js 16, TypeScript, Firebase Admin, Node test runner, ESLint

---

### Task 1: Lock the new profile adapter boundary in tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`

- [ ] **Step 1: Add failing assertions that profile server files import module-local Firebase adapters instead of `@/lib/firebase-admin`**
- [ ] **Step 2: Require the new adapter files to exist under `lib/modules/profile/adapters/firebase/*`**
- [ ] **Step 3: Keep route-level expectations unchanged so this remains a structural refactor**
- [ ] **Step 4: Run focused source tests and confirm the new expectations fail before implementation**

### Task 2: Create profile Firebase adapters

**Files:**
- Create: `lib/modules/profile/adapters/firebase/profile-admin-auth.ts`
- Create: `lib/modules/profile/adapters/firebase/profile-admin-store.ts`

- [ ] **Step 1: Move AdminAuth lookups needed by profile role initialization into a dedicated adapter**
- [ ] **Step 2: Move Firestore profile reads and writes into a dedicated adapter**
- [ ] **Step 3: Keep the adapter API focused on profile operations instead of leaking raw route concerns**

### Task 3: Migrate profile server callers to the new adapter layer

**Files:**
- Modify: `lib/modules/profile/server/profile-use-cases.ts`
- Modify: `lib/modules/profile/server/profile-auth-context.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Update profile server code to consume adapter functions only**
- [ ] **Step 2: Add lint guards so profile server files do not reintroduce direct `@/lib/firebase-admin` imports**
- [ ] **Step 3: Preserve all existing role-loading and notification-preference behavior**

### Task 4: Verify the integrated result

**Files:**
- Verify only

- [ ] **Step 1: Run focused architecture/API source tests**
- [ ] **Step 2: Run `npm run test`**
- [ ] **Step 3: Run `npm run lint` and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build` with placeholder `NEXT_PUBLIC_*` environment values**
