# Architecture Boundary Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten module boundaries, replace stringly-typed API errors with structured contracts, and push QA/runtime branching behind infrastructure adapters without rewriting the app.

**Architecture:** Add `lib/modules/*` contracts and infrastructure adapters while keeping existing feature services and routes operational. Introduce shared route error serialization and typed client API errors so presentation code stops depending on raw server message strings.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase client/admin SDK, Node test runner, ESLint

---

## Chunk 1: Red Tests

### Task 1: Add failing architecture and API error tests

**Files:**
- Create: `tests/architecture-boundaries.test.mjs`
- Create: `tests/auth-http-runtime.test.mts`
- Modify: `package.json`

- [ ] Add a source-level architecture regression test covering module contracts, boundary lint rules, and QA adapter indirection.
- [ ] Add a runtime test covering structured API error parsing and `ApiError` throwing.
- [ ] Wire the new tests into the existing npm test scripts.
- [ ] Run the focused commands and confirm they fail before implementation.

## Chunk 2: Contracts And Boundary Guardrails

### Task 2: Introduce module contracts and lint restrictions

**Files:**
- Create: `lib/modules/meals/contracts.ts`
- Create: `lib/modules/comments/contracts.ts`
- Create: `lib/modules/profile/contracts.ts`
- Modify: `lib/client/meal-mutations.ts`
- Modify: `eslint.config.mjs`

- [ ] Add explicit create/update/query contracts for meals/comments/profile.
- [ ] Stop using broad `Meal`-shaped mutation inputs on the client.
- [ ] Add lint restrictions that block UI code from server/admin imports and block feature services from importing `lib/qa/runtime` directly.
- [ ] Run the focused architecture test and lint.

## Chunk 3: Runtime Adapter Separation

### Task 3: Push QA/live branching behind infrastructure adapters

**Files:**
- Create: `lib/modules/meals/infrastructure/meal-read-runtime.ts`
- Create: `lib/modules/meals/infrastructure/meal-editor-runtime.ts`
- Create: `lib/modules/comments/infrastructure/comment-runtime.ts`
- Create: `lib/modules/reactions/infrastructure/reaction-runtime.ts`
- Create: `lib/modules/profile/infrastructure/user-session-runtime.ts`
- Modify: `lib/features/meals/application/meal-read-service.ts`
- Modify: `lib/features/meals/application/meal-editor-service.ts`
- Modify: `lib/features/comments/application/meal-comment-service.ts`
- Modify: `lib/features/reactions/application/meal-reaction-service.ts`
- Modify: `lib/features/profile/application/user-session-service.ts`

- [ ] Move QA/runtime selection into infrastructure adapter modules.
- [ ] Keep feature application services focused on orchestration and contracts.
- [ ] Preserve behavior while removing direct `lib/qa/runtime` imports from feature services.
- [ ] Run focused runtime tests.

## Chunk 4: Structured Error Contracts

### Task 4: Introduce shared route error serialization and typed client errors

**Files:**
- Create: `lib/platform/errors/api-error.ts`
- Create: `lib/platform/http/route-response.ts`
- Modify: `lib/route-errors.ts`
- Modify: `lib/server-auth.ts`
- Modify: `lib/client/auth-http.ts`
- Modify: `lib/meal-errors.ts`
- Modify: `lib/features/comments/ui/useMealCommentsController.ts`
- Modify: `app/api/**/*.ts` (as needed)

- [ ] Add structured error payloads with stable codes and messages.
- [ ] Make client fetch helpers throw typed errors carrying `status` and `code`.
- [ ] Convert meal/comment UI error mapping to code-first handling with message fallback.
- [ ] Run focused runtime/API tests.

## Chunk 5: Documentation And Full Verification

### Task 5: Update architecture docs and run the full verification sweep

**Files:**
- Modify: `docs/architecture.md`
- Modify only as needed for verification fixes

- [ ] Refresh the architecture document to reflect the new contracts, adapter boundaries, and error flow.
- [ ] Run `npm run test:ui`.
- [ ] Run `npm run test:api`.
- [ ] Run `npm run test:api:runtime`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
