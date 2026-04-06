# Family Meal Tracker Architecture

## 개요

이 프로젝트는 Next.js App Router 와 Firebase 를 조합한 단일 저장소 애플리케이션입니다.  
읽기 중심 UI 는 클라이언트 Firebase SDK 와 서버 API 를 함께 사용하고, 쓰기·권한·업로드처럼 보안 민감한 작업은 Route Handler 를 통해 서버에서 처리합니다.

현재 활성 구조의 중심은 `lib/modules/*` 와 `lib/platform/*` 입니다.

- `lib/modules/*`: 도메인별 application, ui, infrastructure, server, adapters, domain
- `lib/platform/*`: 공통 auth/http/error 유틸
- `lib/client/*`: 클라이언트 읽기와 API 호출 helper
- `lib/config/*`: 공개/서버 환경 변수 접근
- `lib/domain/*`: 공통 정책과 상수
- `lib/qa/*`: QA fixture, session, runtime adapter

예전 `lib/features/*`, `lib/server/*`, 루트 compat entrypoint 는 제거됐습니다. 루트 `lib/*.ts` 는 Firebase 초기화, 공통 타입, 공용 유틸만 남깁니다.

## 주요 흐름

### 인증과 프로필

- 서버 API 는 `Authorization: Bearer <id-token>` 을 받아 `lib/platform/auth/server-auth.ts` 에서 검증합니다.
- Route 수준 인증/역할 조회는 `lib/platform/auth/route-auth.ts` 가 담당합니다.
- 프로필 서버 로직은 `lib/modules/profile/server/*` 에 있고, Firebase Admin 접근은 `lib/modules/profile/adapters/firebase/*` 로 격리됩니다.
- `context/UserContext.tsx` 는 직접 I/O 를 수행하지 않고 `lib/modules/profile/application/user-session-service.ts` 와 `lib/modules/profile/infrastructure/user-session-runtime.ts` 를 통해 세션/알림 설정 흐름을 위임합니다.
- 서버 옵션(`ALLOWED_EMAILS`, `ALLOW_ROLE_REASSIGN`, `QA_ROUTE_TOKEN`, Upstash 설정)은 `lib/config/server-env.ts` 를 통해서만 읽습니다.

### 식사 읽기와 편집

- 홈/아카이브/상세 화면의 읽기 orchestration 은 `lib/modules/meals/application/meal-read-service.ts` 와 `lib/modules/meals/ui/*` 가 담당합니다.
- QA/운영 런타임 전환은 `lib/modules/meals/infrastructure/*` 에서 처리합니다.
- 서버 식사 로직은 `lib/modules/meals/server/*` 에 있고, 라우트는 여기서 필요한 유스케이스만 직접 import 합니다.
- 식사 생성/수정/삭제는 `/api/meals`, `/api/meals/[id]` 로 통일돼 있으며, 레거시 문서는 `ownerUid` 백필 전까지 fail-closed 로 막습니다.

### 댓글, 반응, 활동 로그

- 댓글 UI 상태는 `lib/modules/comments/ui/useMealCommentsController.ts` 가, 반응 UI 상태는 `lib/modules/reactions/ui/useMealReactionsController.ts` 가 담당합니다.
- 실시간 구독과 API 호출은 `lib/modules/comments/infrastructure/comment-runtime.ts`, `lib/modules/reactions/infrastructure/reaction-runtime.ts` 를 통해 QA/운영 구현을 고릅니다.
- 댓글/반응 서버 로직은 각각 `lib/modules/comments/server/*`, `lib/modules/reactions/server/*` 에 있고, Firestore write 는 module-local adapter 로 분리돼 있습니다.
- 활동 로그 기록은 `lib/modules/activity/server/activity-log.ts` 가 조립하고, 실제 Firestore 기록은 `lib/modules/activity/adapters/firestore/activity-admin-store.ts` 가 담당합니다.
- 클라이언트에는 activity feed UI 가 없고, 알림 설정 변경만 `lib/modules/profile/adapters/http/profile-notification-client.ts` 를 통해 처리합니다.

### 아카이브와 검색

- 아카이브는 `/api/archive` 를 통해 인증된 서버 조회를 사용합니다.
- 검색 입력은 `useDeferredValue` 로 지연시키고, 서버는 seek cursor 기반 페이지네이션과 제한된 batch scan 으로 결과를 반환합니다.
- 부분 결과일 때는 `isPartial` 플래그를 내려 UI 가 후속 페이지 로딩을 유도합니다.

### 업로드

- 식사 이미지 업로드는 `/api/uploads/meal-image` 에서 인증 후 처리합니다.
- 클라이언트는 원본 `File` 을 multipart form-data 로 전송하고, add/edit 페이지는 공통 이미지 선택 훅을 공유합니다.
- 업로드 정규화, 경로 생성, Storage 저장은 `lib/modules/meals/adapters/storage/meal-image-upload.ts` 가 맡습니다.
- 서버는 `sharp` 로 EXIF 회전 보정, 리사이즈, JPEG 재인코딩 후 저장하며, 사용자 소유 `meals/<uid>/...` 경로만 허용합니다.

