# Family Meal Tracker

가족 식사를 기록하고 검색하는 Next.js + Firebase 앱입니다.

## 주요 기능
- 식사 기록 추가/수정/삭제
- 식사 검색 및 주간 통계
- 댓글 작성/수정/삭제
- 댓글 실시간 구독(카드 펼침 시에만 구독)

## 개발 실행
```bash
npm install
npm run dev
```

## 품질 확인
```bash
npm run typecheck
npm run lint
```

## Firestore Rules 테스트
아래 명령은 Firestore Emulator를 자동 실행한 뒤 규칙 테스트를 수행합니다.

```bash
npm run test:rules
```

## 레거시 댓글 마이그레이션
기존 `meals.comments` 배열을 `meals/{mealId}/comments` 서브컬렉션으로 이전합니다.

사전 준비:
- GCP/Firebase 인증(ADC 또는 서비스 계정)
- 필요 시 `FIREBASE_PROJECT_ID` 환경변수 설정

드라이런:
```bash
npm run migrate:comments:dry
```

실행:
```bash
npm run migrate:comments
```

## Firestore Rules 배포
```bash
npx firebase-tools deploy --only firestore:rules --project <PROJECT_ID>
```

## Meals 스키마 보정 마이그레이션
기존 `meals` 문서의 누락 필드(`userIds`, `userId`, `keywords`, `commentCount`, `timestamp`)를 보정합니다.

드라이런:
```bash
npm run migrate:meals:dry
```

실행:
```bash
npm run migrate:meals
```
