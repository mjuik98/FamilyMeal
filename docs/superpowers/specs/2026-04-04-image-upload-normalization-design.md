# Image Upload Normalization Design

## Goal

Reduce client-side rendering stalls from large modern phone photos, centralize image normalization on the server, and make add/edit image handling consistent and user-visible.

## Scope

- Replace client-side image compression with server-side normalization.
- Add early upload-size rejection before multipart parsing.
- Extract add/edit image-selection state into a shared hook.
- Add client-side file validation and clearer upload-stage feedback.
- Keep current storage and meal document boundaries intact.

## Approaches Considered

### 1. Keep client compression and optimize the existing canvas path

- Pros: smallest code delta
- Cons: still depends on device/browser image decode behavior, keeps work on the main thread, does not solve HEIC/HDR instability well

### 2. Move normalization to the server while keeping client preview local

- Pros: removes the largest client-side stall, gives one normalization path, allows EXIF rotation and resize to be applied consistently, simplifies client upload code
- Cons: slightly more server CPU and route complexity

### 3. Full worker-based client pipeline plus server passthrough

- Pros: can reduce main-thread pressure while keeping server simple
- Cons: significantly more moving parts, still leaves format support fragmented across browsers

## Decision

Use approach 2.

The client will only validate and preview the selected file. The upload route will reject obviously too-large requests before parsing multipart bodies, then pass the file to a server-side image normalizer built on `sharp`. The normalizer will rotate according to metadata, resize within a bounded box, and encode to JPEG for storage.

## Architecture

### Client

- Add a shared image-selection hook for add/edit pages.
- Track:
  - selected `File`
  - preview URL
  - optional local metadata for UI feedback
- Validate file type and size immediately after selection.
- Keep object URL lifecycle inside the hook to avoid leaks.
- Upload the original `File` with `FormData`.

### Server

- Add early `content-length` validation in `/api/uploads/meal-image`.
- Parse multipart data only after header validation passes.
- Normalize the uploaded image in `lib/server/uploads/meal-image-use-cases.ts` with `sharp`:
  - auto-rotate from EXIF
  - resize to a bounded maximum dimension without enlargement
  - encode to JPEG
- Store only normalized JPEG output in Firebase Storage.

### Policy and UX

- Centralize meal image size/type limits in a shared policy module.
- Show validation toasts for unsupported types and oversized files before upload starts.
- Distinguish upload and save phases in add/edit button labels.
- Surface selected file metadata near the preview.

## Error Handling

- Reject unsupported file types before preview.
- Reject oversized files both client-side and server-side.
- Return clearer messages for:
  - unsupported format
  - oversized upload
  - server-side image normalization failure
- If local preview fails, keep the file selection state intact and report the failure.

## Testing

- Extend source-level regression tests to lock:
  - shared hook usage from add/edit
  - absence of client canvas compression
  - server `sharp` normalization path
  - early upload content-length validation
- Add runtime tests for pure image validation helpers.
- Re-run targeted tests, lint, typecheck, and production build.
