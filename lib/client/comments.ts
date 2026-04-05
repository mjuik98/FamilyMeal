import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { MealComment, UserRole } from "@/lib/types";

import { fetchAuthedJson } from "@/lib/platform/http/auth-http";
import { convertCommentDoc } from "@/lib/client/serializers";

const mealCommentsRef = (mealId: string) => collection(db, "meals", mealId, "comments");

export const getMealComments = async (mealId: string): Promise<MealComment[]> => {
  const q = query(mealCommentsRef(mealId), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(convertCommentDoc)
    .filter((comment): comment is MealComment => Boolean(comment));
};

export const addMealComment = async (
  mealId: string,
  _author: UserRole,
  _authorUid: string,
  text: string,
  options?: { parentId?: string }
): Promise<MealComment> => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment text is empty");

  const encodedMealId = encodeURIComponent(mealId);
  const response = await fetchAuthedJson<{ ok: true; comment: MealComment }>(
    `/api/meals/${encodedMealId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ text: trimmed, parentId: options?.parentId }),
    }
  );
  return response.comment;
};

export const updateMealComment = async (
  mealId: string,
  commentId: string,
  actorUid: string,
  text: string
): Promise<MealComment> => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment text is empty");
  if (!actorUid) throw new Error("Missing actor uid");

  const encodedMealId = encodeURIComponent(mealId);
  const encodedCommentId = encodeURIComponent(commentId);
  const response = await fetchAuthedJson<{ ok: true; comment: MealComment }>(
    `/api/meals/${encodedMealId}/comments/${encodedCommentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ text: trimmed }),
    }
  );
  return response.comment;
};

export const deleteMealComment = async (
  mealId: string,
  commentId: string,
  actorUid: string
): Promise<void> => {
  if (!actorUid) throw new Error("Missing actor uid");

  const encodedMealId = encodeURIComponent(mealId);
  const encodedCommentId = encodeURIComponent(commentId);
  await fetchAuthedJson<{ ok: true }>(`/api/meals/${encodedMealId}/comments/${encodedCommentId}`, {
    method: "DELETE",
  });
};
