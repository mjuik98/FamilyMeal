import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

const PROJECT_ID = `familymeal-rules-${Date.now()}`;

const ROLE_DAD = "\uC544\uBE60";
const ROLE_MOM = "\uC5C4\uB9C8";
const ROLE_DAUGHTER = "\uB538";
const ROLE_SON = "\uC544\uB4E4";

const TYPE_BREAKFAST = "\uC544\uCE68";
const TYPE_LUNCH = "\uC810\uC2EC";
const TYPE_DINNER = "\uC800\uB141";
const TYPE_SNACK = "\uAC04\uC2DD";

let testEnv;

const OWNER_UID = "owner-uid";
const MOM_UID = "mom-uid";
const OUTSIDER_UID = "outsider-uid";
const MEAL_ID = "meal-1";
const COMMENT_ID = "comment-1";

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8"),
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

    await setDoc(doc(db, "users", OWNER_UID), {
      uid: OWNER_UID,
      role: ROLE_DAD,
      displayName: "Owner",
      email: "owner@test.com",
    });

    await setDoc(doc(db, "users", MOM_UID), {
      uid: MOM_UID,
      role: ROLE_MOM,
      displayName: "Mom",
      email: "mom@test.com",
    });

    await setDoc(doc(db, "users", OUTSIDER_UID), {
      uid: OUTSIDER_UID,
      role: ROLE_SON,
      displayName: "Outsider",
      email: "outsider@test.com",
    });

    await setDoc(doc(db, "meals", MEAL_ID), {
      ownerUid: OWNER_UID,
      userIds: [ROLE_DAD, ROLE_MOM],
      description: "\uC800\uB141 \uC2DD\uC0AC",
      type: TYPE_DINNER,
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 1,
    });

    await setDoc(doc(db, "meals", MEAL_ID, "comments", COMMENT_ID), {
      author: ROLE_DAD,
      authorUid: OWNER_UID,
      text: "\uB9DB\uC788\uC5C8\uC5B4\uC694",
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    });
  });
});

test("owner can create meal, mismatched ownerUid is denied", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();

  await assertSucceeds(
    setDoc(doc(ownerDb, "meals", "new-meal-ok"), {
      ownerUid: OWNER_UID,
      userIds: [ROLE_DAD],
      description: "\uC544\uCE68 \uBA39\uC74C",
      type: TYPE_BREAKFAST,
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );

  await assertFails(
    setDoc(doc(ownerDb, "meals", "new-meal-bad"), {
      ownerUid: MOM_UID,
      userIds: [ROLE_DAD],
      description: "\uAD8C\uD55C \uC5C6\uB294 \uC0DD\uC131",
      type: TYPE_LUNCH,
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );
});

test("non-owner cannot edit meal body or commentCount", async () => {
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();

  await assertFails(
    updateDoc(doc(momDb, "meals", MEAL_ID), {
      description: "\uAD8C\uD55C \uC5C6\uB294 \uC218\uC815",
    })
  );

  await assertFails(
    updateDoc(doc(momDb, "meals", MEAL_ID), {
      commentCount: 2,
    })
  );

  await assertFails(
    updateDoc(doc(outsiderDb, "meals", MEAL_ID), {
      commentCount: 3,
    })
  );

  await assertFails(
    updateDoc(doc(ownerDb, "meals", MEAL_ID), {
      commentCount: 4,
    })
  );
});

test("meal description longer than 300 chars is rejected", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const tooLongDescription = "a".repeat(301);

  await assertFails(
    setDoc(doc(ownerDb, "meals", "meal-too-long-description"), {
      ownerUid: OWNER_UID,
      userIds: [ROLE_DAD],
      description: tooLongDescription,
      type: TYPE_DINNER,
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );
});

test("meal with invalid imageUrl or excessive keywords is rejected", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const excessiveKeywords = Array.from({ length: 81 }, (_, idx) => `kw-${idx}`);

  await assertFails(
    setDoc(doc(ownerDb, "meals", "meal-invalid-image"), {
      ownerUid: OWNER_UID,
      userIds: [ROLE_DAD],
      description: "유효하지 않은 이미지 URL",
      type: TYPE_DINNER,
      imageUrl: "ftp://invalid.example.com/a.jpg",
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );

  await assertFails(
    setDoc(doc(ownerDb, "meals", "meal-too-many-keywords"), {
      ownerUid: OWNER_UID,
      userIds: [ROLE_DAD],
      description: "키워드 과다",
      type: TYPE_LUNCH,
      keywords: excessiveKeywords,
      timestamp: Timestamp.fromMillis(Date.now()),
      commentCount: 0,
    })
  );
});

test("meal participants can read meal", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();
  await assertSucceeds(getDoc(doc(ownerDb, "meals", MEAL_ID)));
  await assertSucceeds(getDoc(doc(momDb, "meals", MEAL_ID)));
});

test("non-participant with profile cannot read meal", async () => {
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
  await assertFails(getDoc(doc(outsiderDb, "meals", MEAL_ID)));
});

test("authenticated user without profile cannot read meal", async () => {
  const unknownDb = testEnv.authenticatedContext("unknown-uid").firestore();
  await assertFails(getDoc(doc(unknownDb, "meals", MEAL_ID)));
});

test("client comment updates are denied", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();

  await assertFails(
    updateDoc(doc(ownerDb, "meals", MEAL_ID, "comments", COMMENT_ID), {
      text: "\uC218\uC815\uB41C \uB313\uAE00",
      updatedAt: Timestamp.fromMillis(Date.now() + 1000),
      author: ROLE_DAD,
      authorUid: OWNER_UID,
      createdAt: Timestamp.fromMillis(Date.now()),
    })
  );

  await assertFails(
    updateDoc(doc(momDb, "meals", MEAL_ID, "comments", COMMENT_ID), {
      text: "\uC5C4\uB9C8\uAC00 \uC784\uC758 \uB313\uAE00 \uC218\uC815",
      updatedAt: Timestamp.fromMillis(Date.now() + 2000),
      author: ROLE_DAD,
      authorUid: OWNER_UID,
      createdAt: Timestamp.fromMillis(Date.now()),
    })
  );
});

test("client comment deletion is denied for both owner and non-owner", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "meals", MEAL_ID, "comments", "comment-by-mom"), {
      author: ROLE_MOM,
      authorUid: MOM_UID,
      text: "\uC5C4\uB9C8 \uB313\uAE00",
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    });
  });

  await assertFails(
    setDoc(doc(momDb, "meals", MEAL_ID, "comments", "comment-by-mom"), {
      author: ROLE_MOM,
      authorUid: MOM_UID,
      text: "\uC5C4\uB9C8 \uB313\uAE00",
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    })
  );

  await assertFails(
    deleteDoc(doc(outsiderDb, "meals", MEAL_ID, "comments", "comment-by-mom"))
  );

  await assertFails(
    deleteDoc(doc(ownerDb, "meals", MEAL_ID, "comments", "comment-by-mom"))
  );
});

