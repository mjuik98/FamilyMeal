---
description: Code review checklist execution
---

# Code Review Workflow 

## ⚡ Operational Mandate
You are strictly required to execute a systematic Code Review before any merge. This checklist is not optional; it is the gatekeeper of quality.

## 1. Check Changes
// turbo
```bash
git diff --stat
```

// turbo
```bash
git diff
```

## 2. Security Check (CRITICAL)
- [ ] No hardcoded secrets
- [ ] User input validated
- [ ] SQL injection prevented
- [ ] XSS prevented

## 3. Code Quality Check
- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] Nesting ≤ 4 levels
- [ ] Immutable patterns used
- [ ] Proper error handling

## 4. Test Check
// turbo
```bash
npm test -- --coverage
```
- [ ] Coverage 80%+
- [ ] Tests added for new features
- [ ] No broken tests

## 5. Lint/Format Check
// turbo
```bash
npm run lint
```

## 6. Issue Classification

### CRITICAL (Must fix)
- Security vulnerabilities
- Data loss potential
- Crash-inducing bugs

### HIGH (Should fix)
- Performance issues
- Incorrect logic
- Missing error handling

### MEDIUM (Fix if possible)
- Code style issues
- Refactoring needed
- Documentation gaps

### LOW (Note for later)
- Minor improvements
- Optional optimizations

