---
name: jpa-patterns
description: JPA/Hibernate patterns for Spring Boot.
---

# JPA/Hibernate Patterns 

## ⚡ Operational Mandate
Prevent N+1 problems using `JOIN FETCH` or Entity Graphs. Use Lazy Loading by default. Transactions must be marked `@Transactional(readOnly = true)` for read operations.

## Entity Design

```java
@Entity
@Table(name = "markets", indexes = {
  @Index(name = "idx_slug", columnList = "slug", unique = true)
})
public class MarketEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToMany(mappedBy = "market", cascade = CascadeType.ALL)
  private List<PositionEntity> positions = new ArrayList<>();
}
```

## Repository Patterns

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  // Prevent N+1
  @Query("select m from MarketEntity m left join fetch m.positions where m.id = :id")
  Optional<MarketEntity> findWithPositions(@Param("id") Long id);

  // Projections for performance
  interface MarketSummary {
    Long getId();
    String getName();
  }
  Page<MarketSummary> findAllBy(Pageable pageable);
}
```

## Transactions

```java
@Transactional(readOnly = true)
public Market getMarket(Long id) {
  return repo.findById(id).orElseThrow();
}

@Transactional
public Market updateStatus(Long id, MarketStatus status) {
  var entity = repo.findById(id).orElseThrow();
  entity.setStatus(status);
  return entity;
}
```

## Connection Pooling (HikariCP)
```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.connection-timeout=30000
```

