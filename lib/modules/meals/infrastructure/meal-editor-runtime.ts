import { addMeal, getMealById, updateMeal } from "@/lib/client/meals";
import { readMealImageDataUrl } from "@/lib/meal-form";
import { saveQaMeal } from "@/lib/qa/runtime";
import type { Meal, UserRole } from "@/lib/types";
import { cleanupUploadedMealImage, uploadImage } from "@/lib/uploadImage";

import type {
  CreateMealCommand,
  UpdateMealCommand,
} from "@/lib/modules/meals/contracts";
import type { MealRuntimeState } from "@/lib/modules/meals/infrastructure/meal-read-runtime";

type SubmitPhase = "uploading" | "saving";

export const createMealRecordInRuntime = async ({
  userUid,
  command,
  imageFile,
  runtimeState,
  onPhaseChange,
  onCleanupError,
}: {
  userUid: string;
  command: CreateMealCommand;
  imageFile: File;
  runtimeState: MealRuntimeState;
  onPhaseChange?: (phase: SubmitPhase) => void;
  onCleanupError?: (error: unknown) => void;
}) => {
  if (runtimeState.qaMode) {
    onPhaseChange?.("saving");
    const qaImageUrl = await readMealImageDataUrl(imageFile);
    saveQaMeal({
      id: `qa-custom-${Date.now()}`,
      ownerUid: userUid,
      userIds: command.userIds,
      description: command.description,
      type: command.type,
      imageUrl: qaImageUrl,
      timestamp: command.timestamp ?? Date.now(),
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
      ...command,
      imageUrl: uploadedImageUrl,
    });
  } catch (error) {
    if (uploadedImageUrl) {
      try {
        await cleanupUploadedMealImage(uploadedImageUrl);
      } catch (cleanupError) {
        onCleanupError?.(cleanupError);
      }
    }
    throw error;
  }
};

export const loadEditableMealInRuntime = async ({
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

export const updateExistingMealRecordInRuntime = async ({
  mealId,
  command,
  imageFile,
  imagePreview,
  onPhaseChange,
  onCleanupError,
}: {
  mealId: string;
  command: UpdateMealCommand;
  imageFile: File | null;
  imagePreview: string | null;
  onPhaseChange?: (phase: SubmitPhase) => void;
  onCleanupError?: (error: unknown) => void;
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
      ...command,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    });
  } catch (error) {
    if (uploadedImageUrl) {
      try {
        await cleanupUploadedMealImage(uploadedImageUrl);
      } catch (cleanupError) {
        onCleanupError?.(cleanupError);
      }
    }
    throw error;
  }
};
