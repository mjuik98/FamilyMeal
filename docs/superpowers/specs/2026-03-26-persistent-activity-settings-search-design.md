# Persistent Activity, Settings, And Search Design

**Date:** 2026-03-26

## Goal

활동 피드를 계산형에서 영속 로그 기반으로 전환하고, 읽음 처리와 알림 설정을 붙여 홈/프로필/서버 데이터 흐름을 운영 가능한 수준으로 정리한다.

## Decisions

- 활동 로그는 `users/{uid}/activity/{activityId}` 하위 컬렉션에 저장한다.
- 댓글/답글/반응 API가 성공적으로 변경을 반영할 때 동시에 활동 문서를 생성하거나 제거한다.
- 홈 화면은 영속 활동 컬렉션을 구독해 피드와 미확인 개수를 실시간으로 그린다.
- `commentsByMeal`는 단발 조회 대신 meal별 댓글 subscription 묶음으로 유지해 홈 요약/필터와 카드 상태를 더 가깝게 맞춘다.
- 알림 설정은 `users/{uid}` 문서의 `notificationPreferences` 필드로 저장한다.
- 브라우저 알림은 저장된 설정과 `Notification.permission` 둘 다 충족할 때만 세션 내에서 발생시킨다.
- 웹 푸시/서비스 워커 기반 서버 푸시는 VAPID 키와 배포 설정이 없는 환경이므로 이번 라운드에서는 제외하고, 추후 인프라 준비 후 확장한다.

## Data Model

### User Profile

- `notificationPreferences.browserEnabled`
- `notificationPreferences.commentAlerts`
- `notificationPreferences.reactionAlerts`
- `notificationPreferences.replyAlerts`

### Activity Document

- `type`: `meal-comment | comment-reply | meal-reaction | comment-reaction`
- `actorUid`, `actorRole`
- `mealId`
- `commentId?`
- `reactionEmoji?`
- `preview`
- `createdAt`
- `readAt?`

반응은 토글형이므로 추가 시 고정 id로 upsert, 제거 시 같은 id를 삭제한다. 댓글/답글은 append-only 문서로 남긴다.

## UI

### Home

- 활동 피드는 영속 activity subscription 기반으로 렌더링
- 미확인 개수는 `readAt == null` 개수로 계산
- `모두 읽음` 액션 추가
- 빠른 필터는 기존 누적형 유지
- 검색 확장은 최소 반응 수, 활동 많은 순 정렬, 실시간 댓글 수 반영

### Profile

- 알림 설정 섹션 추가
- 브라우저 알림 사용 상태와 활동 종류별 토글 제공
- QA 모드에서는 로컬 상태로 동작

## Verification

- 정적 회귀 테스트에 activity/settings/rules 경로가 잡혀야 한다
- E2E에서 QA 모드 unread badge, mark-all-read, profile settings 토글이 동작해야 한다
- `lint`, `typecheck`, `test:ui`, `test:api`, `build`, E2E, `test:rules` 모두 다시 통과해야 한다
