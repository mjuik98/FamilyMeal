# Delete Status And Serializer Normalization Design

## Context

The previous detail/delete alignment pass fixed the largest UX mismatches, but a follow-up review found four remaining issues:

1. The detail card still treats `already_deleted` as if the current delete attempt completed successfully.
2. Successful deletion from the detail page refreshes the dead route instead of sending the user to a valid destination.
3. The server meal serializer still returns legacy `userId` separately instead of normalizing it into `userIds`.
4. The remaining client-side keyword matcher still ignores legacy participant fallback.

The user requested autonomous execution without approval checkpoints, so this document records the chosen design and moves directly into implementation.

## Goals

- Distinguish `completed`, `already_deleted`, and `already_processing` in the delete client flow.
- Leave the deleted detail route after terminal delete outcomes.
- Normalize legacy participant roles consistently in server meal serialization.
- Eliminate the remaining legacy participant gap in client keyword matching.

## Non-Goals

- Reworking server delete semantics.
- Removing legacy `userId` support entirely.
- Rebuilding detail-page layout or navigation structure.

## Approach

### 1. Explicit delete status handling

Treat delete route responses as a structured result, not a boolean success. `already_processing` remains a non-terminal informational toast. `completed` and `already_deleted` both mean the current detail route should be exited, but they should use different user-facing copy.

### 2. Detail-page delete exit hook

Have `MealCard` accept an optional deletion-complete callback. The detail page will provide a callback that redirects to `/archive` for terminal delete states so users do not land on a refreshed "record not found" shell. Other callers can keep the existing refresh fallback.

### 3. Server serializer participant normalization

Update server meal serialization so `userIds` always contains legacy `userId` when no modern participant list exists. This aligns the server response shape with the client serializer and removes the need for every consumer to special-case server-backed meals.

### 4. Legacy-aware keyword matching

Adjust the remaining client-side keyword helper to search over normalized participant roles rather than raw `userIds` only. That keeps residual client-side search behavior consistent even while archive search is mostly server-backed.

## Risks And Mitigations

- Redirecting after delete changes the visible flow for QA detail pages too if they wire into the callback later.
  - Mitigation: make the redirect callback optional and only use it from the real detail page.
- Normalizing `userIds` on the server may subtly change some legacy UI rendering by making participants appear where they were previously empty.
  - Mitigation: that is the intended correction and matches existing client-serializer behavior.
