import { FieldPath, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { serializeMealDocument } from "@/lib/modules/meals/server/meal-types";
import {
  ARCHIVE_SCAN_BATCH_SIZE,
  ARCHIVE_SCAN_LIMIT,
  type ArchiveCursor,
  type ArchiveQueryParams,
  encodeArchiveCursor,
  matchesArchiveMeal,
} from "@/lib/modules/meals/server/archive-types";
import type { Meal, UserRole } from "@/lib/types";

export type ArchiveListResult = {
  meals: Meal[];
  nextCursor: string | null;
  hasMore: boolean;
  isPartial: boolean;
};

export type ArchiveListParams = ArchiveQueryParams & {
  uid: string;
  actorRole: UserRole;
};

const buildArchiveQuery = (cursor: ArchiveCursor | null): FirebaseFirestore.Query => {
  let q: FirebaseFirestore.Query = adminDb
    .collection("meals")
    .orderBy("timestamp", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(ARCHIVE_SCAN_BATCH_SIZE);

  if (cursor) {
    q = q.startAfter(Timestamp.fromMillis(cursor.lastTimestamp), cursor.lastId);
  }

  return q;
};

export const listArchiveMeals = async (
  params: ArchiveListParams
): Promise<ArchiveListResult> => {
  const meals: Meal[] = [];
  let scannedCount = 0;
  let reachedCollectionEnd = false;
  let foundNextMatch = false;
  let cursor: ArchiveCursor | null = params.cursor;
  let lastVisibleMeal: Meal | null = null;
  let lastScannedMeal: Meal | null = null;

  while (!foundNextMatch && scannedCount < ARCHIVE_SCAN_LIMIT) {
    const snapshot: FirebaseFirestore.QuerySnapshot = await buildArchiveQuery(cursor).get();
    if (snapshot.empty) {
      reachedCollectionEnd = true;
      break;
    }

    for (const mealDoc of snapshot.docs) {
      scannedCount += 1;
      const meal = serializeMealDocument(
        mealDoc.id,
        mealDoc.data() as Parameters<typeof serializeMealDocument>[1]
      );
      lastScannedMeal = meal;

      if (!meal.userIds?.includes(params.actorRole)) {
        if (meal.userId !== params.actorRole) {
          continue;
        }
      }

      if (!matchesArchiveMeal(meal, params)) {
        if (scannedCount >= ARCHIVE_SCAN_LIMIT) {
          break;
        }
        continue;
      }

      if (meals.length < params.limit) {
        meals.push(meal);
        lastVisibleMeal = meal;
      } else {
        foundNextMatch = true;
        break;
      }

      if (scannedCount >= ARCHIVE_SCAN_LIMIT) {
        break;
      }
    }

    cursor = lastScannedMeal
      ? {
          lastTimestamp: lastScannedMeal.timestamp,
          lastId: lastScannedMeal.id,
          mode: "scan",
        }
      : null;

    if (snapshot.size < ARCHIVE_SCAN_BATCH_SIZE || !lastScannedMeal) {
      reachedCollectionEnd = true;
      break;
    }
  }

  const exhaustedScanLimit = scannedCount >= ARCHIVE_SCAN_LIMIT && !reachedCollectionEnd && !foundNextMatch;
  const hasMore = foundNextMatch || exhaustedScanLimit;
  const cursorMode = foundNextMatch ? "meal" : "scan";
  const cursorAnchor = foundNextMatch ? lastVisibleMeal : lastScannedMeal;

  return {
    meals,
    nextCursor: hasMore && cursorAnchor ? encodeArchiveCursor(cursorAnchor.timestamp, cursorAnchor.id, cursorMode) : null,
    hasMore,
    isPartial: exhaustedScanLimit && hasMore,
  };
};
