# Family Meal Tracker

가족 식사 사진, 댓글, 반응, 활동 알림을 기록하는 Next.js 16 + Firebase 기반 웹앱입니다.

## 현재 상태

- App Router 기반 클라이언트/서버 혼합 구조
- Firebase Auth + Firestore + Storage 사용
- 댓글/반응/프로필 설정은 서버 API 경유
- 홈 화면은 주간 저널 중심 UI, 아카이브는 서버 API 기반 검색/필터/페이지네이션 UI
- QA 전용 라우트는 운영 환경에서 토큰으로 차단
- PWA 는 `NEXT_PUBLIC_ENABLE_PWA=true` 일 때만 활성화

## 기술 스택

- Frontend: Next.js 16, React 19, TypeScript
- UI: Lucide React, React Calendar
- Backend: Firebase Client SDK, Firebase Admin SDK
- Validation: Zod
- Optional infra: Upstash Redis rate limit
- Verification: Node test runner, Firestore Rules emulator, Playwright

## 빠른 시작

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.

## 주요 명령어

```bash
npm run dev
npm run build
npm run build:clean
npm run start
npm run lint
npm run typecheck
npm run test:ui
npm run test:api
npm run test:rules
npm run test:e2e
npm run test:smoke
npm run test:smoke:qa-token-required
npm run ci:verify
```

### 마이그레이션

```bash
npm run migrate:comments:dry
npm run migrate:comments
npm run migrate:meals:dry
npm run migrate:meals
npm run migrate:owners:dry
npm run migrate:owners
```

## 환경 변수

필수 공개 환경 변수:

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth 도메인 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage 버킷 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |

선택 공개 환경 변수:

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_ENABLE_PWA` | `true` 면 PWA/service worker 활성화 |
| `NEXT_PUBLIC_ENABLE_QA` | 운영 환경에서 QA 라우트 허용 여부 |
| `NEXT_PUBLIC_APP_VERSION` | `/api/version` fallback 버전 문자열 |

필수 서버 환경 변수:

| 이름 | 설명 |
| --- | --- |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin 프로젝트 ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin 클라이언트 이메일 |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin 개인키 |
| `ALLOWED_EMAILS` | 서버 allowlist 이메일 목록 |

선택 서버 환경 변수:

| 이름 | 설명 |
| --- | --- |
| `ALLOW_ROLE_REASSIGN` | 역할 재지정 허용 여부 |
| `QA_ROUTE_TOKEN` | 운영 QA 라우트 접근 토큰 |
| `UPSTASH_REDIS_REST_URL` | `/api/client-errors` 분산 rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | `/api/client-errors` 분산 rate limit |
| `SMOKE_HOST` | 스모크 테스트 호스트 |
| `SMOKE_PORT` | 스모크 테스트 포트 |
| `SMOKE_ENV_PATH` | meal mutation smoke test 에서 읽을 env 파일 경로 |
| `SMOKE_INCLUDE_QA` | 스모크 테스트에 QA 라우트 포함 |
| `SMOKE_ASSERT_QA_BLOCKED` | QA 차단 상태를 검증할 때 사용 |
| `AUDIT_ALLOWLIST_FILE` | 보안 감사 예외 파일 경로 |

## 폴더 구조

```text
app/
  api/                서버 API 라우트
  add|archive|edit/   주요 페이지
  meals/[id]/         식사 상세 화면
  qa/                 QA 확인용 라우트
components/
  comments/           댓글 UI
  hooks/              페이지 로컬 UI 훅 (예: 날짜 선택)
  meal-detail/        식사 상세 표시 조각
context/              사용자 컨텍스트
lib/                  데이터 접근, 서버 유틸, 공통 타입
public/               아이콘, 로고, manifest 같은 커밋 대상 정적 자산
scripts/              스모크 테스트/마이그레이션/보조 스크립트
tests/                소스 구조 회귀 테스트와 Firestore rules 테스트
docs/                 설계/계획 문서와 아키텍처 문서
```

## 아키텍처 문서

- [docs/architecture.md](./docs/architecture.md)
- [SECURITY_DEPENDENCIES.md](./SECURITY_DEPENDENCIES.md)

## 운영 메모

- QA 라우트는 개발 환경에서는 열려 있고, 운영 환경에서는 `NEXT_PUBLIC_ENABLE_QA=true` 와 `QA_ROUTE_TOKEN` 이 모두 필요합니다.
- PWA 가 꺼져 있으면 레이아웃에서 기존 service worker 와 캐시를 정리합니다.
- PWA service worker (`public/sw.js`) 는 빌드 시 생성되는 산출물이며 저장소에는 추적하지 않습니다.
- 클라이언트 오류 수집 엔드포인트 `/api/client-errors` 는 Upstash 가 없으면 메모리 rate limit 으로 동작합니다.

## 검증

기본 검증 순서:

```bash
npm run test:api
npm run test:ui
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```
