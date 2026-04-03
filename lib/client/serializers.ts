import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import { normalizeReactionMap } from "@/lib/reactions";
import { isMealType, isUserRole } from "@/lib/domain/meal-policy";
import type { Meal, MealComment, UserRole } from "@/lib/types";

const toMillis = (value: unknown, fallback: number): number => {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return fallback;
};

export const normalizeComment = (
  id: string,
  raw: Partial<MealComment> & { createdAt?: unknown; updatedAt?: unknown; timestamp?: unknown }
): MealComment | null => {
  if (!raw?.author || !raw?.text) return null;

  const fallback = Date.now();
  const createdAt = toMillis(raw.createdAt ?? raw.timestamp, fallback);
  const updatedAt = toMillis(raw.updatedAt ?? raw.timestamp ?? raw.createdAt, createdAt);
  const timestamp = toMillis(raw.timestamp, createdAt);

  return {
    id,
    author: raw.author,
    authorUid: typeof raw.authorUid === "string" ? raw.authorUid : "",
    text: String(raw.text),
    parentId: typeof raw.parentId === "string" && raw.parentId.trim().length > 0 ? raw.parentId : undefined,
    mentionedAuthor: typeof raw.mentionedAuthor === "string" ? (raw.mentionedAuthor as UserRole) : undefined,
    createdAt,
    updatedAt,
    timestamp,
    reactions: normalizeReactionMap((raw as { reactions?: unknown }).reactions),
  };
};

const normalizeComments = (rawComments: unknown): MealComment[] => {
  if (!Array.isArray(rawComments)) return [];
  return rawComments
    .map((comment, index) => {
      const raw = comment as Partial<MealComment> & { createdAt?: unknown; updatedAt?: unknown; timestamp?: unknown };
      const id = typeof raw.id === "string" && raw.id ? raw.id : `legacy-${index}`;
      return normalizeComment(id, raw);
    })
    .filter((comment): comment is MealComment => Boolean(comment))
    .sort((a, b) => a.createdAt - b.createdAt);
};

const normalizeKeywords = (rawKeywords: unknown): string[] | undefined => {
  if (!Array.isArray(rawKeywords)) return undefined;

  const keywords = rawKeywords
    .filter((keyword): keyword is string => typeof keyword === "string" && keyword.trim().length > 0)
    .map((keyword) => keyword.trim());

  return keywords.length > 0 ? keywords : undefined;
};

const normalizeMealType = (value: unknown): Meal["type"] =>
  isMealType(value) ? value : "점심";

const normalizeCommentCount = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

const mealParticipants = (mealData: Partial<Meal> & { userIds?: unknown; userId?: unknown }): UserRole[] => {
  const normalizedUserIds = Array.isArray(mealData.userIds)
    ? mealData.userIds.filter((role): role is UserRole => isUserRole(role))
    : [];
  if (normalizedUserIds.length > 0) {
    return normalizedUserIds;
  }
  if (isUserRole(mealData.userId)) {
    return [mealData.userId];
  }
  return [];
};

export const serializeMealSnapshot = (
  id: string,
  data: Partial<Meal> & {
    ownerUid?: unknown;
    userId?: unknown;
    userIds?: unknown;
    keywords?: unknown;
    imageUrl?: unknown;
    description?: unknown;
    type?: unknown;
    timestamp?: unknown;
    commentCount?: unknown;
    comments?: unknown;
    reactions?: unknown;
  }
): Meal => {
  const userIds = mealParticipants(data);
  const comments = normalizeComments(data.comments);
  const commentCount = normalizeCommentCount(data.commentCount, comments.length);

  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : undefined,
    userId: isUserRole(data.userId) ? data.userId : undefined,
    userIds,
    keywords: normalizeKeywords(data.keywords),
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    description: typeof data.description === "string" ? data.description : "",
    type: normalizeMealType(data.type),
    timestamp: toMillis(data.timestamp, Date.now()),
    comments,
    commentCount,
    reactions: normalizeReactionMap(data.reactions),
  };
};

export const convertMeal = (docSnap: QueryDocumentSnapshot<DocumentData>): Meal =>
  serializeMealSnapshot(docSnap.id, docSnap.data());

export const convertCommentDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): MealComment | null => {
  const raw = docSnap.data() as Partial<MealComment> & {
    createdAt?: unknown;
    updatedAt?: unknown;
    timestamp?: unknown;
  };
  return normalizeComment(docSnap.id, raw);
};

export const serializeWeeklyStatMealSnapshot = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): { timestamp: number; imageUrl?: string } => {
  const data = docSnap.data() as { timestamp?: unknown; imageUrl?: unknown };
  return {
    timestamp: toMillis(data.timestamp, Date.now()),
    imageUrl: typeof data.imageUrl === "string" && data.imageUrl.length > 0 ? data.imageUrl : undefined,
  };
};

export const dedupeAndSortMeals = (meals: Meal[]): Meal[] => {
  const byId = new Map<string, Meal>();
  meals.forEach((meal) => byId.set(meal.id, meal));
  return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
};
