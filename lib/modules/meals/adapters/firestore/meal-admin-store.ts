import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type { StoredMealDoc } from "@/lib/modules/meals/server/meal-types";

export type StoredMealRecord = {
  id: string;
  data: StoredMealDoc;
};

export type StoredMealTransactionContext = {
  tx: FirebaseFirestore.Transaction;
  mealRef: FirebaseFirestore.DocumentReference;
  snapshot: FirebaseFirestore.DocumentSnapshot;
};

export const getStoredMealRecordById = async (
  mealId: string
): Promise<StoredMealRecord | null> => {
  const snapshot = await adminDb.collection("meals").doc(mealId).get();
  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    data: snapshot.data() as StoredMealDoc,
  };
};

export const listStoredMealRecordsInRange = async ({
  start,
  end,
}: {
  start: Date;
  end: Date;
}): Promise<StoredMealRecord[]> => {
  const snapshot = await adminDb
    .collection("meals")
    .where("timestamp", ">=", Timestamp.fromDate(start))
    .where("timestamp", "<=", Timestamp.fromDate(end))
    .orderBy("timestamp", "desc")
    .get();

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data() as StoredMealDoc,
  }));
};

export const createStoredMealRecord = async (payload: Record<string, unknown>): Promise<string> => {
  const createdRef = await adminDb.collection("meals").add(payload);
  return createdRef.id;
};

export const runStoredMealTransaction = async <T>(
  mealId: string,
  handler: (context: StoredMealTransactionContext) => Promise<T>
): Promise<T> => {
  const mealRef = adminDb.collection("meals").doc(mealId);

  return adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(mealRef);
    return handler({
      tx,
      mealRef,
      snapshot,
    });
  });
};
