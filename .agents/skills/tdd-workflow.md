---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development.
---

# TDD Workflow Skill 

## ⚡ Operational Mandate
Follow RED-GREEN-REFACTOR. 80% coverage is mandatory. Test user journeys, not implementation details.

## TDD Steps

### 1. Write User Journeys
> As a user, I want to [action], so that [benefit]

### 2. Generate Test Cases (RED)
```typescript
describe('Semantic Search', () => {
  it('returns relevant markets', async () => { ... })
  it('handles empty query', async () => { ... })
})
```

### 3. Implement Code (GREEN)
Write minimal code to pass tests.

### 4. Refactor
Improve code quality while keeping tests green.

## Testing Patterns

### Unit Test (React)
```typescript
render(<Button>Click</Button>)
fireEvent.click(screen.getByText('Click'))
expect(handleClick).toHaveBeenCalled()
```

### E2E Test (Playwright)
```typescript
await page.goto('/markets')
await page.fill('input[type="search"]', 'election')
await expect(page.locator("text=Biden")).toBeVisible()
```

