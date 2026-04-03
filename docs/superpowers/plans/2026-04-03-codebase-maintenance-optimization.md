# Codebase Maintenance Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove clearly dead code and stale assets, trim unused dependencies, and refresh operational docs without changing user-facing behavior.

**Architecture:** Keep runtime behavior stable by limiting edits to unreferenced compatibility wrappers, inactive activity-feed UI code, generated assets that should not be tracked, and documentation/config drift. Validate the cleanup with source-level regression tests plus lint, typecheck, and production build.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner, Playwright

---

### Task 1: Lock cleanup intent in regression tests

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [ ] Add source-level assertions that dead activity-feed UI and client-only feed helpers are removed.
- [ ] Add assertions that deprecated compat hook wrappers under `components/hooks/` are removed.
- [ ] Add assertions that stale tracked assets (`public/sw.js`, `public/videos/demo.webp`) are removed.
- [ ] Add assertion that the unused `@opentelemetry/api` dependency is removed.

### Task 2: Remove dead code and stale assets

**Files:**
- Modify: `lib/activity.ts`
- Modify: `lib/client/activity.ts`
- Modify: `lib/data.ts`
- Modify: `lib/types.ts`
- Delete: `components/ActivityFeed.tsx`
- Delete: `components/hooks/useMealComments.ts`
- Delete: `components/hooks/useMealReactions.ts`
- Delete: `components/hooks/useMealsForDate.ts`
- Delete: `components/hooks/useWeeklyStats.ts`
- Delete: `public/sw.js`
- Delete: `public/videos/demo.webp`

- [ ] Keep notification-preference behavior intact while removing unused activity-feed client helpers.
- [ ] Remove dead compatibility wrappers and stale tracked assets.
- [ ] Preserve direct controller imports already used by runtime pages.

### Task 3: Trim dependency and config/document drift

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] Remove top-level dependencies with no code references.
- [ ] Align CI environment variable naming with current server config.
- [ ] Refresh README and architecture notes to match the cleaned structure and current verification flow.

### Task 4: Verify and record impact

**Files:**
- Modify: `README.md`

- [ ] Run `npm run test:ui`.
- [ ] Run `npm run test:api`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Capture build timing and `.next` footprint deltas for the final report.
