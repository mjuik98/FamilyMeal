# Rules And Delete Fail-Closed Design

## Goal

Close the remaining fail-open paths around legacy meal mutation, participant normalization, delete status handling, and edit-page stale responses.

## Decisions

### 1. Firestore rules must match the server's legacy mutation policy

Legacy meal writes are already blocked in the server API. Firestore rules should fail closed in the same way so direct client SDK writes cannot bypass that policy.

### 2. Participant normalization should treat empty `userIds` as missing

Both server and client serializers should fall back to legacy `userId` when `userIds` is absent or present-but-empty. This keeps partially migrated documents readable and searchable without scattering more fallback logic.

### 3. Delete status handling should be explicit and exhaustive

Client delete results should use a closed status union. Unknown statuses should throw instead of falling through to a success toast.

### 4. Edit page should reject stale async responses

The edit route should use the same request-sequencing pattern already used by the detail page so delayed responses cannot overwrite newer state.

## Validation

- Firestore rules test proving legacy participant edits are denied
- Static regression tests for serializer fallback, delete-status fail-closed handling, and edit-page request guards
- Full `npm run ci:verify`
