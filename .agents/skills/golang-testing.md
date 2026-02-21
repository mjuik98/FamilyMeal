---
name: golang-testing
description: Go testing patterns and TDD workflow.
---

# Go Testing Patterns 

## ⚡ Operational Mandate
Table-Driven Tests are mandatory. Subtests (`t.Run`) must be used for structure. Benchmarks (`BenchmarkXxx`) are required for performance-critical code.

## Table-Driven Tests
```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -1, -2},
        {"mixed", -1, 1, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

## Mocking
```go
type UserRepository interface {
    GetUser(id string) (*User, error)
}

type MockRepo struct {
    GetUserFunc func(string) (*User, error)
}

func (m *MockRepo) GetUser(id string) (*User, error) {
    return m.GetUserFunc(id)
}
```

## Benchmarks
```go
func BenchmarkProcess(b *testing.B) {
    data := generateData()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Process(data)
    }
}
```

## Fuzzing
```go
func FuzzParse(f *testing.F) {
    f.Add("test input")
    f.Fuzz(func(t *testing.T, input string) {
        if _, err := Parse(input); err != nil {
            return // expected
        }
    })
}
```

