# Detail Delete And Legacy UI Alignment Design

## Context

The last review found four remaining mismatches around the meal detail surface:

1. Legacy meals can still show edit/delete actions in the detail card even though the server blocks mutation.
2. The delete client path treats every successful HTTP response as final deletion and discards the route's structured status.
3. Legacy participant data is normalized differently on client and server, so archive/detail UI can lose participant labels for legacy records.
4. The detail page does not guard against request races when users switch meals quickly from the same-day photo rail.

The user requested autonomous execution without approval checkpoints, so this document records the chosen approach and moves directly into implementation.

## Goals

- Make detail-surface action visibility fail closed when ownership cannot be proven.
- Surface delete route statuses precisely instead of collapsing them into a single toast.
- Normalize legacy participant fallback consistently wherever meals are rendered or filtered.
- Prevent stale detail fetches from overwriting newer state after rapid navigation.

## Non-Goals

- Reworking the detail layout structure.
- Changing server-side authorization rules for meal mutation.
- Removing legacy `userId` support entirely.

## Approach

### 1. Fail-closed owner actions in detail

Update the detail card ownership check so only `ownerUid === current uid` unlocks edit/delete. Legacy meals remain viewable, but mutation controls disappear. This aligns UI affordances with current server policy instead of encouraging a path that always fails.

### 2. Structured delete result handling

Preserve the delete route payload in the client mutation helper and branch on `status`. `completed` should keep the success path, `already_processing` should show a non-error informational message, and mutation-policy errors should map through the same human-readable copy strategy already used for edit failures.

### 3. Shared legacy participant fallback

Use a single fallback rule of `meal.userIds.length > 0 ? meal.userIds : meal.userId ? [meal.userId] : []` anywhere participant labels, filters, or derived suggestions are computed. This keeps archive cards, detail badges, and any client-side participant matching consistent with the data shape users actually receive.

### 4. Detail request race protection

Mirror the request sequence / active-flag pattern already used on the archive page. Guard both the primary meal load and same-day meal load so old responses cannot overwrite the latest route state after fast rail navigation.

## Risks And Mitigations

- Users may notice edit/delete actions disappearing on legacy meals they previously saw as mutable.
  - Mitigation: that change reflects the server's real policy and avoids false affordances.
- Delete status handling adds another branch to the detail card UX.
  - Mitigation: keep the messaging minimal and reuse existing toast patterns.
