---
description: Feature implementation planning workflow
---

# Implementation Planning 

## ⚡ Operational Mandate
You are required to construct a comprehensive Implementation Plan before writing a single line of production code. This plan serves as the architectural blueprint and must be verified against implicit requirements and potential risks.

## 1. Requirements Analysis
- Understand user request precisely
- Identify implicit requirements
- Confirm constraints

## 2. Codebase Investigation
// turbo
```bash
# Explore related files
find . -type f -name "*.ts" | head -20
```

// turbo
```bash
# Search patterns
grep -r "keyword" --include="*.ts" .
```

## 3. Dependency Analysis
- Identify affected modules
- Prevent circular dependencies
- Identify breaking changes

## 4. Create Implementation Plan
- Break into phases (max 3)
- Estimate time per phase
- Document risks and mitigations

## 5. Test Strategy
- Determine required test types
- Identify mock targets
- Define E2E scenarios

## 6. Document Plan Template
You must generate a file following this exact headers structure:

```markdown
# [Feature Name]

## Goal
[One-line description]

## Changes
1. [File/Module]: [Change description]
2. ...

## Test Strategy
- Unit: ...
- Integration: ...
- E2E: ...

## Risks
- [Risk]: [Mitigation]
```

