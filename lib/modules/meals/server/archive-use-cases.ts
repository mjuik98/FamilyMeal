import { FieldPath, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { logWarn } from "@/lib/logging";
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

type ArchiveBatchResult = {
  meals: Meal[];
  reachedCollectionEnd: boolean;
};

type ArchiveQuerySource = {
  buildQuery: (cursor: ArchiveCursor | null) => FirebaseFirestore.Query;
};

const compareMealsDesc = (left: Meal, right: Meal): number => {
  if (left.timestamp !== right.timestamp) {
    return right.timestamp - left.timestamp;
  }

  return right.id.localeCompare(left.id, "en");
};

const isMealVisibleToActor = (meal: Meal, actorRole: UserRole): boolean =>
  meal.userIds?.includes(actorRole) || meal.userId === actorRole;

const applyArchiveCursor = (
  query: FirebaseFirestore.Query,
  cursor: ArchiveCursor | null
): FirebaseFirestore.Query => {
  if (!cursor) {
    return query;
  }

  return query.startAfter(Timestamp.fromMillis(cursor.lastTimestamp), cursor.lastId);
};

const buildArchiveQuery = (cursor: ArchiveCursor | null): FirebaseFirestore.Query => {
  const q: FirebaseFirestore.Query = adminDb
    .collection("meals")
    .orderBy("timestamp", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(ARCHIVE_SCAN_BATCH_SIZE);

  return applyArchiveCursor(q, cursor);
};

const buildOptimizedArchiveSources = (
  params: ArchiveListParams
): ArchiveQuerySource[] => {
  const targetRole = params.participant ?? params.actorRole;
  const sources: ArchiveQuerySource[] = [
    {
      buildQuery: (cursor) => {
        let q: FirebaseFirestore.Query = adminDb
          .collection("meals")
          .where("userIds", "array-contains", targetRole);

        if (params.type) {
          q = q.where("type", "==", params.type);
        }

        q = q
          .orderBy("timestamp", "desc")
          .orderBy(FieldPath.documentId(), "desc")
          .limit(ARCHIVE_SCAN_BATCH_SIZE);

        return applyArchiveCursor(q, cursor);
      },
    },
  ];

  if (targetRole === params.actorRole) {
    sources.push({
      buildQuery: (cursor) => {
        let q: FirebaseFirestore.Query = adminDb
          .collection("meals")
          .where("userId", "==", params.actorRole);

        if (params.type) {
          q = q.where("type", "==", params.type);
        }

        q = q
          .orderBy("timestamp", "desc")
          .orderBy(FieldPath.documentId(), "desc")
          .limit(ARCHIVE_SCAN_BATCH_SIZE);

        return applyArchiveCursor(q, cursor);
      },
    });
  }

  return sources;
};

const isArchiveOptimizationUnavailable = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  const message =
    error instanceof Error ? error.message.toLowerCase() : "";

  return (
    code === 9 ||
    code === "failed-precondition" ||
    message.includes("requires an index") ||
    message.includes("index")
  );
};

const fetchArchiveBatch = async (
  cursor: ArchiveCursor | null
): Promise<ArchiveBatchResult> => {
  const snapshot: FirebaseFirestore.QuerySnapshot = await buildArchiveQuery(cursor).get();
  if (snapshot.empty) {
    return {
      meals: [],
      reachedCollectionEnd: true,
    };
  }

  return {
    meals: snapshot.docs.map((mealDoc) =>
      serializeMealDocument(
        mealDoc.id,
        mealDoc.data() as Parameters<typeof serializeMealDocument>[1]
      )
    ),
    reachedCollectionEnd: snapshot.size < ARCHIVE_SCAN_BATCH_SIZE,
  };
};

const fetchOptimizedArchiveBatch = async (
  params: ArchiveListParams,
  cursor: ArchiveCursor | null
): Promise<ArchiveBatchResult> => {
  const sources = buildOptimizedArchiveSources(params);
  const snapshots = await Promise.all(
    sources.map((source) => source.buildQuery(cursor).get())
  );
  const mergedMeals = new Map<string, Meal>();

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((mealDoc) => {
      const meal = serializeMealDocument(
        mealDoc.id,
        mealDoc.data() as Parameters<typeof serializeMealDocument>[1]
      );
      mergedMeals.set(meal.id, meal);
    });
  });

  return {
    meals: Array.from(mergedMeals.values()).sort(compareMealsDesc),
    reachedCollectionEnd: snapshots.every(
      (snapshot) => snapshot.size < ARCHIVE_SCAN_BATCH_SIZE
    ),
  };
};

const scanArchiveMeals = async (
  params: ArchiveListParams,
  fetchBatch: (cursor: ArchiveCursor | null) => Promise<ArchiveBatchResult>
): Promise<ArchiveListResult> => {
  const meals: Meal[] = [];
  let scannedCount = 0;
  let reachedCollectionEnd = false;
  let foundNextMatch = false;
  let cursor: ArchiveCursor | null = params.cursor;
  let lastVisibleMeal: Meal | null = null;
  let lastScannedMeal: Meal | null = null;

  while (!foundNextMatch && scannedCount < ARCHIVE_SCAN_LIMIT) {
    const batch = await fetchBatch(cursor);
    if (batch.meals.length === 0) {
      reachedCollectionEnd = true;
      break;
    }

    for (const meal of batch.meals) {
      scannedCount += 1;
      lastScannedMeal = meal;

      if (!isMealVisibleToActor(meal, params.actorRole)) {
        continue;
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

    if (batch.reachedCollectionEnd || !lastScannedMeal) {
      reachedCollectionEnd = true;
      break;
    }
  }

  const exhaustedScanLimit =
    scannedCount >= ARCHIVE_SCAN_LIMIT &&
    !reachedCollectionEnd &&
    !foundNextMatch;
  const hasMore = foundNextMatch || exhaustedScanLimit;
  const cursorMode = foundNextMatch ? "meal" : "scan";
  const cursorAnchor = foundNextMatch ? lastVisibleMeal : lastScannedMeal;

  return {
    meals,
    nextCursor:
      hasMore && cursorAnchor
        ? encodeArchiveCursor(
            cursorAnchor.timestamp,
            cursorAnchor.id,
            cursorMode
          )
        : null,
    hasMore,
    isPartial: exhaustedScanLimit && hasMore,
  };
};

export const listArchiveMeals = async (
  params: ArchiveListParams
): Promise<ArchiveListResult> => {
  try {
    return await scanArchiveMeals(params, (cursor) =>
      fetchOptimizedArchiveBatch(params, cursor)
    );
  } catch (error) {
    if (!isArchiveOptimizationUnavailable(error)) {
      throw error;
    }

    logWarn(
      "Archive query optimization unavailable; falling back to full scan",
      error
    );
  }

  return scanArchiveMeals(params, fetchArchiveBatch);
};
