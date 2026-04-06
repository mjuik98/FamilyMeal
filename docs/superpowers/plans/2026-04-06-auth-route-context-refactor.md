# Auth Route Context Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep token verification inside `lib/platform/auth`, move user role loading under the profile module, and preserve route behavior while tightening the dependency boundary.

**Architecture:** `platform/auth/server-auth` should only know how to validate bearer tokens and return a verified user identity. Route-level role loading remains centralized, but it should depend on a profile-owned server helper instead of reaching into auth infrastructure for Firestore-backed role state.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Admin, Node test runner

---

### Task 1: Lock the new auth ownership boundary with tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`
- Create: `tests/route-auth-runtime.test.mts`
- Modify: `package.json`

- [ ] **Step 1: Add failing source assertions showing `server-auth` no longer owns role loading**
- [ ] **Step 2: Add a failing runtime test proving `requireValidatedUserRole` composes token verification with a profile-owned role loader**
- [ ] **Step 3: Add the runtime test file to `test:api:runtime`**
- [ ] **Step 4: Run the focused tests and confirm they fail for the expected reason**

### Task 2: Move role loading under the profile module

**Files:**
- Create: `lib/modules/profile/server/profile-auth-context.ts`
- Modify: `lib/platform/auth/server-auth.ts`
- Modify: `lib/platform/auth/route-auth.ts`

- [ ] **Step 1: Add a focused profile-owned helper that reads and validates the stored user role**
- [ ] **Step 2: Remove Firestore role loading from `server-auth`**
- [ ] **Step 3: Update `route-auth` to use verified identity plus the new profile helper**
- [ ] **Step 4: Keep the exported `requireVerifiedUser` and `requireValidatedUserRole` contracts stable**

### Task 3: Align boundary assertions and caller expectations

**Files:**
- Modify: `tests/archive-query.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`

- [ ] **Step 1: Update source assertions to point at the new profile-owned auth context helper**
- [ ] **Step 2: Ensure routes still import `route-auth` rather than duplicating auth/profile orchestration inline**
- [ ] **Step 3: Leave compatibility shims untouched unless a test explicitly validates them**

### Task 4: Verify integrated behavior

**Files:**
- Verify only

- [ ] **Step 1: Run the focused architecture and route-auth runtime tests**
- [ ] **Step 2: Run `npm run test:api` and `npm run test:api:runtime`**
- [ ] **Step 3: Run `npm run test`, `npm run lint`, and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build` with placeholder public Firebase env vars**
