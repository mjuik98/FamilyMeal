# Meal Detail, Archive, And Draft Shortcuts Design

## Goal

Finish the photo-first restructuring by separating summary and detail, making weekly navigation more visual, moving search/filter into a dedicated archive, and reducing friction in meal creation.

## Why This Round

The home screen is now simpler, but two important mismatches remain:

- home cards still carry too much interactive weight
- removed search/filter power has not yet been given a dedicated home elsewhere

At the same time, creation is still more form-like than camera-first.

## Product Direction

### Home

Home should remain a visual date journal.

- Show weekly date thumbnails
- Show only photo-led meal summaries
- Use home as a jump surface, not an interaction workspace

### Meal Detail

Comments, replies, reactions, edit, and delete belong in a dedicated meal detail screen.

That gives the record a clear hierarchy:

- home = browse
- detail = interact

### Archive

Search and filters should live in a separate archive screen.

This keeps power-user discovery intact without polluting home.

### Add Flow

The add screen should remember the user's most recent type and participant selection so that the act of recording becomes faster over time.

## Approaches Considered

### Option A: Keep interactive cards on home and only add archive

- Lower implementation risk
- Weakens the photo-first restructuring because home is still overloaded at the card level

### Option B: Split summary and detail, add archive, and remember add defaults

- Best match for the product direction
- Uses existing data and interaction logic with mostly UI-layer changes
- Requires broader test updates

### Option C: Replace detail with modal sheets only

- Fast to open from home
- Adds complexity to navigation and state handling
- Harder to preserve stable URLs and back behavior

## Recommendation

Choose Option B.

Stable detail routes and a separate archive route produce clearer information architecture than nested sheets, while still preserving the existing backend and interaction primitives.

## Design

### Summary Cards

Create a dedicated meal summary card for home and archive.

Responsibilities:

- large image first
- meal type and time
- short description
- compact participant and engagement summary
- single primary action to open the detail page

Removed from summary cards:

- inline comment threads
- inline reply composer
- inline reaction bars
- edit/delete actions

### Detail Screen

Introduce a dedicated route for each meal record.

Responsibilities:

- large image hero
- full metadata
- existing reactions
- comment thread and reply flow
- owner actions

The existing interactive meal card logic can be reused here rather than rewritten.

### Weekly Date Strip

Each day cell should show:

- weekday label
- date number
- meal count
- thumbnail if the day has at least one image

Empty days still show count `0` without a thumbnail.

### Archive Screen

Add an archive route with:

- text search
- meal type filter
- participant filter
- recent-first default sort
- photo-led summary list

Home links to archive through a compact secondary action.

### Add Flow Shortcuts

Persist draft defaults in local storage:

- last selected meal type
- last selected participant list

When the user opens add:

- restore previous selections if present
- fall back to current user role otherwise

When save succeeds:

- persist the current defaults
- return the user to the home date for the saved meal

### Navigation And Safe Area

The bottom dock should stay fixed and visible.

For this round, finish the shell by:

- keeping dock outside the constrained app container
- ensuring content bottom padding always clears the dock
- preserving visibility on detail and archive pages

## File Boundaries

- `components/MealPreviewCard.tsx`
  - home/archive summary card only
- `app/meals/[id]/page.tsx`
  - dedicated detail route
- `app/archive/page.tsx`
  - dedicated search/filter route
- `components/WeekDateStrip.tsx`
  - extend to support day thumbnails
- `lib/qa.ts`
  - richer week-level mock meals and thumbnails
- `lib/data.ts`
  - add recent meal query and richer weekly preview metadata
- `lib/meal-draft.ts`
  - local storage defaults for add flow

## Data Flow

- Home uses selected-date meals plus weekly preview stats
- Detail loads one meal by id and reuses existing comment/reaction behavior
- Archive loads recent meals or search results and filters client-side
- Add reads/writes draft defaults locally

## Error Handling

- Missing detail record routes back to home with a toast or fallback message
- Archive search failure should degrade to an empty-state message instead of a broken page
- Invalid stored add defaults should fall back to safe defaults

## Testing Strategy

- Static UI tests should verify:
  - home uses summary cards, not inline activity panels
  - detail and archive routes exist
  - bottom dock remains wired
- Playwright should verify:
  - open meal detail from home
  - reactions/comments work from detail
  - archive search and filters work
  - add defaults persist locally in QA mode

## Assumptions

- Detail routes use `/meals/[id]`
- Archive is a route, not a fourth bottom-nav tab
- Local draft defaults are device-local convenience state, not server-synced preferences
