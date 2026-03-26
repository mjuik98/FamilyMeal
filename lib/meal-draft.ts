import type { Meal, UserRole } from "@/lib/types";

type MealDraftDefaults = {
  mealType: Meal["type"];
  participantIds: UserRole[];
};

const MEAL_DRAFT_KEY = "familymeal:meal-draft-defaults";

const DEFAULT_DRAFT: MealDraftDefaults = {
  mealType: "점심",
  participantIds: [],
};

const VALID_TYPES: Meal["type"][] = ["아침", "점심", "저녁", "간식"];
const VALID_USERS: UserRole[] = ["아빠", "엄마", "딸", "아들"];

export const getMealDraftDefaults = (): MealDraftDefaults => {
  if (typeof window === "undefined") return DEFAULT_DRAFT;

  try {
    const raw = window.localStorage.getItem(MEAL_DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;

    const parsed = JSON.parse(raw) as Partial<MealDraftDefaults>;
    const mealType = VALID_TYPES.includes(parsed.mealType as Meal["type"])
      ? (parsed.mealType as Meal["type"])
      : DEFAULT_DRAFT.mealType;
    const participantIds = Array.isArray(parsed.participantIds)
      ? parsed.participantIds.filter(
          (role): role is UserRole => typeof role === "string" && VALID_USERS.includes(role as UserRole)
        )
      : [];

    return { mealType, participantIds };
  } catch {
    return DEFAULT_DRAFT;
  }
};

export const saveMealDraftDefaults = (defaults: MealDraftDefaults) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    MEAL_DRAFT_KEY,
    JSON.stringify({
      mealType: defaults.mealType,
      participantIds: defaults.participantIds,
    })
  );
};
