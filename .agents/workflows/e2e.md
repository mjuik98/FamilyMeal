---
description: E2E testing with Playwright - Generate and run end-to-end tests
---

# E2E Testing Workflow 

## ⚡ Operational Mandate
You are compelled to utilize Playwright for verifying critical user journeys. E2E tests are non-negotiable for high-risk flows (Auth, Checkout, Data Mutation).

## 1. Analyze User Flow
Identify the test scenarios based on user journey.

## 2. Generate Playwright Test
// turbo
```bash
# Install Playwright if not present
npx playwright install
```

Test Structure Template:
```typescript
// tests/e2e/[feature]/[flow].spec.ts
import { test, expect } from '@playwright/test'

test.describe('Feature Flow', () => {
  test('user can complete flow', async ({ page }) => {
    // Navigate
    await page.goto('/feature')
    
    // Interact
    await page.click('[data-testid="action-btn"]')
    
    // Assert
    await expect(page.locator('h1')).toContainText('Success')
  })
})
```

## 3. Run E2E Tests
// turbo
```bash
npx playwright test
```

## 4. Run Specific Test
// turbo
```bash
npx playwright test tests/e2e/[feature]/[flow].spec.ts
```

## 5. Debug Mode
// turbo
```bash
npx playwright test --debug
```

## 6. View Report
// turbo
```bash
npx playwright show-report
```

## 7. Generate Test Code (Codegen)
// turbo
```bash
npx playwright codegen http://localhost:3000
```

---

## Best Practices

DO:
- Use Page Object Model for maintainability
- Use `data-testid` attributes for selectors
- Wait for API responses, not arbitrary timeouts
- Run tests before merging to main

DON'T:
- Use brittle CSS class selectors
- Test implementation details
- Ignore flaky tests
- Run tests against production

## Test Artifacts
On failure, Playwright captures:
- Screenshot of the failing state
- Video recording of the test
- Trace file for step-by-step debugging
- Network/console logs

