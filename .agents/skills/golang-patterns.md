---
name: golang-patterns
description: Idiomatic Go patterns and best practices.
---

# Go Patterns 

## ⚡ Operational Mandate
Simplicity > Cleverness. Accept interfaces, return structs. Handle errors explicitly (`if err != nil`). Use context for cancellation.

## Core Patterns

### Interface Implementation
```go
// Good: Returns concrete type
func NewUser(name string) *User {
    return &User{Name: name}
}
```

### Error Wrapping
```go
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config %s: %w", path, err)
    }
    return parse(data), nil
}
```

### Worker Pool
```go
func WorkerPool(jobs <-chan Job, results chan<- Result, workers int) {
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

### Functional Options
```go
type Server struct {
    timeout time.Duration
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func NewServer(opts ...Option) *Server {
    s := &Server{timeout: 30 * time.Second}
    for _, opt := range opts { opt(s) }
    return s
}
```

