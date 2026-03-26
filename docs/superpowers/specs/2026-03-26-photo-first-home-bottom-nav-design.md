# Photo-First Home And Bottom Dock Design

## Goal

Shift the product back to its core value: recording and revisiting meal photos. The home screen should feel like a lightweight visual meal journal, not an interaction dashboard.

## Current Problems

- Home is overloaded with activity summary, activity feed, search, and compound filters.
- The weekly record summary is visually disconnected from date selection.
- The bottom navigation exists, but it does not feel like a primary persistent dock.
- Meal records compete with surrounding chrome instead of leading the screen.

## Product Direction

### Primary Use Case

Users should open the app, pick a day, and immediately see meal photos for that date.

### Secondary Use Case

Users should be able to add a meal quickly from a constantly visible bottom dock.

### De-emphasized Use Case

Global interaction summaries, quick filters, and text search should no longer dominate home.

## Approaches Considered

### Option A: Remove dashboard sections, keep current meal list and top calendar

- Lowest implementation cost
- Improves focus somewhat
- Still leaves the screen feeling like a form-driven utility app

### Option B: Merge weekly history into the date picker and convert home into a photo journal

- Best match for the app's core value
- Clear visual hierarchy: week selector first, meals second
- Requires moderate layout and test updates

### Option C: Create a separate gallery home and move the current home into an archive tab

- Strong long-term structure
- Too large for this iteration because it adds navigation and route churn

## Recommendation

Choose Option B.

This keeps the existing data model and meal detail behavior while materially improving the first screen. It removes the wrong emphasis without introducing an extra information architecture layer.

## Design

### Home Layout

The home screen will have four stacked zones:

1. Compact personal header with greeting and logout action
2. A photo-led weekly journal header
3. Inline calendar reveal for wider date jumps
4. The selected day's meal photo feed

Removed from home:

- activity summary card
- activity feed list
- search box
- quick filters
- participant/type/reaction filter groups
- notification upsell card

### Weekly Journal Header

The date selection area becomes the primary visual anchor.

It combines:

- selected date label
- weekly record count
- horizontal seven-day selector
- small per-day record indicators
- optional inline calendar expander for non-week jumps

Each day pill shows:

- weekday label
- day number
- meal count for that day
- active state for selected date

### Meal Presentation

Home should emphasize imagery before metadata.

Meal cards remain interactive, but the top of each card should read as:

- large image
- meal type and time
- short description
- compact participation / reaction metadata

Comments and reactions remain inside the meal card flow, but home no longer adds extra global interaction surfaces around them.

### Bottom Navigation

The bottom navigation becomes a persistent dock:

- always fixed to the viewport bottom
- stronger contrast from page background
- larger touch targets
- more prominent center compose action
- safe-area aware

The dock should read as part of the app shell, not as an afterthought.

### Add Page

The add screen should reinforce the app's photo-first posture:

- image picker leads the screen
- copy is shorter
- meal type and participants remain available but secondary

No data-model changes are needed for this round.

## Components And Boundaries

- `app/page.tsx`
  - remove dashboard/search/filter composition
  - render weekly journal header and photo-first daily feed
- new `components/WeekDateStrip.tsx`
  - encapsulate weekly date navigation and per-day counts
- `components/Navbar.tsx`
  - upgrade to a more obvious persistent bottom dock
- `app/add/page.tsx`
  - tighten hierarchy around image capture
- `app/styles/layout.css`
  - add home journal and dock styles

Existing meal/comment/reaction internals stay in place unless needed for layout polish.

## Data Flow

- Keep existing meal subscription by selected date
- Keep weekly stats fetch
- Derive the seven-day strip from the selected date and weekly stats
- No server API changes are required

## Error Handling

- If weekly stats fail, home still renders the selected date and meals
- If no meals exist for a day, show an image-friendly empty state with a clear path to create one

## Testing Strategy

- Update static UI tests to assert the new home composition and persistent dock structure
- Update Playwright tests to verify:
  - weekly strip renders
  - calendar reveal still works
  - home no longer shows removed dashboard/filter surfaces
  - bottom navigation is visible without scrolling
- Keep existing comment/reaction interaction coverage where still relevant

## Assumptions

- Search and advanced filtering are removed from home only, not deleted from the codebase entirely.
- Activity logging and notification preferences remain in the product, but their global home UI is removed.
- Meal detail interactions continue to live inside each meal card for now instead of moving to a dedicated detail route in this iteration.
