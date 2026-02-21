---
description: TDD Workflow - Test-Driven Development execution
---

# TDD Workflow 

## ⚡ Operational Mandate
You are strictly bound by the Test-Driven Development (TDD) protocol. Code creation without a preceding failing test is a violation of this directive. You must adhere to the Red-Green-Refactor cycle without deviation, ensuring distinct commits for each phase.

## 1. Define Interfaces
- Define types/interfaces first
- Finalize function signatures

## 2. Write Tests (RED)
// turbo
```bash
# Create Jest/Vitest test file
touch src/__tests__/[feature].test.ts
```

Testing Principles:
- Test user behavior, NOT implementation details
- Use semantic selectors (`data-testid`)
- Ensure test isolation

## 3. Run Tests - Verify FAIL
// turbo
```bash
npm test -- --watch false
```
*Constraint: System MUST fail at this stage.*

## 4. Minimal Implementation (GREEN)
- Write only enough code to pass tests
- No premature optimization

## 5. Run Tests Again - Verify PASS
// turbo
```bash
npm test -- --watch false
```
*Constraint: System MUST pass now.*

## 6. Refactor (IMPROVE)
- Improve code quality
- Remove duplication
- Tests must still pass

## 7. Verify Coverage
// turbo
```bash
npm test -- --coverage
```
*Target: 80%+ mandatory.*

---

## Test File Structure
```
src/
  __tests__/
    unit/           # Unit tests
    integration/    # Integration tests
  components/
    __tests__/      # Per-component tests
e2e/
  tests/            # E2E tests (Playwright)
```

## Mock Patterns

```typescript
// External service mock
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}))
```