test("client comment creation is denied", async () => {
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();

  await assertFails(
    setDoc(doc(outsiderDb, "meals", MEAL_ID, "comments", "outsider-comment-ok"), {
      author: ROLE_SON,
      authorUid: OUTSIDER_UID,
      text: "\uC88B\uC544\uC694",
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    })
  );

  await assertFails(
    setDoc(doc(outsiderDb, "meals", MEAL_ID, "comments", "outsider-comment-bad"), {
      author: ROLE_DAD,
      authorUid: OWNER_UID,
      text: "\uC0AC\uCE6D \uB313\uAE00",
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    })
  );
});

test("comment text longer than 500 chars is rejected", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const tooLongComment = "x".repeat(501);

  await assertFails(
    setDoc(doc(ownerDb, "meals", MEAL_ID, "comments", "comment-too-long"), {
      author: ROLE_DAD,
      authorUid: OWNER_UID,
      text: tooLongComment,
      createdAt: Timestamp.fromMillis(Date.now()),
      updatedAt: Timestamp.fromMillis(Date.now()),
    })
  );
});

test("user profile create requires auth email match", async () => {
  const uid = "new-user-uid";
  const userDb = testEnv.authenticatedContext(uid, { email: "new@test.com" }).firestore();

  await assertSucceeds(
    setDoc(doc(userDb, "users", uid), {
      uid,
      email: "new@test.com",
      displayName: "New User",
      role: null,
    })
  );

  await assertFails(
    setDoc(doc(userDb, "users", `${uid}-bad`), {
      uid: `${uid}-bad`,
      email: "other@test.com",
      displayName: "Bad User",
      role: null,
    })
  );
});

test("user profile create with non-null role is denied", async () => {
  const uid = "role-create-user";
  const userDb = testEnv.authenticatedContext(uid, { email: "role-create@test.com" }).firestore();

  await assertFails(
    setDoc(doc(userDb, "users", uid), {
      uid,
      email: "role-create@test.com",
      displayName: "Role User",
      role: ROLE_DAD,
    })
  );
});

test("user profile cannot change persisted email", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: "owner@test.com" }).firestore();

  await assertSucceeds(
    updateDoc(doc(ownerDb, "users", OWNER_UID), {
      displayName: "Owner Updated",
    })
  );

  await assertFails(
    updateDoc(doc(ownerDb, "users", OWNER_UID), {
      email: "attacker@test.com",
    })
  );
});

test("user profile role cannot be changed by client", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email: "owner@test.com" }).firestore();

  await assertFails(
    updateDoc(doc(ownerDb, "users", OWNER_UID), {
      role: ROLE_MOM,
    })
  );
});

test("client meal deletion is denied", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const momDb = testEnv.authenticatedContext(MOM_UID).firestore();
  await assertFails(deleteDoc(doc(ownerDb, "meals", MEAL_ID)));
  await assertFails(deleteDoc(doc(momDb, "meals", MEAL_ID)));
});

test("meal creation allows all meal types", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const mealTypes = [TYPE_BREAKFAST, TYPE_LUNCH, TYPE_DINNER, TYPE_SNACK];

  for (const [idx, type] of mealTypes.entries()) {
    await assertSucceeds(
      setDoc(doc(ownerDb, "meals", `meal-type-${idx}`), {
        ownerUid: OWNER_UID,
        userIds: [ROLE_DAD, ROLE_DAUGHTER],
        description: `meal-type-${idx}`,
        type,
        timestamp: Timestamp.fromMillis(Date.now()),
        commentCount: 0,
      })
    );
  }
});
