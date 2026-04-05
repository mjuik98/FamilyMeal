# Feature Server Boundaries Refactor Design

**Goal:** `comments`, `reactions`, `profile` 의 서버 측 기능 코드를 해당 feature module 내부로 옮겨 기능 소유권을 분명하게 하면서, 기존 `lib/server/*` 진입점은 호환 shim 으로 유지한다.

## Scope

이번 설계는 다음 세 묶음만 다룬다.

1. `comments` 의 route policy, type, use case 를 `lib/modules/comments/server/*` 로 이동
2. `reactions` 의 route policy, use case 를 `lib/modules/reactions/server/*` 로 이동
3. `profile` 의 session/save use case 를 `lib/modules/profile/server/*` 로 이동

## Constraints

- 현재 API route URL, payload, Firebase transaction 동작은 바꾸지 않는다.
- 기존 `lib/server/comments/*`, `lib/server/reactions/*`, `lib/server/profile/*` 경로는 삭제하지 않고 re-export shim 으로 남긴다.
- `features/*` 와 `modules/*/infrastructure/*` 구조는 유지하고, 이번 턴은 server-side 기능 소스 위치만 feature 중심으로 정리한다.

## Target Shape

### Comments

`comments` 모듈은 UI/application/runtime 뿐 아니라 서버 측 route parsing 과 mutation logic 도 같은 모듈 아래에 갖는다.

- `lib/modules/comments/server/comment-types.ts`
- `lib/modules/comments/server/comment-policy.ts`
- `lib/modules/comments/server/comment-use-cases.ts`

`app/api/meals/[id]/comments/*` 는 이 module-local server 파일만 import 한다.

### Reactions

반응 관련 입력 파싱과 transaction logic 도 `reactions` 모듈 아래에 모은다.

- `lib/modules/reactions/server/reaction-policy.ts`
- `lib/modules/reactions/server/reaction-use-cases.ts`

`app/api/meals/[id]/reactions` 및 comment reaction route 는 이 경로만 import 한다.

### Profile

프로필 session/role/settings 저장 use case 는 `profile` 모듈의 server 구현으로 이동한다.

- `lib/modules/profile/server/profile-use-cases.ts`

`app/api/profile/*` 는 module-local server path 를 사용한다.

## Dependency Rule

- `app/api/*` -> `lib/modules/<feature>/server/*`
- `lib/modules/<feature>/server/*` -> shared platform/config/firebase/activity helpers
- `lib/server/*` -> module-local server implementation re-export only

즉, 기존 `lib/server/*` 는 더 이상 “실제 구현 위치”가 아니라 호환 레이어가 된다.

## Non-Goals

- Firebase access 자체를 port/repository 로 분리하는 작업
- activity log 분리를 위한 비동기 이벤트화
- `meals` server use case 의 module-local 이동

## Verification

- 구조 테스트: module-local server 파일 존재와 shim 경로를 검증
- API/소스 테스트: route 가 새 module-local server 경로를 import 하는지 검증
- 전체 회귀: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
