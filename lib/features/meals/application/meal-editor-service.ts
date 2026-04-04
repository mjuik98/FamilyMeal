import { logError } from "@/lib/logging";
import type { Meal, UserRole } from "@/lib/types";
import {
  createMealRecordInRuntime,
  deleteMealRecordInRuntime,
  loadEditableMealInRuntime,
  updateExistingMealRecordInRuntime,
} from "@/lib/modules/meals/infrastructure/meal-editor-runtime";
import type {
  CreateMealCommand,
  MealDeleteResult,
  UpdateMealCommand,
} from "@/lib/modules/meals/contracts";

import type { MealRuntimeState } from "@/lib/features/meals/application/meal-read-service";

export type { MealDeleteResult } from "@/lib/modules/meals/contracts";

type SubmitPhase = "uploading" | "saving";

const normalizeMealDescription = (
  description: string,
  autoDescription: string
): string => description.trim() || autoDescription;

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
  const command: CreateMealCommand = {
    userIds: selectedUsers,
    description: normalizedDescription,
    type,
    imageUrl: "",
    timestamp,
  };

  await createMealRecordInRuntime({
    userUid,
    command,
    imageFile,
    runtimeState,
    onPhaseChange,
    onCleanupError: (cleanupError) => {
      logError("Failed to cleanup uploaded meal image after save error", cleanupError);
    },
  });
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
  return loadEditableMealInRuntime({
    mealId,
    currentUid,
    currentRole,
  });
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
  const command: UpdateMealCommand = {
    userIds: selectedUsers,
    description: description.trim(),
    type,
    timestamp: recordDate.getTime(),
  };

  await updateExistingMealRecordInRuntime({
    mealId,
    command,
    imageFile,
    imagePreview,
    onPhaseChange,
    onCleanupError: (cleanupError) => {
      logError("Failed to cleanup uploaded meal image after update error", cleanupError);
    },
  });
};

export const deleteMealRecord = async (mealId: string): Promise<MealDeleteResult> =>
  deleteMealRecordInRuntime(mealId);
