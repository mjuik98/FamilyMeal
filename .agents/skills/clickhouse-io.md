---
name: clickhouse-io
description: ClickHouse analytics patterns and optimization.
---

# ClickHouse Patterns 

## ⚡ Operational Mandate
Use MergeTree engine for all analytics tables. Partition by time (`toYYYYMM`). Bulk Inserts are mandatory; single-row inserts are forbidden.

## Table Design Patterns

### MergeTree Engine
```sql
CREATE TABLE markets_analytics (
    date Date,
    market_id String,
    volume UInt64,
    created_at DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, market_id)
SETTINGS index_granularity = 8192;
```

### ReplacingMergeTree (Deduplication)
```sql
CREATE TABLE user_events (
    event_id String,
    timestamp DateTime
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_id, timestamp);
```

### AggregatingMergeTree
```sql
CREATE TABLE market_stats_hourly (
    hour DateTime,
    total_volume AggregateFunction(sum, UInt64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour);
```

## Query Optimization

### Efficient Filtering
```sql
-- ✅ GOOD: Filter on indexed columns first
SELECT * FROM analytics
WHERE date >= '2025-01-01' AND market_id = '123';

-- ❌ BAD: Filter on non-indexed columns first
SELECT * FROM analytics
WHERE volume > 1000;
```

## Data Insertion Patterns

### Bulk Insert (Recommended)
```typescript
const values = trades.map(t => `('${t.id}', ${t.amount})`).join(',')
await clickhouse.query(`INSERT INTO trades VALUES ${values}`).toPromise()
```

### Materialized Views
```sql
CREATE MATERIALIZED VIEW market_stats_mv TO market_stats
AS SELECT
    toStartOfHour(timestamp) AS hour,
    sumState(amount) AS total_volume
FROM trades
GROUP BY hour;
```

