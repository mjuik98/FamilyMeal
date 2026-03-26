# Meal Reactions And UI Consistency Design

**Date:** 2026-03-26

## Goal

게시글과 댓글에 이모지 반응을 추가하고, 홈/작성/수정/프로필/식사 카드 전반의 UI 패턴을 하나의 시각 시스템으로 정리한다.

## Context

- 현재 앱은 `app/page.tsx`, `app/add/page.tsx`, `app/edit/[id]/page.tsx`, `app/profile/page.tsx`, `components/MealCard.tsx`에 인라인 스타일이 넓게 퍼져 있다.
- 댓글은 `meals/{mealId}/comments` 서브컬렉션으로 분리되어 있고, 식사 문서는 `commentCount`만 별도로 유지한다.
- 가족 단위의 소규모 사용자를 전제로 하므로 반응 수가 대규모로 폭증하는 구조는 아니다.

## Approaches

### Approach A: UI만 먼저 다듬고 반응은 나중에 추가

- 장점: 화면 정리에 집중할 수 있다.
- 단점: 사용자가 원한 상호작용 기능이 뒤로 밀린다.

### Approach B: 반응을 식사/댓글 문서 내부 맵으로 저장하고, 동시에 시각 시스템 정리

- 장점: 현재 구조와 가장 잘 맞고, API 추가 범위가 작다.
- 장점: 문서 한 번 읽을 때 반응 수를 같이 렌더링할 수 있다.
- 단점: 반응 종류가 크게 늘어나면 문서 크기 관리가 필요하다.

### Approach C: 반응을 별도 서브컬렉션으로 분리

- 장점: 확장성이 가장 좋다.
- 단점: 가족용 앱에 비해 과하고, 현재 코드베이스 복잡도를 크게 올린다.

## Decision

Approach B를 사용한다.

- 식사 문서와 댓글 문서에 `reactions` 맵을 둔다.
- 값은 `emoji -> uid[]` 구조로 저장한다.
- 서버 API에서 트랜잭션으로 현재 사용자 UID를 토글한다.
- 클라이언트는 공통 정규화 함수로 반응을 읽고, 공통 반응 바 컴포넌트로 렌더링한다.

## Data Model

### Meal

- `reactions?: Record<string, string[]>`

### MealComment

- `reactions?: Record<string, string[]>`

### Allowed Reaction Emojis

- `❤️`
- `👍`
- `😋`
- `👏`
- `🔥`

이 집합은 UI 일관성과 데이터 검증 단순화를 위해 고정한다.

## API Design

### Meal Reaction Toggle

- `POST /api/meals/[id]/reactions`
- 요청 본문: `{ emoji: string }`
- 동작:
  - 사용자 인증 확인
  - 이모지가 허용 집합인지 확인
  - `meals/{mealId}.reactions[emoji]`에서 현재 UID 존재 여부를 토글
  - 최신 반응 맵과 카운트를 응답

### Comment Reaction Toggle

- `POST /api/meals/[id]/comments/[commentId]/reactions`
- 요청 본문: `{ emoji: string }`
- 동작:
  - 사용자 인증 확인
  - 댓글 문서의 `reactions` 맵에서 현재 UID를 토글
  - 최신 반응 맵을 응답

## UI Design

### Visual Thesis

따뜻한 노트북처럼 기록이 차곡차곡 쌓이는 느낌의 올리브/크림 기반 인터페이스로 정리한다.

### Content Plan

- 홈: 오늘의 상태, 탐색, 기록 목록
- 카드: 식사 핵심 정보, 참여자, 반응, 댓글
- 작성/수정: 한 화면 안에서 사진, 메타 정보, 설명 입력
- 프로필: 계정 정보와 역할 상태를 차분하게 보여주는 설정 화면

### Interaction Thesis

- 카드와 섹션은 가벼운 리프트와 표면 대비로 계층을 만든다.
- 반응 칩은 눌렀을 때 즉시 활성/비활성 상태가 바뀌며 약한 스케일 피드백을 준다.
- 식사 카드 확장 영역은 댓글과 반응이 자연스럽게 이어지는 하나의 흐름처럼 보이게 한다.

## Component Changes

### Shared Styling

`app/globals.css`에 다음 공통 패턴을 추가한다.

- `page-shell`, `page-hero`, `page-title`, `page-subtitle`
- `surface-card`, `surface-section`, `surface-row`
- `chip-group`, `chip-button`, `chip-button-active`
- `primary-button`, `secondary-button`, `danger-button`
- `reaction-bar`, `reaction-chip`, `reaction-chip-active`
- `empty-state`, `search-shell`, `stat-shell`

### Reaction UI

- 식사 카드 본문 아래에 반응 바 배치
- 댓글 아이템 본문 아래에도 더 작은 반응 바 배치
- 각 반응 칩은 이모지와 개수를 같이 표시
- 현재 사용자가 누른 반응은 강조
- 필요 시 `+` 버튼으로 전체 반응 후보를 펼친다

### Home Consistency

- 인라인 스타일 비중을 줄이고 공통 클래스 기반으로 재구성
- 날짜 요약 카드, 주간 통계, 검색, 빈 상태, 목록 헤더 톤을 통일

### Form Consistency

- 작성/수정 페이지를 공통 폼 셸 패턴으로 정리
- 타입/참여자 선택을 동일한 칩 컴포넌트 스타일로 통일
- 프로필의 역할 선택도 같은 시각 언어 사용

## QA / Mock Mode

- QA mock mode에서 인증 없이 식사/댓글 반응 토글이 로컬 상태로 동작해야 한다.
- QA meal card 샘플 데이터에도 기본 반응을 추가한다.

## Testing

- Playwright:
  - QA mock mode에서 식사 반응 토글
  - QA mock mode에서 댓글 반응 토글
  - 반응 카운트와 활성 상태 확인
- Node tests:
  - 공통 UI 클래스 사용 여부
  - 반응 API/클라이언트 경로 존재 여부
  - 허용 이모지 검증 로직 존재 여부

## Risks

- Firestore 문서의 배열 업데이트는 중복/경합에 취약할 수 있으므로 서버 트랜잭션으로만 수정한다.
- 홈/폼 화면 스타일 정리는 범위가 넓으므로 기존 `data-testid`와 핵심 UX는 유지한다.
