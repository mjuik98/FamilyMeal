---
name: postgres-patterns
description: PostgreSQL optimization patterns for schema, indexing, and queries.
---

# PostgreSQL Patterns 

## ⚡ Operational Mandate
Queries must be optimized for performance. N+1 queries are forbidden. Proper Indexing (B-tree for range, GIN for JSON) is mandatory. Reference the Index Cheat Sheet before applying schema changes.

## Quick Reference

### Index Cheat Sheet
| Query Pattern | Index Type | Example |
|---|---|---|
| `WHERE col = value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE col > value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |

## Common Patterns

### Composite Index Order
```sql
-- Equality columns first, then range columns
CREATE INDEX idx ON orders (status, created_at);
-- Optimized for: WHERE status = 'pending' AND created_at > '2024-01-01'
```

### Covering Index
```sql
CREATE INDEX idx ON users (email) INCLUDE (name, created_at);
-- Avoids table lookup for SELECT email, name, created_at
```

### RLS Policy (Optimized)
```sql
CREATE POLICY policy ON orders
  USING ((SELECT auth.uid()) = user_id); -- Wrap in SELECT!
```

### UPSERT Pattern
```sql
INSERT INTO settings (user_id, key, value)
VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value;
```

### Queue Processing (Skip Locked)
```sql
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

## Anti-Pattern Detection

### Find Slow Queries
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

