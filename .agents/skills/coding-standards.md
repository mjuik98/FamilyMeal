---
name: coding-standards
description: Universal coding standards for TypeScript, React, and Node.js.
---

# Coding Standards 

## ⚡ Operational Mandate
Adhere strictly to Immutability, KISS, and DRY. Functions must be under 50 lines. Files must be under 800 lines. Variable names must be descriptive (Verb-Noun). Code readability trumps cleverness.

## TypeScript/JavaScript Standards

### Immutability Pattern (CRITICAL)
```typescript
// ✅ ALWAYS use spread operator
const updatedUser = {
  ...user,
  name: 'New Name'
}

// ❌ NEVER mutate directly
user.name = 'New Name' // BAD
```

### Variable Naming
```typescript
// ✅ GOOD: Descriptive
const isUserAuthenticated = true
const fetchMarketData = () => {}

// ❌ BAD: Vague
const flag = true
const data = () => {}
```

### Error Handling
```typescript
// ✅ GOOD: Comprehensive
try {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
} catch (error) {
  console.error('Fetch failed:', error)
  throw new Error('Failed to fetch data')
}
```

## React Best Practices

### Functional Components
```typescript
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

export function Button({ children, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
```

### State Management
```typescript
// ✅ GOOD: Functional update
setCount(prev => prev + 1)

// ❌ BAD: Direct reference
setCount(count + 1)
```

## File Organization
```
src/
├── app/                    # Next.js App Router
├── components/            # React components
│   ├── ui/               # Generic UI components
│   └── forms/            # Form components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configs
├── types/                # TypeScript types
└── styles/              # Global styles
```

