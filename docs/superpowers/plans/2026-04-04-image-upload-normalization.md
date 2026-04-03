# Image Upload Normalization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move meal image normalization to the server, add early upload validation, and unify add/edit image handling with clearer client feedback.

**Architecture:** The client will validate and preview raw files through a shared hook, then upload the original file via multipart form data. The server upload route will reject oversized requests early and normalize accepted files with `sharp` before storing JPEG output in Firebase Storage.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner, Firebase Admin Storage, sharp

---

### Task 1: Lock the new behavior with tests

**Files:**
- Modify: `tests/ui-theme.test.mjs`
- Modify: `tests/api-security.test.mjs`
- Create: `tests/meal-image-policy.test.mjs`
- Modify: `package.json`

- [ ] Step 1: Add failing source assertions for shared image hook usage and removal of client canvas compression.
- [ ] Step 2: Add failing source assertions for upload header validation and `sharp` normalization.
- [ ] Step 3: Add a failing runtime test for client-side meal image validation helpers.
- [ ] Step 4: Run the targeted tests and confirm the new checks fail for the expected reasons.

### Task 2: Extract shared client image handling

**Files:**
- Create: `components/hooks/useMealImageSelection.ts`
- Modify: `lib/meal-form.ts`
- Modify: `lib/domain/meal-policy.ts`
- Create: `lib/meal-image-policy.ts`
- Modify: `app/add/page.tsx`
- Modify: `app/edit/[id]/page.tsx`
- Modify: `lib/meal-errors.ts`

- [ ] Step 1: Add shared file-type and file-size policy helpers.
- [ ] Step 2: Implement a shared image-selection hook with object URL lifecycle management.
- [ ] Step 3: Move add/edit pages to the shared hook and remove duplicated local image state orchestration.
- [ ] Step 4: Add user-visible validation and submission-phase feedback.

### Task 3: Move normalization to the server

**Files:**
- Modify: `lib/uploadImage.ts`
- Modify: `app/api/uploads/meal-image/route.ts`
- Modify: `lib/server/uploads/meal-image-use-cases.ts`

- [ ] Step 1: Remove client canvas compression and upload the original file as multipart form data.
- [ ] Step 2: Add early upload content-length validation before multipart parsing.
- [ ] Step 3: Normalize uploaded images with `sharp` on the server and always store JPEG output.
- [ ] Step 4: Preserve existing auth and storage response contracts.

### Task 4: Verify and document

**Files:**
- Modify: `docs/architecture.md`

- [ ] Step 1: Update architecture docs to describe multipart upload and server-side normalization.
- [ ] Step 2: Run `node --test tests/ui-theme.test.mjs tests/api-security.test.mjs tests/meal-image-policy.test.mjs`.
- [ ] Step 3: Run lint and typecheck.
- [ ] Step 4: Run production build.
