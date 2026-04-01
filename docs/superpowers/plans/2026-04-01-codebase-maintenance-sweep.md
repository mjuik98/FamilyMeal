# Codebase Maintenance Sweep Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve maintainability, remove dead code and stale assets, reduce avoidable build/runtime overhead, and bring repository documentation back in sync with the current app.

**Architecture:** Keep user-visible behavior stable. Prefer deletion of clearly unreferenced files, migration of duplicated UI infrastructure styles into shared CSS, low-risk build optimization through Next config, and documentation refresh grounded in the current codebase.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase, Node test runner, Playwright

---

### Task 1: Lock intended cleanup points in tests

**Files:**
- Modify: `tests/ui-theme.test.mjs`

- [ ] Add assertions for dead `ActivitySummary` removal.
- [ ] Add assertions for `ConfirmDialog` and `Toast` shared CSS classes.
- [ ] Add assertions for `lucide-react` package import optimization in `next.config.ts`.
- [ ] Add assertion for deferred archive querying.

### Task 2: Apply low-risk code and asset cleanup

**Files:**
- Modify: `components/ConfirmDialog.tsx`
- Modify: `components/Toast.tsx`
- Modify: `app/styles/layout.css`
- Modify: `next.config.ts`
- Modify: `app/archive/page.tsx`
- Delete: `components/ActivitySummary.tsx`
- Delete: stale tracked logs and unused image assets
- Modify: `.gitignore`

- [ ] Move dialog/toast layout styling into shared CSS classes.
- [ ] Enable `lucide-react` package import optimization.
- [ ] Defer archive remote search requests from raw keystrokes.
- [ ] Remove clearly unused component and unreferenced tracked assets.
- [ ] Ignore local-only generated artifacts to prevent reintroduction.

### Task 3: Refresh repository docs

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Create: `docs/architecture.md`

- [ ] Rewrite README to match current stack, commands, env vars, and folder layout.
- [ ] Update `.env.example` with current optional/required variables.
- [ ] Add architecture summary covering request flow and directory responsibilities.

### Task 4: Remove unused dependencies and verify

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Remove any top-level dependency with no code references.
- [ ] Run `npm run test:ui`, `npm run test:api`, `npm run lint`, `npm run typecheck`, `npm run build`.
- [ ] Capture build timing and footprint deltas for the final report.
