# Family Meal Tracker Architecture Refactor Design

**Goal:** 운영 동작을 유지한 채, 기능 경계를 더 명확히 하고 UI orchestration 과 HTTP delivery boilerplate 를 줄여 이후 리팩터링의 기반을 만든다.

## Scope

이번 설계는 전면 재구성이 아니라 다음 세 가지를 우선 적용한다.

1. `meals` 관련 보조 로직을 module-local 구조로 재배치한다.
2. add/edit 페이지의 상태 관리와 저장 orchestration 을 page component 밖으로 이동한다.
3. API Route Handler 의 공통 에러/응답 패턴을 공통 wrapper 로 정리한다.

## Constraints

- 현재 Route Handler, Firebase Admin/Client, QA runtime 구조는 유지한다.
- import 경로 대량 교체로 인한 운영 리스크를 피하기 위해 기존 경로는 호환 shim 으로 남긴다.
- 동작 변경보다 구조 정리를 우선하며, 필요한 경우에만 테스트 가능한 작은 API 를 추가한다.

## Target Shape

### Meals module

`meals` 관련 순수 정책/문구/폼 유틸/에러 번역은 `lib/modules/meals/*` 아래로 이동한다.

- `domain/`: 정책, 상수, 순수 계산
- `ui/`: 페이지 controller, 사용자 메시지 변환, 이미지 선택/폼 조합 helper
- 기존 루트 `lib/meal-*.ts` 는 module-local 구현을 다시 export 하는 호환 레이어로 유지한다.

### UI orchestration

add/edit 페이지는 라우팅과 layout composition 에 집중하고, 아래 책임은 controller hook 으로 이동한다.

- draft 로드/저장
- 이미지 선택과 preview/validation 처리
- submit phase 관리
- user-facing validation 및 저장 호출

### API delivery

Route Handler 는 다음 패턴을 공통 wrapper 로 통일한다.

- `try/catch`
- `NextResponse.json`
- `{ ok: false, error }` payload
- 상태 코드 매핑

feature route 는 입력 파싱과 use case 호출만 담당한다.

## Non-Goals

- Firestore schema 변경
- QA runtime 제거
- archive search 알고리즘 교체
- 앱 전체를 feature-first 디렉토리로 한 번에 이동

## Verification

- 구조 테스트: 새 controller/import 경계와 shim 존재 여부를 확인
- 단위 테스트: 공통 route wrapper 의 정상/오류 응답 계약 확인
- 기존 회귀 테스트: architecture boundary, API/runtime 관련 테스트 재실행
