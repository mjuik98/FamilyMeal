# Modern Write Preview Delete Alignment Design

## Goal

Close the remaining schema-integrity and UX gaps around deprecated `userId` writes, local image preview races, duplicate delete actions, and modern meal update cleanup.

## Decisions

### 1. Modern meal writes should reject new `userId` usage without bricking old documents

Firestore rules should block `userId` on new modern meal creates and direct client updates that try to mutate it. Existing modern documents that still carry the field can remain editable as long as the field is not changed.

### 2. Modern server updates should actively clean deprecated `userId`

When a modern meal is updated through the server, the deprecated field should be deleted and excluded from keyword recomputation. This gradually normalizes stale documents without a separate migration step.

### 3. Image preview selection should use latest-request wins

Both add and edit pages should guard asynchronous `FileReader` completions with a request sequence so rapid file changes cannot restore an older preview.

### 4. Delete UX should guard duplicate requests locally

The detail card should disable repeat delete actions while a confirm/delete cycle is active, and `already_processing` should be surfaced as informational state instead of an error.

## Validation

- Firestore rules test proving modern meal creation with deprecated `userId` is denied
- Static regression tests for request-sequencing guards, delete pending state, and server-side deprecated-field cleanup
- Full `npm run ci:verify`
