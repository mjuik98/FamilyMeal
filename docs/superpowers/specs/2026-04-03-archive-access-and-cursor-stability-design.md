# Archive Access And Cursor Stability Design

## Context

The previous archive hardening pass improved scalability, but a follow-up review exposed four gaps:

1. The server archive route authenticates callers but does not enforce participant-only visibility.
2. Archive pagination uses offset cursors, which become unstable when meals are inserted or deleted between page requests.
3. The archive scan limit can hide older matching meals while still presenting the screen as a complete archive.
4. The edit screen still behaves as if legacy meals can self-adopt an owner even though the server now blocks that path.

The user explicitly requested autonomous execution without approval checkpoints, so this document records the chosen design and moves straight into implementation.

## Goals

- Enforce the same participant-level meal visibility in the server archive API that Firestore rules enforce on direct client reads.
- Replace offset pagination with a stable seek cursor tied to the last returned meal.
- Make archive responses explicit about partial-scan exhaustion so the UI and tests do not imply full-history completeness when the server cannot guarantee it.
- Align the edit experience and regression suite with the current legacy-mutation policy.

## Non-Goals

- Reworking every meal read path onto the server.
- Introducing external search infrastructure.
- Performing destructive data cleanup on legacy meals.

## Approach

### 1. Participant-scoped archive authorization

Thread the authenticated user identity and resolved family role into archive listing. Server-side filtering will exclude any meal whose participant list does not include the caller's role, matching the intent already encoded in Firestore rules. The API will remain authenticated and server-backed, but no longer broaden visibility compared with direct document reads.

### 2. Stable seek cursor pagination

Replace the opaque offset cursor with a cursor that stores the last delivered meal's ordering key. The server already orders by `timestamp desc`; adding the document id to the cursor makes the page boundary deterministic. On each request, the use case will scan until it reaches the cursor anchor, then continue collecting matches from that point forward. This stays compatible with the current filtered-scan approach while preventing duplicate or skipped results during concurrent writes.

### 3. Honest archive completeness signaling

Keep bounded scanning for now, but make the API explicit when it stops because of scan budget rather than true dataset exhaustion. Return a `hasMore` / `nextCursor` only when another page can actually be continued from the current boundary, and expose an `isPartial` signal when the query hit the scan ceiling before proving completion. The archive UI can then show a short notice instead of silently presenting the result as complete history.

### 4. Legacy edit UX alignment and test hardening

Remove the client-side owner adoption path from the edit form. When a legacy meal is loaded, the page should block saving and explain that migration is required. Update the error mapping so server-side `409` responses surface a precise message. In e2e, stop asserting exact archive card counts and specific month buckets when the behavior under test is simply that filters and search update the result set correctly.

## Risks And Mitigations

- Seek pagination still depends on a filtered server scan rather than pure indexed queries.
  - Mitigation: keep the cursor tied to actual delivered items so paging remains stable even if scanning stays bounded.
- Participant access is role-based, so multiple users sharing a family role still share visibility.
  - Mitigation: keep behavior consistent with the existing Firestore rules and product model.
- Partial-result signaling adds another state to the archive UI.
  - Mitigation: keep the UI copy minimal and only show it when the server explicitly marks the result as partial.
