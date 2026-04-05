# Feature Server Boundaries Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `comments`, `reactions`, and `profile` server-side implementations under their feature modules while preserving route behavior and leaving compatibility shims behind.

**Architecture:** Keep the current modular monolith and Firebase-backed server flow, but make each feature module the real home for its route parsing and mutation/session logic. Existing `lib/server/*` paths remain as shims so the migration stays incremental and low-risk.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner

---

### Task 1: Lock the new feature-server boundary with tests

**Files:**
- Modify: `tests/architecture-boundaries.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`

- [ ] **Step 1: Add failing assertions for module-local server implementations**
- [ ] **Step 2: Add failing assertions for legacy `lib/server/*` shim behavior**
- [ ] **Step 3: Run focused tests and confirm they fail**
- [ ] **Step 4: Re-run after implementation and confirm they pass**

### Task 2: Move comment/reaction/profile server implementations under modules

**Files:**
- Create: `lib/modules/comments/server/comment-types.ts`
- Create: `lib/modules/comments/server/comment-policy.ts`
- Create: `lib/modules/comments/server/comment-use-cases.ts`
- Create: `lib/modules/reactions/server/reaction-policy.ts`
- Create: `lib/modules/reactions/server/reaction-use-cases.ts`
- Create: `lib/modules/profile/server/profile-use-cases.ts`
- Modify: `lib/server/comments/comment-types.ts`
- Modify: `lib/server/comments/comment-policy.ts`
- Modify: `lib/server/comments/comment-use-cases.ts`
- Modify: `lib/server/reactions/reaction-policy.ts`
- Modify: `lib/server/reactions/reaction-use-cases.ts`
- Modify: `lib/server/profile/profile-use-cases.ts`

- [ ] **Step 1: Copy current implementations into module-local server files**
- [ ] **Step 2: Update intra-module imports to stay module-local**
- [ ] **Step 3: Convert old `lib/server/*` files into re-export shims**
- [ ] **Step 4: Re-run focused tests**

### Task 3: Re-point API routes to module-local server implementations

**Files:**
- Modify: `app/api/meals/[id]/comments/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/route.ts`
- Modify: `app/api/meals/[id]/reactions/route.ts`
- Modify: `app/api/meals/[id]/comments/[commentId]/reactions/route.ts`
- Modify: `app/api/profile/session/route.ts`
- Modify: `app/api/profile/role/route.ts`
- Modify: `app/api/profile/settings/route.ts`

- [ ] **Step 1: Point comment routes to `lib/modules/comments/server/*`**
- [ ] **Step 2: Point reaction routes to `lib/modules/reactions/server/*`**
- [ ] **Step 3: Point profile routes to `lib/modules/profile/server/*`**
- [ ] **Step 4: Re-run focused tests**

### Task 4: Verify integrated behavior

**Files:**
- Verify only

- [ ] **Step 1: Run focused architecture/API/UI tests**
- [ ] **Step 2: Run `npm run test`**
- [ ] **Step 3: Run `npm run lint` and `npm run typecheck`**
- [ ] **Step 4: Run `npm run build`**
