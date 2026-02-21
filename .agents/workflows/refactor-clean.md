---
description: Dead code cleanup with test verification
---

# Refactor Clean Workflow 

## ⚡ Operational Mandate
Dead code is a liability. You are authorized to purge it, but Safety is paramount. You must verify system integrity via tests before and after every deletion.

## 1. Run Dead Code Analysis
// turbo
```bash
npx knip
```

Alternative tools:
// turbo
```bash
npx depcheck
```

// turbo
```bash
npx ts-prune
```

## 2. Categorize Findings

SAFE (Delete first):
- Unused test utilities
- Unused type definitions
- Old backup files

CAUTION (Review carefully):
- API routes
- Components
- Exported functions

DANGER (Never auto-delete):
- Config files
- Entry points
- Environment files

## 3. Before Each Deletion
// turbo
```bash
npm test -- --watch false
```
*Constraint: Ensure all tests pass BEFORE deleting.*

## 4. Delete Safe Items
Remove one category at a time.

## 5. Verify After Deletion
// turbo
```bash
npm test -- --watch false
```

// turbo
```bash
npm run build
```

## 6. Rollback If Needed
// turbo
```bash
git checkout -- .
```

---

## Guidelines
- Delete one file/export at a time
- Run tests after each deletion
- Commit after each successful cleanup
- Never delete code without running tests first

