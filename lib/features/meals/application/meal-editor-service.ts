import { addMeal, getMealById, updateMeal } from "@/lib/client/meals";
import { logError } from "@/lib/logging";
import { readMealImageDataUrl } from "@/lib/meal-form";
import { saveQaMeal } from "@/lib/qa/runtime";
import type { Meal, UserRole } from "@/lib/types";
import {
  cleanupUploadedMealImage,
  uploadImage,
} from "@/lib/uploadImage";

import type { MealRuntimeState } from "@/lib/features/meals/application/meal-read-service";

type SubmitPhase = "uploading" | "saving";

const normalizeMealDescription = (
  description: string,
  autoDescription: string
): string => description.trim() || autoDescription;

const cleanupUploadedImage = async (imageUrl: string | null, contextMessage: string) => {
  if (!imageUrl) {
    return;
  }

  try {
    await cleanupUploadedMealImage(imageUrl);
  } catch (cleanupError) {
    logError(contextMessage, cleanupError);
  }
};

export const createMealRecord = async ({
  userUid,
  selectedUsers,
  description,
  autoDescription,
  type,
  imageFile,
  recordDate,
  runtimeState,
  onPhaseChange,
}: {
  userUid: string;
  selectedUsers: UserRole[];
  description: string;
  autoDescription: string;
  type: Meal["type"];
  imageFile: File;
  recordDate: Date;
  runtimeState: MealRuntimeState;
  onPhaseChange?: (phase: SubmitPhase) => void;
}) => {
  const normalizedDescription = normalizeMealDescription(
    description,
    autoDescription
  );
  const timestamp = recordDate.getTime();

  if (runtimeState.qaMode) {
    onPhaseChange?.("saving");
    const qaImageUrl = await readMealImageDataUrl(imageFile);
    saveQaMeal({
      id: `qa-custom-${Date.now()}`,
      ownerUid: userUid,
      userIds: selectedUsers,
      description: normalizedDescription,
      type,
      imageUrl: qaImageUrl,
      timestamp,
      commentCount: 0,
      comments: [],
      reactions: {},
    });
    return;
  }

  let uploadedImageUrl: string | null = null;
  try {
    onPhaseChange?.("uploading");
    uploadedImageUrl = await uploadImage(imageFile);
    onPhaseChange?.("saving");
    await addMeal({
      ownerUid: userUid,
      userIds: selectedUsers,
      description: normalizedDescription,
      type,
      imageUrl: uploadedImageUrl,
      timestamp,
      commentCount: 0,
      reactions: {},
    });
  } catch (error) {
    await cleanupUploadedImage(
      uploadedImageUrl,
      "Failed to cleanup uploaded meal image after save error"
    );
    throw error;
  }
};

export const loadEditableMeal = async ({
  mealId,
  currentUid,
  currentRole,
}: {
  mealId: string;
  currentUid?: string;
  currentRole?: UserRole | null;
}): Promise<{
  meal: Meal | null;
  selectedUsers: UserRole[];
  requiresLegacyMigration: boolean;
}> => {
  const meal = await getMealById(mealId);
  if (!meal) {
    return {
      meal: null,
      selectedUsers: [],
      requiresLegacyMigration: false,
    };
  }

  if (meal.ownerUid && currentUid && meal.ownerUid !== currentUid) {
    throw new Error("작성자만 수정할 수 있습니다.");
  }

  return {
    meal,
    selectedUsers:
      meal.userIds?.length
        ? meal.userIds
        : currentRole
          ? [currentRole]
          : [],
    requiresLegacyMigration: !meal.ownerUid,
  };
};

export const updateExistingMealRecord = async ({
  mealId,
  selectedUsers,
  description,
  type,
  recordDate,
  imageFile,
  imagePreview,
  onPhaseChange,
}: {
  mealId: string;
  selectedUsers: UserRole[];
  description: string;
  type: Meal["type"];
  recordDate: Date;
  imageFile: File | null;
  imagePreview: string | null;
  onPhaseChange?: (phase: SubmitPhase) => void;
}) => {
  let imageUrl: string | null | undefined;
  let uploadedImageUrl: string | null = null;

  try {
    if (imageFile) {
      onPhaseChange?.("uploading");
      uploadedImageUrl = await uploadImage(imageFile);
      imageUrl = uploadedImageUrl;
    } else if (!imagePreview) {
      imageUrl = null;
    }

    onPhaseChange?.("saving");
    await updateMeal(mealId, {
      userIds: selectedUsers,
      description: description.trim(),
      type,
      timestamp: recordDate.getTime(),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    });
  } catch (error) {
    await cleanupUploadedImage(
      uploadedImageUrl,
      "Failed to cleanup uploaded meal image after update error"
    );
    throw error;
  }
};
