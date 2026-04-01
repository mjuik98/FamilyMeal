# Family Meal Tracker Architecture

## 개요

이 프로젝트는 Next.js App Router 를 중심으로 클라이언트 UI와 서버 API 를 한 저장소에서 운영합니다.  
읽기 중심 데이터는 클라이언트 Firebase SDK 를 사용하고, 쓰기/보안 민감 작업은 Next.js Route Handler 를 통해 Firebase Admin SDK 로 처리합니다.
최근 리팩터링으로 `lib/` 내부를 역할별 경계로 나눴습니다. 현재 기준 핵심 축은 `lib/client/*`(클라이언트 데이터 접근), `lib/config/*`(공개/서버 설정), `lib/domain/*`(공통 정책), `lib/server/*`(서버 유스케이스) 입니다.

## 주요 흐름

### 인증과 프로필

- 클라이언트는 Firebase Auth 로 로그인합니다.
- 서버 API 는 `Authorization: Bearer <id-token>` 을 받아 `lib/server-auth.ts` 에서 검증합니다.
- 운영 환경에서는 `ALLOWED_EMAILS` allowlist 가 비어 있으면 fail-closed 입니다.
- 역할 선택과 프로필 설정은 `/api/profile/*` 경로에서 처리합니다.
- 클라이언트 세션/프로필 읽기와 역할 저장은 `context/UserContext.tsx` 에 직접 남기지 않고 `lib/client/profile-session.ts` 로 위임합니다.

### 식사 기록

- 클라이언트 식사 읽기/검색/정렬/주간 통계는 `lib/client/meals.ts` 가 담당합니다.
- `lib/data.ts` 는 기존 호출부 호환성을 위한 얇은 배럴입니다.
- 식사 생성/수정/삭제는 `/api/meals` 와 `/api/meals/[id]` 에서 처리합니다.
- 서버 측 직렬화와 필드 보정은 `lib/server-meals.ts` 가 담당합니다.
- 댓글은 `meals/{mealId}/comments` 서브컬렉션에 저장됩니다.

### 댓글과 반응

- Meal 상세 UI 는 `components/MealCard.tsx` 에서 조합합니다.
- 댓글 상태는 `components/hooks/useMealComments.ts` 와 `lib/meal-comments-store.ts` 로 분리돼 있습니다.
- 반응 상태는 `components/hooks/useMealReactions.ts` 로 분리돼 있습니다.
- 댓글 클라이언트 호출은 `lib/client/comments.ts`, 반응 클라이언트 호출은 `lib/client/reactions.ts` 로 분리했습니다.
- 댓글 생성/수정/삭제의 서버 트랜잭션 로직은 `lib/server/comments/comment-use-cases.ts` 로 추출했고, API 라우트는 얇은 컨트롤러 역할만 수행합니다.
- 댓글/반응 변경은 모두 전용 API 라우트로 보냅니다.

### 홈과 아카이브

- 홈 화면은 `useSelectedDate`, `useMealsForDate`, `useWeeklyStats` 훅으로 날짜/식사/주간 통계를 분리합니다.
- 아카이브 화면은 최근 기록 조회와 검색을 제공하고, 검색 입력은 지연된 쿼리 기준으로 원격 조회합니다.

### QA / 운영 제어

- `proxy.ts` 가 `/qa/*` 라우트를 제어합니다.
- 개발 환경에서는 QA 라우트가 열려 있습니다.
- 운영 환경에서는 `NEXT_PUBLIC_ENABLE_QA=true` 와 `QA_ROUTE_TOKEN` 이 있어야 접근 가능합니다.

### PWA / 업데이트

- PWA 는 `NEXT_PUBLIC_ENABLE_PWA=true` 일 때만 `next-pwa` 로 활성화됩니다.
- `components/AppUpdateBanner.tsx` 가 서비스 워커 업데이트를 감시합니다.
- PWA 가 비활성화된 환경에서는 레이아웃에서 기존 service worker 와 캐시를 정리합니다.

## 디렉터리 책임

- `app/`: 페이지와 서버 API
- `components/`: UI 조립과 표현 컴포넌트
- `components/hooks/`: 화면/상세 상태 훅
- `components/comments/`, `components/meal-detail/`: 세부 UI 조각
- `context/`: 사용자 컨텍스트
- `lib/client/`: 클라이언트 데이터 접근과 API 호출
- `lib/config/`: 공개/서버 환경변수 접근
- `lib/domain/`: 공통 정책과 상수
- `lib/server/`: 서버 유스케이스와 라우트 보조 로직
- `lib/`: Firebase 초기화, 타입, 공통 유틸, 호환 배럴
- `scripts/`: 스모크 테스트, 마이그레이션, 보조 도구
- `tests/`: 구조 회귀 테스트, API 보안 테스트, Firestore Rules 테스트, E2E

## 검증 전략

- `tests/ui-theme.test.mjs`: UI 구조/회귀를 소스 문자열 기준으로 고정
- `tests/api-security.test.mjs`: API 보안/서버 경계 회귀를 고정
- `tests/firestore.rules.test.mjs`: Firestore Rules 검증
- `tests/e2e/*`: 브라우저 플로우 검증

## 현재 주의 지점

- 식사 삭제/수정에는 일부 레거시 participant 권한 fallback 이 아직 남아 있습니다.
- 검색은 인덱스 검색 실패 시 제한된 fallback scan 을 사용합니다.
- PWA 관련 생성물은 빌드 환경과 플래그에 따라 public 자산이 바뀔 수 있습니다.
