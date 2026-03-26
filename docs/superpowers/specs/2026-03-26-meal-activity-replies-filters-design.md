# Meal Activity, Replies, And Filters Design

**Date:** 2026-03-26

## Goal

기존 식사 기록 앱에 활동 요약, 댓글 답글/멘션, 공통 UI 컴포넌트, Firestore rules 보강, 고급 검색 필터를 추가해 기능성과 운영 안정성을 함께 높인다.

## Decisions

- 답글은 1단계 스레드만 지원한다.
- 멘션은 자유 텍스트 파싱이 아니라 답글 대상 자동 멘션으로 제한한다.
- 활동 알림은 별도 알림 컬렉션 대신 홈 화면의 활동 요약과 최근 상호작용 집계로 제공한다.
- 검색은 서버 검색 결과에 클라이언트 필터를 조합하는 방식으로 구현한다.

## Data Model

### MealComment

- `parentId?: string`
- `mentionedAuthor?: UserRole`

답글은 같은 `comments` 서브컬렉션에 저장하고 `parentId`로만 연결한다.

### Activity Summary

홈 화면에서 선택 날짜 기준으로 다음 값을 계산한다.

- 식사 수
- 댓글/답글 수
- 반응 수
- 내가 작성한 기록에 다른 가족이 남긴 상호작용 수

## API Changes

### Comment Create

- `POST /api/meals/[id]/comments`
- 요청 본문:
  - `text: string`
  - `parentId?: string`
- 동작:
  - `parentId`가 있으면 부모 댓글 존재 확인
  - 부모 작성자 역할을 `mentionedAuthor`로 저장
  - 생성 응답에 `parentId`, `mentionedAuthor`, `reactions` 포함

### Comment Delete

- 부모 댓글에 답글이 있으면 삭제를 거부한다.
- 메시지: `Reply comments exist`

## UI Changes

### Home

- 활동 요약 카드 섹션 추가
- 최근 상호작용 수를 강조하는 작은 알림형 카드 추가
- 검색 필터:
  - 식사 종류
  - 참여자
  - 정렬(최신순, 댓글순, 반응순)

### Comments

- 댓글 액션에 `답글` 버튼 추가
- 입력창 위에 현재 답글 대상 표시
- 답글은 부모 댓글 아래로 들여쓰기해 렌더링
- 자동 멘션 라벨: `엄마님께 답글`

### Shared UI

- `PageHeader`
- `SurfaceSection`
- `FilterChips`

## Rules Hardening

- `meals.reactions` 필드는 client write에서 비어 있거나 누락된 상태만 허용한다.
- 댓글 읽기 문서 구조에 `parentId`, `mentionedAuthor`, `reactions`를 허용한다.
- 반응 필드가 있어도 클라이언트가 직접 수정하는 것은 계속 금지한다.

## Testing

- E2E:
  - QA mock mode에서 답글 작성
  - 홈 검색 필터 적용
  - 활동 요약 노출
- Rules:
  - 클라이언트가 비어 있지 않은 `reactions`를 포함해 식사 생성 시 거부
- Static:
  - 답글 API 필드와 삭제 가드 존재 확인
