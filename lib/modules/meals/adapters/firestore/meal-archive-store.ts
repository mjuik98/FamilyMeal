import { FieldPath, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type { ArchiveCursor } from "@/lib/modules/meals/server/archive-types";
import type { StoredMealDoc } from "@/lib/modules/meals/server/meal-types";
import type { Meal, UserRole } from "@/lib/types";

export type StoredMealRecord = {
  id: string;
  data: StoredMealDoc;
};

const toTimestampMillis = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
};

const applyArchiveCursor = (
  query: FirebaseFirestore.Query,
  cursor: ArchiveCursor | null
): FirebaseFirestore.Query => {
  if (!cursor) {
    return query;
  }

  return query.startAfter(Timestamp.fromMillis(cursor.lastTimestamp), cursor.lastId);
};

const toStoredMealRecords = (
  snapshot: FirebaseFirestore.QuerySnapshot
): StoredMealRecord[] =>
  snapshot.docs.map((mealDoc) => ({
    id: mealDoc.id,
    data: mealDoc.data() as StoredMealDoc,
  }));

const compareStoredMealsDesc = (left: StoredMealRecord, right: StoredMealRecord): number => {
  const leftTimestamp = toTimestampMillis(left.data.timestamp);
  const rightTimestamp = toTimestampMillis(right.data.timestamp);

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return right.id.localeCompare(left.id, "en");
};

export const listStoredArchiveMealRecords = async ({
  cursor,
  limit,
}: {
  cursor: ArchiveCursor | null;
  limit: number;
}): Promise<{
  records: StoredMealRecord[];
  reachedCollectionEnd: boolean;
}> => {
  const snapshot = await applyArchiveCursor(
    adminDb
      .collection("meals")
      .orderBy("timestamp", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit),
    cursor
  ).get();

  return {
    records: toStoredMealRecords(snapshot),
    reachedCollectionEnd: snapshot.size < limit,
  };
};

export const listStoredOptimizedArchiveMealRecords = async ({
  targetRole,
  type,
  cursor,
  limit,
  includeLegacyUserFallback,
}: {
  targetRole: UserRole;
  type?: Meal["type"];
  cursor: ArchiveCursor | null;
  limit: number;
  includeLegacyUserFallback: boolean;
}): Promise<{
  records: StoredMealRecord[];
  reachedCollectionEnd: boolean;
}> => {
  const sources: FirebaseFirestore.Query[] = [];

  let userIdsQuery: FirebaseFirestore.Query = adminDb
    .collection("meals")
    .where("userIds", "array-contains", targetRole);
  if (type) {
    userIdsQuery = userIdsQuery.where("type", "==", type);
  }
  sources.push(
    applyArchiveCursor(
      userIdsQuery
        .orderBy("timestamp", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(limit),
      cursor
    )
  );

  if (includeLegacyUserFallback) {
    let legacyUserQuery: FirebaseFirestore.Query = adminDb
      .collection("meals")
      .where("userId", "==", targetRole);
    if (type) {
      legacyUserQuery = legacyUserQuery.where("type", "==", type);
    }
    sources.push(
      applyArchiveCursor(
        legacyUserQuery
          .orderBy("timestamp", "desc")
          .orderBy(FieldPath.documentId(), "desc")
          .limit(limit),
        cursor
      )
    );
  }

  const snapshots = await Promise.all(sources.map((source) => source.get()));
  const merged = new Map<string, StoredMealRecord>();

  snapshots.forEach((snapshot) => {
    toStoredMealRecords(snapshot).forEach((record) => {
      merged.set(record.id, record);
    });
  });

  return {
    records: Array.from(merged.values()).sort(compareStoredMealsDesc),
    reachedCollectionEnd: snapshots.every((snapshot) => snapshot.size < limit),
  };
};
