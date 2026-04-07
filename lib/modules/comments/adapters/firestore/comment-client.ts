import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { convertCommentDoc } from "@/lib/client/serializers";
import { db } from "@/lib/firebase";
import type { MealComment } from "@/lib/types";

export {
  addMealComment,
  deleteMealComment,
  updateMealComment,
} from "@/lib/modules/comments/adapters/http/comment-command-client";

const mealCommentsRef = (mealId: string) => collection(db, "meals", mealId, "comments");

export const getMealComments = async (mealId: string): Promise<MealComment[]> => {
  const q = query(mealCommentsRef(mealId), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(convertCommentDoc)
    .filter((comment): comment is MealComment => Boolean(comment));
};
