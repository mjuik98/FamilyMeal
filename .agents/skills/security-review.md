---
name: security-review
description: Comprehensive security checklist and patterns for authentication, input validation, secrets, and sensitive data.
---

# Security Review Skill 

## ⚡ Operational Mandate
Security is non-negotiable. You are strictly forbidden from hardcoding secrets. All user inputs must be validated via Zod Schemas. SQL injection must be prevented using Parameterized Queries.

## Security Checklist

### 1. Secrets Management
#### ❌ NEVER Do This
```typescript
const apiKey = "sk-proj-xxxxx"
```
#### ✅ ALWAYS Do This
```typescript
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
```

### 2. Input Validation (Zod)
```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0)
})

export async function createUser(input: unknown) {
  const validated = CreateUserSchema.parse(input)
  return await db.users.create(validated)
}
```

### 3. SQL Injection Prevention
#### ❌ NEVER Concatenate SQL
```typescript
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
```
#### ✅ ALWAYS Use Parameterized Queries
```typescript
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)
```

### 4. XSS Prevention
#### Sanitize HTML
```typescript
import DOMPurify from 'isomorphic-dompurify'

function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p']
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

### 5. CSRF Protection
#### CSRF Tokens
```typescript
export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')
  if (!csrf.verify(token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
}
```

### 6. Rate Limiting
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
```

### 7. Pre-Deployment Checklist
- [ ] Secrets: No hardcoded secrets, all in env vars
- [ ] Input Validation: All inputs validated (Zod)
- [ ] SQL Injection: No raw string concatenation
- [ ] XSS: User content sanitized
- [ ] CSRF: Tokens/SameSite cookies enabled
- [ ] Auth: Proper token verification (HttpOnly)

