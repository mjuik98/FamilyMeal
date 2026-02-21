---
description: Build error resolution workflow
---

# Build Error Resolution 

## ⚡ Operational Mandate
You are mandated to resolve build errors through a rigorous Incremental Analysis cycle. Random guesses are forbidden. You must identify the root cause, apply a surgical fix, and verify immediately.

## 1. Collect Error Messages
// turbo
```bash
npm run build 2>&1 | head -100
```

## 2. Analyze Errors
- Identify error type (type, lint, bundling, etc.)
- Check error source file
- Analyze stack trace

## 3. Incremental Fixes

### Type Errors
// turbo
```bash
npx tsc --noEmit
```

### Lint Errors
// turbo
```bash
npm run lint -- --fix
```

### Dependency Issues
// turbo
```bash
rm -rf node_modules package-lock.json && npm install
```

## 4. Verify After Fix
// turbo
```bash
npm run build
```

## 5. Confirm Tests Pass
// turbo
```bash
npm test -- --watch false
```

## Guidelines
- Fix one issue at a time
- Rebuild after each fix
- Check related tests
- Consider rolling back recent changes for unexplained errors

