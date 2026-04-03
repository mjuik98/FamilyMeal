# Family Meal Tracker Architecture

## 개요

이 프로젝트는 Next.js App Router 를 중심으로 클라이언트 UI와 서버 API 를 한 저장소에서 운영합니다.  
읽기 중심 데이터는 클라이언트 Firebase SDK 를 사용하고, 쓰기/보안 민감 작업은 Next.js Route Handler 를 통해 Firebase Admin SDK 로 처리합니다.
최근 리팩터링으로 `lib/` 내부를 역할별 경계로 나눴습니다. 현재 기준 핵심 축은 `lib/client/*`(클라이언트 데이터 접근), `lib/config/*`(공개/서버 설정), `lib/domain/*`(공통 정책), `lib/server/*`(서버 유스케이스), `lib/qa/runtime.ts`(QA adapter), `lib/logging.ts`(공통 로깅) 입니다.

## 주요 흐름

### 인증과 프로필

- 클라이언트는 Firebase Auth 로 로그인합니다.
- 서버 API 는 `Authorization: Bearer <id-token>` 을 받아 `lib/server-auth.ts` 에서 검증합니다.
- 운영 환경에서는 `ALLOWED_EMAILS` allowlist 가 비어 있으면 fail-closed 입니다.
- 역할 선택과 프로필 설정은 `/api/profile/*` 경로에서 처리합니다.
- 프로필 role 변경과 알림 설정 저장은 `lib/server/profile/profile-use-cases.ts` 로 추출돼 있고, 라우트는 입력 검증과 HTTP 응답만 담당합니다.
- 클라이언트 세션/프로필 읽기와 역할 저장은 `context/UserContext.tsx` 에 직접 남기지 않고 `lib/client/profile-session.ts` 로 위임합니다.
- `ALLOW_ROLE_REASSIGN`, Upstash 설정 같은 서버 옵션은 `lib/config/server-env.ts` 를 통해서만 읽습니다.

### 식사 기록

- 클라이언트 식사 읽기/검색/정렬/주간 통계는 `lib/client/meals.ts` 가 담당합니다.
- 식사 생성/수정/삭제는 `/api/meals` 와 `/api/meals/[id]` 에서 처리합니다.
- 서버 측 직렬화와 필드 보정은 `lib/server/meals/*` 가 담당하고, 라우트는 필요한 모듈을 직접 import 합니다.
- 댓글은 `meals/{mealId}/comments` 서브컬렉션에 저장됩니다.

### 댓글과 반응

- Meal 상세 UI 는 `components/MealCard.tsx` 에서 조합합니다.
- 댓글 상태 orchestration 은 `lib/features/comments/ui/useMealCommentsController.ts` 로 분리돼 있고, 실시간 목록 캐시는 `lib/meal-comments-store.ts` 가 담당합니다.
- 반응 상태 orchestration 은 `lib/features/reactions/ui/useMealReactionsController.ts` 로 분리돼 있습니다.
- 댓글 클라이언트 호출은 `lib/client/comments.ts`, 반응 클라이언트 호출은 `lib/client/reactions.ts` 로 분리했습니다.
- 알림 activity 문서는 서버에서 계속 기록하지만, 현재 클라이언트는 피드 UI 를 두지 않고 `lib/client/activity.ts` 를 통해 알림 설정 저장만 수행합니다.
- 댓글 생성/수정/삭제의 서버 트랜잭션 로직은 `lib/server/comments/comment-use-cases.ts` 로 추출했고, API 라우트는 얇은 컨트롤러 역할만 수행합니다.
- 반응 변경의 서버 트랜잭션과 activity 동기화는 `lib/server/reactions/reaction-use-cases.ts` 로 추출했고, payload/route param 검증은 `lib/server/reactions/reaction-policy.ts` 가 맡습니다.
- 댓글/반응 변경은 모두 전용 API 라우트로 보냅니다.

### 홈과 아카이브

