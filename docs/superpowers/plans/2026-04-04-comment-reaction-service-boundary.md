# Comment / Reaction Service Boundary Plan

## Goal

Move comment and reaction orchestration out of UI hooks and behind feature-level application services, matching the meal/profile service boundary introduced in the previous refactor slice.

## Scope

- Add `lib/features/comments/application/meal-comment-service.ts`
- Add `lib/features/reactions/application/meal-reaction-service.ts`
- Migrate:
  - `lib/features/comments/ui/useMealCommentsController.ts`
  - `lib/features/reactions/ui/useMealReactionsController.ts`
- Add runtime tests for the new services
- Update source-shape tests to enforce the new boundary

## Intended Boundaries

- UI hooks may depend on feature application services and local UI types.
- UI hooks should not import:
  - `@/lib/client/comments`
  - `@/lib/client/reactions`
  - `@/lib/qa/runtime`
- Application services may depend on:
  - client adapters
  - QA runtime
  - shared stores/helpers

## Verification

- `npm run test:ui`
- `npm run test:api:runtime`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
