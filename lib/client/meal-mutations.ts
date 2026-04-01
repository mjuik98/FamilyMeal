import { MAX_MEAL_DESCRIPTION_LENGTH } from "@/lib/domain/meal-policy";
import type { Meal } from "@/lib/types";

import { fetchAuthedJson } from "@/lib/client/auth-http";

export type MealUpdateInput = Partial<Omit<Meal, "id" | "imageUrl">> & {
  imageUrl?: string | null;
};

const normalizeMealDescription = (description: string): string => {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error("Meal description is empty");
  }
  if (trimmed.length > MAX_MEAL_DESCRIPTION_LENGTH) {
    throw new Error(
      `Meal description must be <= ${MAX_MEAL_DESCRIPTION_LENGTH} characters`
    );
  }
  return trimmed;
};

export const addMeal = async (meal: Omit<Meal, "id">): Promise<Meal> => {
  if (!meal.ownerUid) {
    throw new Error("ownerUid is required");
  }

  const response = await fetchAuthedJson<{ ok: true; meal: Meal }>("/api/meals", {
    method: "POST",
    body: JSON.stringify({
      userIds: meal.userIds,
      description: normalizeMealDescription(meal.description),
      type: meal.type,
      imageUrl: meal.imageUrl,
      timestamp: meal.timestamp,
    }),
  });

  return response.meal;
};

export const updateMeal = async (
  id: string,
  updates: MealUpdateInput
): Promise<Meal> => {
  const nextUpdates = { ...updates };
  if (typeof nextUpdates.description === "string") {
    nextUpdates.description = normalizeMealDescription(nextUpdates.description);
  }
  delete (nextUpdates as { comments?: unknown }).comments;
  delete (nextUpdates as { commentCount?: unknown }).commentCount;
  delete (nextUpdates as { reactions?: unknown }).reactions;
  delete (nextUpdates as { timestamp?: unknown }).timestamp;
  delete (nextUpdates as { userId?: unknown }).userId;

  const encodedMealId = encodeURIComponent(id);
  const response = await fetchAuthedJson<{ ok: true; meal: Meal }>(
    `/api/meals/${encodedMealId}`,
    {
      method: "PATCH",
      body: JSON.stringify(nextUpdates),
    }
  );

  return response.meal;
};

export const deleteMeal = async (id: string) => {
  const mealId = encodeURIComponent(id);
  await fetchAuthedJson<{ ok: true; deleted: boolean; status: string }>(
    `/api/meals/${mealId}`,
    {
      method: "DELETE",
    }
  );
};