### QA / 운영 제어

- `proxy.ts` 가 `/qa/*` 라우트를 제어합니다.
- 개발 환경에서는 QA 라우트가 열려 있고, 운영 환경에서는 `NEXT_PUBLIC_ENABLE_QA=true` 와 `QA_ROUTE_TOKEN` 이 모두 필요합니다.
- 각 모듈 런타임은 `lib/qa/adapters/*` 를 통해 QA fixture 를 읽고, 앱/모듈이 `lib/qa/runtime.ts` 나 fixture 내부 구현을 직접 참조하지 않습니다.

### PWA / 업데이트

- PWA 활성 여부는 `lib/config/public-env.ts` 의 `enablePwa` 로 제어합니다.
- `next.config.ts` 는 `@ducanh2912/next-pwa` 로 service worker 생성을 설정합니다.
- 레이아웃은 PWA 비활성 환경에서 기존 service worker 와 cache 를 정리하고, 활성 환경에서는 `AppUpdateBanner` 로 업데이트를 감시합니다.
- `next.config.ts` 의 `turbopack: {}` 설정으로 Next 16 기본 Turbopack 경로와 `next-pwa` 구성을 함께 사용합니다.

## 디렉터리 책임

- `app/`: 페이지와 Route Handler
- `components/`: UI 조립과 표현 컴포넌트
- `context/`: 사용자 컨텍스트
- `lib/client/`: 클라이언트 읽기/API 호출 helper
- `lib/config/`: 공개/서버 환경 변수
- `lib/domain/`: 공통 정책, 상수, validation helper
- `lib/modules/`: 도메인별 애플리케이션 코드
- `lib/platform/`: 공통 auth/http/error 계약
- `lib/qa/`: QA fixture, session, runtime adapter
- `lib/`: Firebase 초기화, 타입, 공통 유틸
- `scripts/`: 스모크 테스트, 마이그레이션, 보조 도구
- `tests/`: 구조 회귀, API 보안, 런타임, Firestore Rules, E2E

## 경계 규칙

- `app/`, `components/`, `context/` 는 `@/lib/firebase-admin` 을 직접 import 하지 않습니다.
- UI 계층은 `@/lib/client/*` 를 직접 호출하지 않고 module-local application/ui entrypoint 를 사용합니다.
- `@/lib/features/*` 와 `@/lib/server/*` 는 제거된 레거시 경로이며, ESLint 로 재도입을 막습니다.
- 공개 런타임 설정은 `lib/config/public-env.ts`, 서버 전용 설정은 `lib/config/server-env.ts` 를 통해서만 읽습니다.
- `lib/modules/*` 는 `lib/qa/adapters/*` 와 필요한 focused client adapter 만 의존하고, QA 내부 구현 세부사항을 직접 참조하지 않습니다.
- 서버 에러 응답은 `lib/platform/http/route-errors.ts` 와 `lib/platform/errors/error-contract.ts` 를 통해 `{ code, message }` 형태로 정규화합니다.
- `app/`, `components/`, `context/`, `lib/modules/*` 는 `console.*` 대신 `lib/logging.ts` 를 사용합니다.

## 검증 전략

- `tests/ui-theme.test.mjs`: UI 구조와 주요 회귀를 소스 문자열 기준으로 고정
- `tests/api-security.test.mjs`: API 보안/경계 회귀를 고정
- `tests/architecture-boundaries.test.mjs`: ESLint 규칙, 모듈 경계, 레거시 경로 제거 상태를 고정
- `tests/*runtime*.mts`: 런타임 동작 검증
- `tests/firestore.rules.test.mjs`: Firestore Rules 검증
- `tests/e2e/*`: 브라우저 플로우 검증
- `scripts/smoke-*.mjs`: 로컬/배포 smoke 검증

## 현재 주의 지점

- Turbopack 경로는 `next.config.ts` 의 `turbopack: {}` 전제로 검증됐지만, `next-pwa` 를 제거하거나 커스텀 캐싱 전략을 바꾸는 작업은 별도 회귀 검증이 필요합니다.
- 식사 삭제/수정은 `ownerUid` 기준으로만 허용되고, 레거시 문서는 마이그레이션 전까지 차단됩니다.
- 아카이브 검색은 서버에서 제한된 batch scan 으로 동작하므로 넓은 검색에서는 `isPartial` 결과가 발생할 수 있습니다.
- 새 코드는 항상 module-local 또는 platform 경로를 직접 import 해야 하며, 제거된 compat entrypoint 를 재도입하지 않습니다.
