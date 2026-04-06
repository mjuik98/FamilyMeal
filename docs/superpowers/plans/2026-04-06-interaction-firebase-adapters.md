# Interaction Firebase Adapters Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move comments, reactions, and activity Firestore writes behind module-local adapter files so interaction server modules stop importing `@/lib/firebase-admin` directly.

**Architecture:** Keep route and server entrypoints stable while introducing focused `adapters/firestore` files inside each interaction module. Comments and reactions server use cases will delegate persistence-heavy work to their adapters, and the activity helper will route actual Firestore writes through an activity adapter while preserving current activity IDs and payload shapes.

**Tech Stack:** Next.js App Router, TypeScript, Firebase Admin / Firestore, Node test runner, ESLint

---

### Task 1: Lock The New Interaction Boundaries In Tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/architecture-boundaries.test.mjs`

- [ ] **Step 1: Write failing structure tests**

Add assertions that:
- `lib/modules/comments/server/comment-use-cases.ts` imports `@/lib/modules/comments/adapters/firestore/comment-admin-store`
- `lib/modules/reactions/server/reaction-use-cases.ts` imports `@/lib/modules/reactions/adapters/firestore/reaction-admin-store`
- `lib/modules/activity/server/activity-log.ts` imports `@/lib/modules/activity/adapters/firestore/activity-admin-store`
- none of those three server files import `@/lib/firebase-admin`
- the new adapter files exist and do import `@/lib/firebase-admin`

- [ ] **Step 2: Run targeted tests and verify they fail**

Run: `npm exec -- node --test tests/api-security.test.mjs tests/architecture-boundaries.test.mjs`
Expected: FAIL because the new adapter files and imports do not exist yet.

### Task 2: Add Firestore Adapters For Interaction Modules

**Files:**
- Create: `lib/modules/activity/adapters/firestore/activity-admin-store.ts`
- Create: `lib/modules/comments/adapters/firestore/comment-admin-store.ts`
- Create: `lib/modules/reactions/adapters/firestore/reaction-admin-store.ts`
- Modify: `lib/modules/activity/server/activity-log.ts`
- Modify: `lib/modules/comments/server/comment-use-cases.ts`
- Modify: `lib/modules/reactions/server/reaction-use-cases.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Implement the activity write adapter**

Move direct `adminDb.collection("users").doc(...).collection("activity")` access into `activity-admin-store.ts` and keep `activity-log.ts` focused on IDs and payload assembly.

- [ ] **Step 2: Implement the comments store adapter**

Extract the Firestore transaction and document write path from `comment-use-cases.ts` into `comment-admin-store.ts`, preserving:
- meal existence checks
- parent reply validation
- comment count increment/decrement behavior
- activity side effects
- returned comment payload shape

- [ ] **Step 3: Implement the reactions store adapter**

Extract the meal/comment reaction transaction paths from `reaction-use-cases.ts` into `reaction-admin-store.ts`, preserving:
- missing resource checks
- reaction toggle behavior
- activity side effects
- returned reaction map

- [ ] **Step 4: Add guardrails**

Update ESLint so `lib/modules/comments/server/*`, `lib/modules/reactions/server/*`, and `lib/modules/activity/server/*` cannot import `@/lib/firebase-admin` directly.

### Task 3: Verify The Refactor End-To-End

**Files:**
- No code changes expected unless verification exposes drift

- [ ] **Step 1: Run targeted structure tests**

Run: `npm exec -- node --test tests/api-security.test.mjs tests/architecture-boundaries.test.mjs`
Expected: PASS

- [ ] **Step 2: Run full verification**

Run:
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `cmd.exe /d /v /c "set NEXT_PUBLIC_FIREBASE_API_KEY=test-key&& set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo.firebaseapp.com&& set NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project&& set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com&& set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890&& set NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:test&& set NEXT_PUBLIC_ENABLE_PWA=false&& set NEXT_PUBLIC_ENABLE_QA=false&& set NEXT_PUBLIC_APP_VERSION=test-build&& npm run build"`

Expected:
- tests pass
- lint passes with no restricted-import violations
- typecheck passes
- production build succeeds with placeholder public env values
