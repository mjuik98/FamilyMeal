# Legacy Read And Edit Effect Tightening Design

## Goal

Tighten the remaining legacy compatibility paths so they do not widen access or cause avoidable client-side state churn.

## Decisions

### 1. `userId` read fallback is legacy-only

Firestore rules should honor `userId` for reads only when the meal document is legacy and has no `ownerUid`. Modern documents must be gated by `userIds` alone.

### 2. Legacy mutation denial should be explicit

Rules should deny legacy writes via clear boolean guards instead of relying on property-access evaluation errors.

### 3. Edit page load effect should depend on stable primitives

The edit screen should reload only when the route or authenticated identity changes, not when the full `userProfile` object or toast callback identity changes.

### 4. Unexpected delete statuses should map to one user-facing path

Unknown delete statuses should continue to fail closed, but the user-facing copy should come from the thrown error path rather than an unreachable UI branch.

## Validation

- Firestore rules test proving a modern doc cannot grant extra read access through `userId`
- Static regression checks for legacy-only read fallback, explicit owner guard shape, narrowed edit effect dependencies, and unexpected delete-status messaging
- Full `npm run ci:verify`
