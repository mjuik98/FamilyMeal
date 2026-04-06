import { logWarn } from "@/lib/logging";
import {
  listStoredArchiveMealRecords,
  listStoredOptimizedArchiveMealRecords,
} from "@/lib/modules/meals/adapters/firestore/meal-archive-store";
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

const compareMealsDesc = (left: Meal, right: Meal): number => {
  if (left.timestamp !== right.timestamp) {
    return right.timestamp - left.timestamp;
  }

  return right.id.localeCompare(left.id, "en");
};

const isMealVisibleToActor = (meal: Meal, actorRole: UserRole): boolean =>
  meal.userIds?.includes(actorRole) || meal.userId === actorRole;

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
  const batch = await listStoredArchiveMealRecords({
    cursor,
    limit: ARCHIVE_SCAN_BATCH_SIZE,
  });
  if (batch.records.length === 0) {
    return {
      meals: [],
      reachedCollectionEnd: true,
    };
  }

  return {
    meals: batch.records.map((mealRecord) =>
      serializeMealDocument(
        mealRecord.id,
        mealRecord.data as Parameters<typeof serializeMealDocument>[1]
      )
    ),
    reachedCollectionEnd: batch.reachedCollectionEnd,
  };
};

const fetchOptimizedArchiveBatch = async (
  params: ArchiveListParams,
  cursor: ArchiveCursor | null
): Promise<ArchiveBatchResult> => {
  const targetRole = params.participant ?? params.actorRole;
  const batch = await listStoredOptimizedArchiveMealRecords({
    targetRole,
    type: params.type,
    cursor,
    limit: ARCHIVE_SCAN_BATCH_SIZE,
    includeLegacyUserFallback: targetRole === params.actorRole,
  });

  return {
    meals: batch.records
      .map((mealRecord) =>
        serializeMealDocument(
          mealRecord.id,
          mealRecord.data as Parameters<typeof serializeMealDocument>[1]
        )
      )
      .sort(compareMealsDesc),
    reachedCollectionEnd: batch.reachedCollectionEnd,
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
