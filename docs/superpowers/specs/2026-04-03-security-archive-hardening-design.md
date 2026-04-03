# Security And Archive Hardening Design

## Context

The current codebase has four concrete weaknesses:

1. The meal image upload route accepts a caller-provided storage path.
2. Legacy meal records can still be updated or deleted by participant role fallback.
3. Archive listing and search are limited to recent client-side snapshots.
4. CI relies heavily on source-string regression tests and skips browser coverage.

The user explicitly requested autonomous execution without approval checkpoints, so this document records the chosen design and immediately transitions into implementation.

## Goals

- Prevent arbitrary or unsafe storage object targeting during image upload.
- Remove legacy role-based mutation fallback for meal update and delete flows.
- Move archive browsing/search to authenticated server APIs with cursor pagination.
- Strengthen regression coverage so the new behavior is verified by runnable tests.

## Non-Goals

- Reworking all Firebase read paths away from the client SDK.
- Rebuilding archive UI structure beyond what is needed for scalable data access.
- Running destructive data migrations against production data.

## Approach

### 1. Upload path hardening

Remove public `path` input from the upload API and client helper. The server will always generate a storage path under `meals/{uid}/...`, preserving current behavior for add/edit flows while eliminating arbitrary overwrite risk.

### 2. Legacy mutation authorization hardening

Disallow update/delete on meal documents that do not have an `ownerUid`. This fail-closed behavior is safer than the current participant-role fallback. To keep cleanup practical, add a dry-run migration script that backfills `ownerUid` from legacy data where it can be inferred safely.

### 3. Archive server API

Add an authenticated archive route that accepts cursor, query, type, participant, and page size. The route will query Firestore through Admin SDK, serialize meals consistently, and return `nextCursor`. For text search, use indexed token lookup when possible and a capped server-side fallback scan only as a last resort. The archive page will consume this API incrementally instead of loading a fixed recent snapshot.

### 4. Testing and CI

Add runnable tests around the new archive query logic and migration helper behavior. Keep the existing source-structure tests, but extend CI to run the e2e suite so the main verification path covers real app behavior.

## Risks And Mitigations

- Legacy meals without recoverable ownership may become read-only for mutation.
  - Mitigation: provide a dry-run migration path and document the assumption.
- Firestore query constraints may require server-side post-filtering in some archive combinations.
  - Mitigation: keep page sizes bounded and return stable cursors.
- E2E in CI may be slower.
  - Mitigation: keep smoke scope focused and reuse the existing Playwright setup.