- 홈 화면은 `useSelectedDate`, `useMealsForDate`, `useWeeklyStats` 훅으로 날짜/식사/주간 통계를 분리합니다.
- 아카이브 화면은 `/api/archive` 를 통해 인증된 서버 조회를 사용하고, 참가자 권한을 서버에서 다시 확인한 뒤 지연된 검색 입력과 seek cursor 기반 페이지네이션으로 기록을 불러옵니다.
- QA fixture 접근은 페이지/컨텍스트에서 직접 하지 않고 `lib/qa/runtime.ts` adapter 를 통해서만 수행합니다.

### QA / 운영 제어

- `proxy.ts` 가 `/qa/*` 라우트를 제어합니다.
- 개발 환경에서는 QA 라우트가 열려 있습니다.
- 운영 환경에서는 `lib/config/public-env.ts` 와 `lib/config/server-env.ts` 를 통해 읽은 QA 플래그/토큰이 함께 만족될 때만 접근 가능합니다.

### PWA / 업데이트

- PWA 는 `lib/config/public-env.ts` 의 `enablePwa` 가 켜져 있을 때만 `next-pwa` 로 활성화됩니다.
- `components/AppUpdateBanner.tsx` 가 서비스 워커 업데이트를 감시합니다.
- PWA 가 비활성화된 환경에서는 레이아웃에서 기존 service worker 와 캐시를 정리합니다.

### 업로드

- 식사 이미지 업로드는 `/api/uploads/meal-image` 에서 인증 후 처리합니다.
- data URI 파싱, 파일 경로 생성, Storage 저장은 `lib/server/uploads/meal-image-use-cases.ts` 로 분리돼 있습니다.
- 라우트는 버킷 설정 확인과 HTTP 에러 변환만 맡습니다.

## 디렉터리 책임

- `app/`: 페이지와 서버 API
- `components/`: UI 조립과 표현 컴포넌트
- `components/comments/`, `components/meal-detail/`: 세부 UI 조각
- `components/hooks/`: 페이지 로컬 UI 상태 훅
- `context/`: 사용자 컨텍스트
- `lib/client/`: 클라이언트 데이터 접근과 API 호출
- `lib/config/`: 공개/서버 환경변수 접근
- `lib/domain/`: 공통 정책과 상수
- `lib/server/`: 서버 유스케이스와 라우트 보조 로직
- `lib/features/`: 화면별 상태 orchestration 훅
- `lib/qa/`: QA 모드, fixture, session, runtime adapter
- `lib/`: Firebase 초기화, 타입, 공통 유틸, 로깅, PWA cache helper
- `scripts/`: 스모크 테스트, 마이그레이션, 보조 도구
- `tests/`: 구조 회귀 테스트, API 보안 테스트, Firestore Rules 테스트, E2E

## 경계 규칙

- `app/`, `components/`, `context/`, `lib/features/*` 는 `console.*` 를 직접 호출하지 않고 `lib/logging.ts` 를 사용합니다.
- 삭제된 호환 경로(`@/lib/data`, `@/lib/server-meals`, `@/lib/client/http`, `@/lib/env`, `@/lib/qa`) 재도입을 금지하고, 실제 모듈을 직접 import 합니다.
- 공개 런타임 설정은 `lib/config/public-env.ts`, 서버 전용 설정은 `lib/config/server-env.ts` 를 통해서만 읽습니다.

## 검증 전략

- `tests/ui-theme.test.mjs`: UI 구조/회귀를 소스 문자열 기준으로 고정
- `tests/api-security.test.mjs`: API 보안/서버 경계 회귀를 고정
- `tests/firestore.rules.test.mjs`: Firestore Rules 검증
- `tests/e2e/*`: 브라우저 플로우 검증

## 현재 주의 지점

- 식사 삭제/수정은 `ownerUid` 기반으로만 허용되며, 레거시 meal 문서는 백필 전까지 변경이 차단됩니다.
- 아카이브 검색은 서버에서 제한된 배치 scan 으로 필터링하며, 스캔 한계에 걸리면 다음 페이지로 이어서 탐색합니다.
- PWA 관련 생성물은 빌드 환경과 플래그에 따라 public 자산이 바뀔 수 있습니다.
