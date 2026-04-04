import { MAX_MEAL_DESCRIPTION_LENGTH } from "@/lib/domain/meal-policy";
import type { Meal } from "@/lib/types";
import type {
  CreateMealCommand,
  UpdateMealCommand,
} from "@/lib/modules/meals/contracts";

import { fetchAuthedJson } from "@/lib/client/auth-http";

export type MealUpdateInput = UpdateMealCommand;

export type MealDeleteStatus = "completed" | "already_deleted" | "already_processing";

export type MealDeleteResult = {
  deleted: boolean;
  status: MealDeleteStatus;
};

const isMealDeleteStatus = (value: unknown): value is MealDeleteStatus =>
  value === "completed" || value === "already_deleted" || value === "already_processing";

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

export const addMeal = async (meal: CreateMealCommand): Promise<Meal> => {
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
  updates: UpdateMealCommand
): Promise<Meal> => {
  const nextUpdates = { ...updates };
  if (typeof nextUpdates.description === "string") {
    nextUpdates.description = normalizeMealDescription(nextUpdates.description);
  }

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

export const deleteMeal = async (id: string): Promise<MealDeleteResult> => {
  const mealId = encodeURIComponent(id);
  const response = await fetchAuthedJson<{ ok: true; deleted: boolean; status: string }>(
    `/api/meals/${mealId}`,
    {
      method: "DELETE",
    }
  );
  if (!isMealDeleteStatus(response.status)) {
    throw new Error("Unexpected delete status");
  }
  return {
    deleted: response.deleted,
    status: response.status,
  };
};
