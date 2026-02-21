---
description: Sync documentation from source of truth
---

# Update Documentation Workflow 

## ⚡ Operational Mandate
Documentation must reflect reality. You are required to synchronize docs from the Single Source of Truth (Code, Config) to prevent drift.

## 1. Analyze package.json
// turbo
```bash
cat package.json | grep -A 100 '"scripts"'
```
Extract all scripts and generate reference table.

## 2. Analyze Environment Variables
// turbo
```bash
cat .env.example
```
Document each variable's purpose and format.

## 3. Generate CONTRIB.md
Create/update `docs/CONTRIB.md` with:
- Development workflow
- Available scripts
- Environment setup
- Testing procedures

## 4. Generate RUNBOOK.md
Create/update `docs/RUNBOOK.md` with:
- Deployment procedures
- Monitoring and alerts
- Common issues and fixes
- Rollback procedures

## 5. Find Obsolete Docs
// turbo
```bash
find docs -name "*.md" -mtime +90 -type f
```
List docs not modified in 90+ days for review.

## 6. Show Changes
// turbo
```bash
git diff --stat docs/
```

---

## Source of Truth
- `package.json` - Scripts and dependencies
- `.env.example` - Environment variables
- `README.md` - Project overview

