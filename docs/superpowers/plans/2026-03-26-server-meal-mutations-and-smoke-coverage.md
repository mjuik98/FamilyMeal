# Server Meal Mutations And Smoke Coverage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move meal create/update writes behind authenticated server APIs, improve failure diagnostics, and add regression coverage for real save flows.

**Architecture:** Keep read paths on the client SDK, but move meal mutations to server routes that verify auth, validate payloads, manage image lifecycle, and persist Firestore documents with admin privileges. The client should call these APIs through `lib/data.ts` and surface categorized failures instead of generic toasts.

**Tech Stack:** Next.js App Router, Firebase client SDK, Firebase Admin SDK, TypeScript, Node test runner, smoke scripts

---

### Task 1: Lock in failing tests

**Files:**
- Modify: `tests/api-security.test.mjs`
- Modify: `tests/ui-theme.test.mjs`
- Modify: `README.md`

- [ ] Add assertions for `POST /api/meals` and `PATCH /api/meals/[id]`.
- [ ] Add assertions that meal mutations use authenticated server APIs instead of direct Firestore writes.
- [ ] Add assertions that user-visible failures can include specific upload/save wording.
- [ ] Add smoke-test documentation entry for meal save regression coverage.

### Task 2: Implement server meal mutation layer

**Files:**
- Create: `lib/server-meals.ts`
- Create: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `lib/firebase-admin.ts`

- [ ] Add shared validation, keyword building, storage-path parsing, upload, and cleanup helpers.
- [ ] Implement authenticated `POST /api/meals`.
- [ ] Extend `PATCH /api/meals/[id]` in the existing route file.
- [ ] Delete replaced meal images on successful update and cleanup meal images on delete.

### Task 3: Route client mutations through the APIs

**Files:**
- Modify: `lib/data.ts`
- Modify: `lib/uploadImage.ts`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`

- [ ] Replace direct client Firestore meal writes with API-backed helpers.
- [ ] Preserve QA mock mode.
- [ ] Map upload/auth/save errors to more specific toast messages.
- [ ] Keep edit flow behavior for legacy owner adoption.

### Task 4: Add regression coverage and verify

**Files:**
- Create: `scripts/smoke-meal-mutations.mjs`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Add a live smoke script that signs in via custom token, uploads a tiny image, creates a meal, updates it, and deletes it through local HTTP routes.
- [ ] Add an npm script entry for the new smoke test.
- [ ] Run focused tests red-green, then full verification: `npm run test:api`, `npm run test:ui`, `npm run typecheck`, `npm run lint`, `npm run build`, and the new meal smoke script against a local dev server.
