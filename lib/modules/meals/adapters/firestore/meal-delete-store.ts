import { adminDb } from "@/lib/firebase-admin";

const DELETE_BATCH_LIMIT = 450;
export const MEAL_DELETE_JOB_COLLECTION = "_maintenanceDeleteJobs";

export type MealDeletePlanningContext = {
  tx: FirebaseFirestore.Transaction;
  mealRef: FirebaseFirestore.DocumentReference;
  jobRef: FirebaseFirestore.DocumentReference;
  mealSnap: FirebaseFirestore.DocumentSnapshot;
  jobSnap: FirebaseFirestore.DocumentSnapshot;
};

export const runMealDeletePlanningTransaction = async <T>(
  mealId: string,
  handler: (context: MealDeletePlanningContext) => Promise<T>
): Promise<T> => {
  const mealRef = adminDb.collection("meals").doc(mealId);
  const jobRef = adminDb.collection(MEAL_DELETE_JOB_COLLECTION).doc(mealId);

  return adminDb.runTransaction(async (tx) => {
    const [mealSnap, jobSnap] = await Promise.all([tx.get(mealRef), tx.get(jobRef)]);
    return handler({
      tx,
      mealRef,
      jobRef,
      mealSnap,
      jobSnap,
    });
  });
};

export const deleteStoredMealCommentsByMealId = async (mealId: string): Promise<void> => {
  const commentsRef = adminDb.collection("meals").doc(mealId).collection("comments");
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let query: FirebaseFirestore.Query = commentsRef.orderBy("__name__").limit(DELETE_BATCH_LIMIT);
    if (cursor) {
      query = commentsRef.orderBy("__name__").startAfter(cursor).limit(DELETE_BATCH_LIMIT);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((commentDoc) => batch.delete(commentDoc.ref));
    await batch.commit();

    if (snapshot.size < DELETE_BATCH_LIMIT) {
      return;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!cursor) {
      return;
    }
  }
};

export const deleteStoredMealActivitiesByMealId = async (mealId: string): Promise<void> => {
  const activitiesRef = adminDb.collectionGroup("activity").where("mealId", "==", mealId);
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let query: FirebaseFirestore.Query = activitiesRef.orderBy("__name__").limit(DELETE_BATCH_LIMIT);
    if (cursor) {
      query = activitiesRef.orderBy("__name__").startAfter(cursor).limit(DELETE_BATCH_LIMIT);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((activityDoc) => batch.delete(activityDoc.ref));
    await batch.commit();

    if (snapshot.size < DELETE_BATCH_LIMIT) {
      return;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!cursor) {
      return;
    }
  }
};

export const deleteStoredMealDocumentById = async (mealId: string): Promise<void> => {
  await adminDb.collection("meals").doc(mealId).delete();
};

export const updateMealDeleteJob = async (
  mealId: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await adminDb
    .collection(MEAL_DELETE_JOB_COLLECTION)
    .doc(mealId)
    .set(
      {
        ...payload,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
};
