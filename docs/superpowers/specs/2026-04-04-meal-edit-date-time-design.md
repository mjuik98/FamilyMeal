# Meal Edit Date Time Design

**Goal:** Allow owners to update the recorded date and time of an existing meal entry from the edit screen.

**Current State:** Meal creation already persists a caller-provided `timestamp`, but the edit flow strips `timestamp` on the client, omits it from the patch schema, and never exposes date/time inputs in the edit UI. As a result, existing records cannot move to another day or time.

## Scope

- Add date and time inputs to the existing edit screen.
- Prefill those inputs from `meal.timestamp`.
- Save the combined date/time back through the existing edit pipeline.
- Preserve current image, participant, and description editing behavior.

## Chosen Approach

Use separate native `date` and `time` inputs on the edit page, then combine them into a single local `Date` before saving. This keeps the UI predictable on mobile browsers and minimizes change scope by continuing to store one authoritative `timestamp`.

## Data Flow

1. `app/edit/[id]/page.tsx` loads the meal and derives initial `date` and `time` strings from `meal.timestamp`.
2. On submit, the page validates both fields and combines them into one `Date`.
3. `lib/features/meals/application/meal-editor-service.ts` forwards the combined millisecond timestamp in `updateExistingMealRecord`.
4. `lib/client/meal-mutations.ts` keeps `timestamp` in the PATCH payload.
5. `app/api/meals/[id]/route.ts` accepts `timestamp` in the patch schema.
6. `lib/server/meals/meal-write-use-cases.ts` writes the new Firestore `Timestamp` and returns the updated serialized meal.

## Validation

- Reject empty date/time values on the edit screen before submit.
- Accept only positive integer timestamps in the PATCH route.
- Reuse existing ownership and legacy-record guards without widening mutation access.

## UX Notes

- Keep the edit screen layout unchanged except for one new “언제 먹었나요” block in the existing meal info section.
- After save, return to the home screen focused on the updated meal date so the moved record is visible in context.

## Testing

- Add a runtime regression test proving `updateExistingMealRecord` forwards `timestamp`.
- Extend source-level tests to assert the edit page exposes date/time inputs and the patch route/server write path accept `timestamp`.
