# Read Path And State Hardening Design

## Goal

보안 규칙과 충돌 가능성이 있는 클라이언트 Firestore 목록 조회를 서버 API 기반으로 정리하고, 홈 화면 주간 통계의 stale 상태와 인증 상태 변경 레이스를 함께 제거한다. 폼 입력도 서버 제약과 맞춰 조기 검증한다.

## Scope

- 식사 목록 읽기 경로를 인증된 서버 API로 이동
- 홈 화면 주간 통계를 재검증 가능한 상태로 단순화
- 인증 상태 변경 중 늦게 끝난 프로필 로드가 최신 상태를 덮어쓰지 못하게 보호
- 식사 참여자 선택을 서버 제약과 일치시키고 관련 테스트를 강화

## Approach

### 1. Server-backed meal reads

- `/api/meals` 에 `GET` 을 추가해 날짜별 식사 목록을 반환한다.
- `/api/meals/weekly-stats` 를 추가해 주간 통계를 반환한다.
- 서버 유스케이스는 Admin SDK 로 날짜 범위를 조회한 뒤, 현재 사용자 역할 기준으로 볼 수 있는 meal 만 직렬화해서 반환한다.
- 가시성 판정은 `userIds` 와 레거시 `userId` 를 함께 고려해 현대 문서와 레거시 문서 모두 읽을 수 있게 유지한다.

### 2. Client read adapters

- `lib/client/meal-queries.ts` 의 날짜/검색/최근 읽기 경로를 서버 API 기반으로 정리한다.
- `subscribeMealsForDate` 는 Firestore `onSnapshot` 대신 서버 재조회 기반 subscription facade 로 바꾼다.
- 이 facade 는 즉시 한 번 읽고, 포커스 복귀/visibility 변경/주기적 polling 으로 새 데이터를 반영한다.

### 3. Home stats freshness

- `useWeeklyStatsController` 의 주차 캐시를 제거하고, 선택 주차를 기준으로 직접 로드하는 방식으로 단순화한다.
- 선택 주차 변경, 포커스 복귀, visibility 복귀 시 다시 읽어서 다른 탭이나 다른 기기 변경에도 늦게 stale 되지 않도록 한다.

### 4. Auth race guard

- `UserContext` 의 `onAuthStateChanged` 비동기 경로에 요청 시퀀스 가드를 추가한다.
- 오래 걸린 이전 프로필 로드 결과는 최신 auth state 와 시퀀스가 일치할 때만 반영한다.

### 5. Form constraint alignment

- 참여자 선택이 비어 있으면 제출 전에 즉시 막는다.
- 추가/수정 화면 모두 최소 1명 선택 조건을 명시적으로 검사하고 submit disabled 조건에도 반영한다.

## Testing

- 서버 읽기 유스케이스와 라우트는 runtime test 로 검증한다.
- `UserContext` 는 auth callback race 를 재현하는 runtime test 를 추가한다.
- 참여자 토글과 최소 1명 선택 제약은 unit/runtime test 로 고정한다.
- 기존 정적 소스 매칭 테스트는 새 구조를 반영하도록 최소한만 수정한다.
