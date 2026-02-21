import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = `familymeal-rules-${Date.now()}`;

let testEnv;

const OWNER_UID = 'owner-uid';
const MOM_UID = 'mom-uid';
const OUTSIDER_UID = 'outsider-uid';
const MEAL_ID = 'meal-1';
const COMMENT_ID = 'comment-1';

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users', OWNER_UID), {
      uid: OWNER_UID,
      role: '아빠',
      displayName: 'Owner',
      email: 'owner@test.com',
    });

    await setDoc(doc(db, 'users', MOM_UID), {
      uid: MOM_UID,
      role: '엄마',
      displayName: 'Mom',
      email: 'mom@test.com',
    });

    await setDoc(doc(db, 'users', OUTSIDER_UID), {
      uid: OUTSIDER_UID,
      role: '아들',
      displayName: 'Outsider',
      email: 'outsider@test.com',
    });

    await setDoc(doc(db, 'meals', MEAL_ID), {
      ownerUid: OWNER_UID,
      userIds: ['아빠', '엄마'],
      description: '저녁 식사',
      type: '저녁',
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 1,
    });

    await setDoc(doc(db, 'meals', MEAL_ID, 'comments', COMMENT_ID), {
      author: '아빠',
      authorUid: OWNER_UID,
      text: '맛있었어요',
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    });
  });
});

test('owner can create meal, mismatched ownerUid is denied', async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();

  await assertSucceeds(
    setDoc(doc(ownerDb, 'meals', 'new-meal-ok'), {
      ownerUid: OWNER_UID,
      userIds: ['아빠'],
      description: '아침 먹음',
      type: '아침',
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );

  await assertFails(
    setDoc(doc(ownerDb, 'meals', 'new-meal-bad'), {
      ownerUid: MOM_UID,
      userIds: ['아빠'],
      description: '권한 없는 생성',
      type: '점심',
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );
});

test('non-owner cannot edit meal body, family member can update commentCount only', async () => {
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();

  await assertFails(
    updateDoc(doc(momDb, 'meals', MEAL_ID), {
      description: '권한 없는 수정',
    })
  );

  await assertSucceeds(
    updateDoc(doc(momDb, 'meals', MEAL_ID), {
      commentCount: 2,
    })
  );

  await assertSucceeds(
    updateDoc(doc(outsiderDb, 'meals', MEAL_ID), {
      commentCount: 3,
    })
  );
});

test('family member with profile can read non-participant meal', async () => {
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
  await assertSucceeds(getDoc(doc(outsiderDb, 'meals', MEAL_ID)));
});

test('authenticated user without profile cannot read meal', async () => {
  const unknownDb = testEnv.authenticatedContext('unknown-uid').firestore();
  await assertFails(getDoc(doc(unknownDb, 'meals', MEAL_ID)));
});

test('comment author can update own comment, non-author cannot', async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();

  await assertSucceeds(
    updateDoc(doc(ownerDb, 'meals', MEAL_ID, 'comments', COMMENT_ID), {
      text: '수정된 댓글',
      updatedAt: Timestamp.fromMillis(Date.now() + 1000),
      author: '아빠',
      authorUid: OWNER_UID,
      createdAt: Timestamp.fromMillis(Date.now()),
    })
  );

  await assertFails(
    updateDoc(doc(momDb, 'meals', MEAL_ID, 'comments', COMMENT_ID), {
      text: '엄마가 남의 댓글 수정',
      updatedAt: Timestamp.fromMillis(Date.now() + 2000),
      author: '아빠',
      authorUid: OWNER_UID,
      createdAt: Timestamp.fromMillis(Date.now()),
    })
  );
});

test('family member can create comment with own role/uid only', async () => {
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();

  await assertSucceeds(
    setDoc(doc(outsiderDb, 'meals', MEAL_ID, 'comments', 'outsider-comment-ok'), {
      author: '아들',
      authorUid: OUTSIDER_UID,
      text: '좋았어요',
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    })
  );

  await assertFails(
    setDoc(doc(outsiderDb, 'meals', MEAL_ID, 'comments', 'outsider-comment-bad'), {
      author: '아빠',
      authorUid: OWNER_UID,
      text: '사칭 댓글',
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    })
  );
});

test('user profile create requires auth email match', async () => {
  const uid = 'new-user-uid';
  const userDb = testEnv.authenticatedContext(uid, { email: 'new@test.com' }).firestore();

  await assertSucceeds(
    setDoc(doc(userDb, 'users', uid), {
      uid,
      email: 'new@test.com',
      displayName: 'New User',
      role: null,
    })
  );

  await assertFails(
    setDoc(doc(userDb, 'users', `${uid}-bad`), {
      uid: `${uid}-bad`,
      email: 'other@test.com',
      displayName: 'Bad User',
      role: null,
    })
  );
});

test('user profile cannot change persisted email', async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: 'owner@test.com' }).firestore();

  await assertSucceeds(
    updateDoc(doc(ownerDb, 'users', OWNER_UID), {
      displayName: 'Owner Updated',
    })
  );

  await assertFails(
    updateDoc(doc(ownerDb, 'users', OWNER_UID), {
      email: 'attacker@test.com',
    })
  );
});
