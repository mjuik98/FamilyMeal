---
name: backend-patterns
description: Backend architecture patterns, API design, database optimization, and server-side best practices.
---

# Backend Development Patterns 

## ⚡ Operational Mandate
You are mandated to implement a strictly RESTful API structure. Business logic must be encapsulated in a Service Layer, separate from data access (Repository Pattern). All public endpoints must implement Rate Limiting and Centralized Error Handling.

## API Design Patterns

### Repository Pattern

```typescript
interface MarketRepository {
  findAll(filters?: MarketFilters): Promise<Market[]>
  findById(id: string): Promise<Market | null>
  create(data: CreateMarketDto): Promise<Market>
}

class SupabaseMarketRepository implements MarketRepository {
  async findAll(filters?: MarketFilters): Promise<Market[]> {
    let query = supabase.from('markets').select('*')
    // ... filtering logic
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  }
}
```

### Service Layer Pattern

```typescript
class MarketService {
  constructor(private marketRepo: MarketRepository) {}

  async searchMarkets(query: string): Promise<Market[]> {
    // 1. Business logic (Vector search)
    const embedding = await generateEmbedding(query)
    const results = await this.vectorSearch(embedding)

    // 2. Data access
    return this.marketRepo.findByIds(results.map(r => r.id))
  }
}
```

### Middleware Pattern (Auth)

```typescript
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    try {
      req.user = await verifyToken(token)
      return handler(req, res)
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}
```

## Database Patterns

### Query Optimization

```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
  .from('markets')
  .select('id, name, status, volume')
  .eq('status', 'active')
  .limit(10)

// ❌ BAD: Select everything
const { data } = await supabase.from('markets').select('*')
```

### N+1 Query Prevention

```typescript
// ✅ GOOD: Batch fetch
const markets = await getMarkets()
const creatorIds = markets.map(m => m.creator_id)
const creators = await getUsers(creatorIds) // 1 query
const creatorMap = new Map(creators.map(c => [c.id, c]))

markets.forEach(market => {
  market.creator = creatorMap.get(market.creator_id)
})
```

## Reliability Patterns

### Centralized Error Handler

```typescript
export function errorHandler(error: unknown, req: Request): Response {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  
  console.error('Unexpected error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>()

  async checkLimit(ip: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(ip) || []
    const recent = requests.filter(time => now - time < windowMs)
    
    if (recent.length >= limit) return false
    
    recent.push(now)
    this.requests.set(ip, recent)
    return true
  }
}
```

