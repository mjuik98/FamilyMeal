# Meals Server Boundaries Refactor Design

**Goal:** `meals` 서버 측 구현을 `lib/modules/meals/server/*` 아래로 옮겨 식사 기능의 서버 소유권을 모듈 안으로 회수하고, 기존 `lib/server/meals/*` 경로는 운영 호환을 위한 shim 으로 유지한다.

## Scope

이번 설계는 다음 항목만 다룬다.

1. `meal-types`, `meal-read-use-cases`, `meal-write-use-cases`, `meal-delete-use-cases`
2. `archive-types`, `archive-use-cases`
3. `meal-image-url`, `meal-storage`
4. `app/api/meals/*`, `app/api/archive`, `app/api/uploads/meal-image` 의 import 정리

## Constraints

- API URL, payload, Firebase transaction, Storage cleanup 동작은 바꾸지 않는다.
- 기존 `lib/server/meals/*` 파일은 삭제하지 않고 module-local 구현을 re-export 하는 shim 으로 남긴다.
- `lib/server/uploads/meal-image-use-cases.ts` 는 이번 턴에서 이동 대상이 아니다.

## Target Shape

`meals` 모듈은 클라이언트/runtime/helper 뿐 아니라 서버 읽기/쓰기/삭제/archive/storage 보조 로직도 같은 모듈 아래에 가진다.

- `lib/modules/meals/server/meal-types.ts`
- `lib/modules/meals/server/meal-read-use-cases.ts`
- `lib/modules/meals/server/meal-write-use-cases.ts`
- `lib/modules/meals/server/meal-delete-use-cases.ts`
- `lib/modules/meals/server/archive-types.ts`
- `lib/modules/meals/server/archive-use-cases.ts`
- `lib/modules/meals/server/meal-image-url.ts`
- `lib/modules/meals/server/meal-storage.ts`

`app/api/meals/*`, `app/api/archive`, `app/api/uploads/meal-image` 는 위 경로만 직접 import 한다.

## Dependency Rule

- `app/api/meals*` -> `lib/modules/meals/server/*`
- `lib/modules/meals/server/*` -> `platform`, `config`, `firebase-admin`, shared domain helpers
- `lib/server/meals/*` -> module-local server implementation re-export only

즉, `lib/server/meals/*` 는 더 이상 실제 구현을 담지 않는다.

## Non-Goals

- Firebase access 를 repository/port 로 재분리하는 작업
- upload use case 를 `modules/meals/server` 로 이동하는 작업
- archive 검색 알고리즘 변경

## Verification

- 구조 테스트: module-local `meals` server 파일 존재 및 legacy shim 검증
- API/보안 테스트: route 가 module-local `meals` server 경로를 직접 import 하는지 검증
- 회귀 검증: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
