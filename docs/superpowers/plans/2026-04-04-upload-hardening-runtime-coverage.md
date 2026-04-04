# Upload Hardening And Runtime Coverage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce server-issued meal image URLs, clean up uploaded files when follow-up meal writes fail, and add runtime tests for upload behavior.

**Architecture:** Keep the existing two-step upload flow, but harden server-side invariants so create/update only accept Firebase Storage URLs for the authenticated owner's `meals/<uid>/` prefix. Add compensating cleanup on failed create/update writes and cover the critical path with executable tests for URL validation, multipart upload parsing, sharp-based normalization, and the shared image-selection hook.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner, Firebase Admin Storage, sharp, React hooks

---

### Task 1: Add failing executable coverage

**Files:**
- Modify: `package.json`
- Create: `tests/meal-image-runtime.test.mts`

- [ ] Step 1: Add a dedicated runtime test command that can execute TypeScript tests with Node's built-in type transform and test module mocks.
- [ ] Step 2: Add a failing test that proves non-owned or non-storage meal image URLs are rejected.
- [ ] Step 3: Add a failing test that exercises multipart upload parsing plus sharp-backed normalization through the upload route.
- [ ] Step 4: Add a failing test that exercises the shared image-selection hook lifecycle, including preview cleanup.
- [ ] Step 5: Run the targeted runtime test command and confirm the new cases fail for the expected reasons.

### Task 2: Enforce upload invariants on the server

**Files:**
- Modify: `lib/server/meals/meal-storage.ts`
- Modify: `lib/server/meals/meal-types.ts`
- Modify: `lib/server/meals/meal-use-cases.ts`
- Modify: `app/api/meals/route.ts`
- Modify: `app/api/meals/[id]/route.ts`

- [ ] Step 1: Export storage URL parsing helpers that can verify bucket and object-path ownership.
- [ ] Step 2: Require create/update `imageUrl` values to resolve to the configured bucket and the authenticated owner's `meals/<uid>/` prefix.
- [ ] Step 3: Tighten storage deletion helpers so cleanup only touches meal-upload objects.
- [ ] Step 4: Re-run the targeted runtime and source-level tests for the new invariant.

### Task 3: Clean up failed create/update uploads

**Files:**
- Modify: `lib/client/meals.ts`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`
- Modify: `app/api/uploads/meal-image/route.ts`
- Modify: `lib/uploadImage.ts`

- [ ] Step 1: Add an authenticated cleanup call for uploaded meal images.
- [ ] Step 2: Trigger compensating cleanup when add/update persistence fails after a successful upload.
- [ ] Step 3: Keep edit flows from deleting the currently persisted image when the user did not upload a replacement.
- [ ] Step 4: Re-run targeted tests covering cleanup behavior.

### Task 4: Verify end to end

**Files:**
- Modify: `docs/architecture.md`

- [ ] Step 1: Update the architecture notes for enforced storage URLs and cleanup behavior.
- [ ] Step 2: Run targeted source-level and runtime tests.
- [ ] Step 3: Run `npm run lint`.
- [ ] Step 4: Run `npm run typecheck`.
- [ ] Step 5: Run `npm run build`.
