# Runtime Recovery, Feed, Notifications, And Comment Refactor Design

**Date:** 2026-03-26

## Goal

남은 개선 항목인 Firestore rules 실행 환경 복구, 댓글 UI 분리, 활동 피드, 더 풍부한 검색 필터, 브라우저 상호작용 알림, CSS 모듈화를 한 번에 정리한다.

## Decisions

- Java는 시스템 전역 설치 대신 사용자 홈 아래의 로컬 JRE로 복구한다.
- 활동 피드는 별도 컬렉션 없이 현재 홈 데이터와 댓글 데이터를 조합해 계산형으로 제공한다.
- 알림은 서비스 워커/푸시 서버 없이 브라우저 Notification API 기반의 세션 내 상호작용 알림으로 구현한다.
- 댓글 UI는 `CommentItem`, `CommentThread`, `CommentComposer`로 분리한다.
- CSS는 `globals.css`에 토큰과 imports만 남기고 나머지는 도메인별 파일로 분할한다.

## UI

### Activity Feed

- 홈 화면 요약 카드 아래에 최근 상호작용 리스트 추가
- 항목 종류:
  - 내 기록에 달린 댓글
  - 내 댓글에 달린 답글
  - 내 기록/댓글에 달린 반응
- 각 항목은 작성자, 행동, 시간, 대상 텍스트 일부를 보여준다

### Search

- 기존 필터 유지
- 추가 필터:
  - `내 기록만`
  - `상호작용 있는 기록만`
  - `댓글 2개 이상`

### Notifications

- `Notification.permission === granted` 상태에서 활동 카운트가 증가하면 브라우저 알림 표시
- 같은 세션에서 중복 알림을 피하기 위해 마지막 알림 키를 기억

## Verification

- rules test가 실제로 돌아야 한다
- 기존 E2E + 새 피드/필터 시나리오 유지
