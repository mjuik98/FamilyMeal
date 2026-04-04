# Dependency Security Notes

## Current status
- `npm audit fix` was run on 2026-02-21.
- `npm run audit:prod:check` passes as of 2026-04-04.
- `@ducanh2912/next-pwa` was moved to `devDependencies` because it is only used from `next.config.ts` during build time, which removes the `workbox-*` chain from the production audit surface.
- Any remaining `npm audit` findings are outside the production gate unless they re-enter runtime dependencies.
- `npm audit --json` is uploaded as a CI artifact (`dependency-audit-report`) on every run.

## Policy
1. Run `npm run audit:report` after dependency updates.
2. Run `npm run audit:prod:check` to enforce non-allowlisted high/critical findings in production deps.
3. Keep temporary exceptions in `security/audit-allowlist.json` with advisory/package scope and `expiresOn`.
4. Apply non-breaking fixes with `npm audit fix`.
5. Avoid `npm audit fix --force` unless a dedicated upgrade task is planned.
6. Re-evaluate unresolved high items monthly or when upstream releases fixes.
7. If a vulnerability becomes exploitable in production paths, prioritize replacing or removing the affected package.
