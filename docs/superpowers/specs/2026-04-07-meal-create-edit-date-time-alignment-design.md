# Meal Create/Edit Date Time Alignment Design

**Goal:** Align the create and edit meal forms so both screens expose editable date and time fields while preserving the existing single `timestamp` storage model.

**Current State:** The edit flow already exposes editable date and time inputs derived from `meal.timestamp`, but the create flow only derives an internal `recordDate` from `?date=YYYY-MM-DD` or the current date and never lets the user adjust date or time before saving. This creates an inconsistent form structure even though both flows ultimately save the same `timestamp` field.

## Scope

- Add date and time inputs to the create meal screen.
- Keep the existing edit meal screen date and time inputs in the same location and style.
- Initialize create form values from the current page context:
  - If `?date=YYYY-MM-DD` exists, use that date and the current time.
  - If no `date` query exists, use the current date and current time.
- Validate create form date and time values before submit.
- Save the combined create form date and time through the existing `timestamp` write path.
- Redirect back to the home screen focused on the user-selected record date after create.

## Out of Scope

- Persisting last-used date or time defaults across sessions.
- Changing the edit flow storage model away from a single `timestamp`.
- Introducing a separate date-only or time-only field in Firestore.

## Chosen Approach

Continue to use one authoritative `timestamp` for both create and edit. Both screens will render the same date/time block through the shared meal details section. Each page controller owns its own date/time string state, validates it with the existing date utility helpers, and combines it into one local `Date` before calling the existing meal editor service.

This keeps the UI consistent without widening the backend surface area. It also avoids hidden defaults because users can always see and change the exact date and time that will be saved.

## Screen Behavior

### Create Screen

- Add a `언제 먹었나요` block to the existing meal details section.
- Prefill the date input from `searchParams.get("date")` when valid; otherwise use the current app date.
- Prefill the time input from the current app time.
- Allow the user to change both values before save.
- On submit:
  - Require at least one participant.
  - Require a photo, as today.
  - Keep the current description rules, including auto-description fallback when description is blank.
  - Reject invalid date/time combinations before calling the save path.
- After a successful save, navigate to `/?date=<selected-record-date>` so the created meal is visible in the correct home-day context.

### Edit Screen

- Keep the existing `언제 먹었나요` block in the shared meal details section.
- Continue to derive initial values from `meal.timestamp`.
- Keep current validation and legacy-record guards.
- No server contract changes are required because edit already saves through `timestamp`.

## Data Flow

1. `app/add/page.tsx` renders the same date/time block pattern already used on `app/edit/[id]/page.tsx`.
2. `lib/modules/meals/ui/useAddMealPageController.ts` owns:
   - `recordDateValue`
   - `recordTimeValue`
   - initialization from query date plus current time
3. On create submit, the controller validates with `combineDateAndTime(recordDateValue, recordTimeValue)`.
4. The resulting `Date` is passed to `createMealRecord({ recordDate })`.
5. `lib/modules/meals/application/meal-editor-service.ts` converts that `Date` to `timestamp` and keeps using the existing create command shape.
6. `lib/client/meal-mutations.ts` and the existing create API route continue sending and storing only `timestamp`.
7. The create controller redirects to the home page using the saved record date as the `date` query.

## Validation

- Reject empty or malformed date/time values on the create screen before submit.
- Keep current participant and image validation unchanged.
- Keep the existing max description length rules unchanged.
- Reuse the existing timezone-aware date utilities so create and edit interpret values consistently in app time.

## UX Notes

- The create and edit screens should keep the same information order inside `MealDetailsSection`:
  1. meal type
  2. participants
  3. date and time
  4. description
- The create screen continues to support auto-description copy, but the date/time block now appears in the same place as edit.
- No hidden persisted defaults are introduced, because that would increase the risk of saving a meal to the wrong day.

## Error Handling

- If create form date/time cannot be combined into a valid app-time `Date`, show the same class of inline toast-style error already used in edit: `날짜와 시간을 올바르게 입력해 주세요.`
- Save and upload failures continue to flow through the existing create error mapper.

## Testing

- Add source-level assertions that the create page now exposes date and time inputs alongside the shared meal details section.
- Add runtime controller/service coverage proving the create path forwards the user-selected date/time as `timestamp`.
- Preserve the existing edit assertions so both pages are covered.
- Run the focused test set for create/edit meal form behavior after implementation.
