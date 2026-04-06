# Family Meal Tracker Project Improvement Sweep Design

**Goal:** 현재 동작을 유지하면서 남아 있는 구조 불일치, 큰 페이지 orchestration, 접근성/오류 피드백의 약한 지점을 한 번에 정리해 이후 기능 추가 비용을 낮춘다.

## Scope

이번 설계는 다음 네 가지를 함께 다룬다.

1. `meals` 서버 로직을 module-local adapter 경계에 맞춰 재정리한다.
2. 홈, 아카이브, 상세 페이지의 인증/요청 orchestration 을 page component 밖 controller hook 으로 이동한다.
3. 아이콘 버튼, 이미지 오버레이, 프로필 저장 흐름의 접근성과 오류 피드백을 보강한다.
4. 구조 테스트를 실제 경계와 계약 중심으로 보강하고, 리팩터링에 과도하게 취약한 문자열 고정 테스트 일부를 완화한다.

## Constraints

- 현재 Firestore schema, API route shape, QA runtime 동작은 유지한다.
- 진행 중인 module-local 구조(`lib/modules/*`, `lib/platform/*`)를 따르고, 호환 shim 이 필요한 곳만 남긴다.
- 사용자 지시에 따라 승인 대기 없이 진행하되, 중요한 판단과 가정은 문서와 최종 보고에 남긴다.
- 가시적인 동작 변화는 접근성/피드백 개선처럼 사용자 경험에 직접 도움이 되는 범위로 제한한다.

## Assumptions

- 메인 브랜치에서 직접 작업하지 않기 위해 전용 작업 브랜치를 새로 만든다.
- 이미지 표시는 당장 전체를 `next/image` 로 전환하기보다, 현재 PWA/Firebase URL 구조를 깨지 않는 범위에서 공통 속성과 접근성을 먼저 정리한다.
- 아카이브/홈/상세의 controller 추출은 현재 add/edit 패턴을 따르되, 파일 수를 과도하게 늘리지 않고 각 페이지별 단일 controller 훅으로 시작한다.

## Target Shape

### Meals server boundaries

`meals`는 다른 도메인처럼 server use case 와 Firebase Admin 접근 사이에 adapter 레이어를 둔다.

- `server/*`: 정책, orchestration, route-facing use case
- `adapters/firestore/*`: Firestore read/write/delete 및 보조 persistence
- `adapters/storage/*`: Storage delete/upload 같은 외부 저장소 접근

이렇게 하면 `meals`도 `comments`/`reactions`와 같은 규칙으로 lint/test 를 잠글 수 있고, 서버 로직 테스트 시 mock 범위가 더 분명해진다.

### Page controllers

다음 페이지는 component 가 layout composition 에 집중하고, 상태 전이는 controller hook 이 맡는다.

- `app/page.tsx`
- `app/archive/page.tsx`
- `app/meals/[id]/page.tsx`

controller 는 다음을 담당한다.

- auth gate 와 redirect 타이밍
- request sequence 와 stale response 무시
- loading/empty/error 상태 조립
- 사용자 액션 핸들러

### Accessibility and UX feedback

- 아이콘 전용 버튼에는 명시적 `aria-label` 을 부여한다.
- 이미지 확대 오버레이는 dialog semantics, close label, keyboard/focus 경로를 가진다.
- 프로필 알림 저장은 실패 시 사용자에게 toast/error 를 보여주고, 이전 상태를 보존하거나 롤백 가능한 구조로 맞춘다.

### Test strategy

- 경계 테스트는 "어떤 레이어가 어떤 구현을 소유하는가"를 중심으로 유지한다.
- UI 문자열 고정 테스트는 유지하되, 리팩터링 시 불필요하게 깨지는 세부 import/JSX 패턴 검사는 계약성 높은 assertion 으로 치환한다.
- 새 controller 와 adapter 는 runtime test 또는 architecture boundary test 로 락을 건다.

## Non-Goals

- Firestore 인덱스/검색 알고리즘 재설계
- 이미지 파이프라인 전체를 `next/image` 중심으로 전환
- QA fixture 구조 재작성
- 디자인 시스템 전면 개편

## Verification

- focused tests: architecture/UI/runtime suites
- static checks: `npm run lint`, `npm run typecheck`
- integration regression: `npm run test`
- build verification: placeholder env 를 사용한 `npm run build`
