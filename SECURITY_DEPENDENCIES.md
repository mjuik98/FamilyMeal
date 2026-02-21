# Dependency Security Notes

## Current status
- `npm audit fix` was run on 2026-02-21.
- Remaining high-severity items are mostly upstream transitive dependencies in:
  - `@ducanh2912/next-pwa` / `workbox-*`
  - `eslint` and `eslint-config-next` toolchain
- `npm audit --json` is uploaded as a CI artifact (`dependency-audit-report`) on every run.

## Policy
1. Run `npm run audit:report` after dependency updates.
2. Apply non-breaking fixes with `npm audit fix`.
3. Avoid `npm audit fix --force` unless a dedicated upgrade task is planned.
4. Re-evaluate unresolved high items monthly or when upstream releases fixes.
5. If a vulnerability becomes exploitable in production paths, prioritize replacing or removing the affected package.
