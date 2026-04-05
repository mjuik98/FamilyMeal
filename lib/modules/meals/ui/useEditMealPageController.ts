"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useMealImageSelection } from "@/components/hooks/useMealImageSelection";
import { useToast } from "@/components/Toast";
import { useUser } from "@/context/UserContext";
import {
  combineDateAndTime,
  formatDateKey,
  formatTimeKey,
} from "@/lib/date-utils";
import {
  loadEditableMeal,
  updateExistingMealRecord,
} from "@/lib/features/meals/application/meal-editor-service";
import { logError } from "@/lib/logging";
import {
  hasMealParticipants,
  toggleMealParticipant,
} from "@/lib/modules/meals/domain/meal-form";
import { MEAL_IMAGE_INPUT_ACCEPT } from "@/lib/modules/meals/domain/meal-image-policy";
import { toMealUpdateErrorMessage } from "@/lib/modules/meals/ui/meal-error-messages";
import type { Meal, UserRole } from "@/lib/types";

type SubmitPhase = "idle" | "uploading" | "saving";

export const useEditMealPageController = () => {
  const { userProfile, loading: authLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const mealId = params.id as string;
  const { showToast } = useToast();
  const currentUid = userProfile?.uid;
  const currentRole = userProfile?.role;

  const [description, setDescription] = useState("");
  const [type, setType] = useState<Meal["type"]>("점심");
  const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
  const [recordDateValue, setRecordDateValue] = useState("");
  const [recordTimeValue, setRecordTimeValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [mealLoading, setMealLoading] = useState(true);
  const [requiresLegacyMigration, setRequiresLegacyMigration] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadRequestSequenceRef = useRef(0);
  const showToastRef = useRef(showToast);
  const imageSelection = useMealImageSelection();
  const { setRemoteImage } = imageSelection;

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentRole) {
      router.replace("/");
      return;
    }

    let active = true;
    const requestId = ++loadRequestSequenceRef.current;
    setMealLoading(true);

    const loadMeal = async () => {
      try {
        const {
          meal,
          selectedUsers: nextSelectedUsers,
          requiresLegacyMigration: nextRequiresLegacyMigration,
        } = await loadEditableMeal({
          mealId,
          currentUid,
          currentRole,
        });
        if (!active || requestId !== loadRequestSequenceRef.current) {
          return;
        }
        if (!meal) {
          showToastRef.current("해당 기록을 찾을 수 없습니다.", "error");
          router.push("/");
          return;
        }

        setDescription(meal.description);
        setType(meal.type);
        const mealDate = new Date(meal.timestamp);
        setRecordDateValue(formatDateKey(mealDate));
        setRecordTimeValue(formatTimeKey(mealDate));
        setRemoteImage(meal.imageUrl || null);
        setSelectedUsers(nextSelectedUsers);
        setRequiresLegacyMigration(nextRequiresLegacyMigration);
      } catch (error) {
        if (!active || requestId !== loadRequestSequenceRef.current) {
          return;
        }
        logError("Failed to load meal", error);
        showToastRef.current(
          error instanceof Error ? error.message : "기록을 불러오지 못했습니다.",
          "error"
        );
        router.push("/");
      } finally {
        if (active && requestId === loadRequestSequenceRef.current) {
          setMealLoading(false);
        }
      }
    };

    void loadMeal();

    return () => {
      active = false;
    };
  }, [authLoading, currentRole, currentUid, mealId, router, setRemoteImage]);

  const handleClearImage = () => {
    imageSelection.clearImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await imageSelection.selectFile(file);
      if (!result.ok) {
        showToast(result.error.message, "error");
      } else if (result.warningMessage) {
        showToast(result.warningMessage, "error");
      }
    } catch (error) {
      logError("Failed to prepare meal image preview", error);
      showToast("미리보기를 준비하지 못했습니다. 다시 시도해 주세요.", "error");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (requiresLegacyMigration) {
      showToast("등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다.", "error");
      return;
    }
    const normalizedDescription = description.trim();
    if (!normalizedDescription) {
      showToast("설명을 입력해 주세요.", "error");
      return;
    }
    if (normalizedDescription.length > 300) {
      showToast("설명은 300자 이하로 입력해 주세요.", "error");
      return;
    }
    if (!hasMealParticipants(selectedUsers)) {
      showToast("함께 먹은 사람을 1명 이상 선택해 주세요.", "error");
      return;
    }
    const nextRecordDate = combineDateAndTime(recordDateValue, recordTimeValue);
    if (!nextRecordDate) {
      showToast("날짜와 시간을 올바르게 입력해 주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateExistingMealRecord({
        mealId,
        selectedUsers,
        description: normalizedDescription,
        type,
        recordDate: nextRecordDate,
        imageFile: imageSelection.imageFile,
        imagePreview: imageSelection.imagePreview,
        onPhaseChange: (phase) => setSubmitPhase(phase),
      });

      showToast("수정되었습니다.", "success");
      router.push(`/?date=${formatDateKey(nextRecordDate)}`);
      router.refresh();
    } catch (error) {
      logError("Failed to update meal", error);
      const step = submitPhase === "uploading" ? "upload" : "save";
      showToast(toMealUpdateErrorMessage(error, step), "error");
    } finally {
      setIsSubmitting(false);
      setSubmitPhase("idle");
    }
  };

  return {
    canRender: Boolean(currentRole),
    description,
    fileInputRef,
    handleClearImage,
    handleImageChange,
    handleSubmit,
    imageSelection,
    inputAccept: MEAL_IMAGE_INPUT_ACCEPT,
    isLoading: authLoading || mealLoading,
    isSubmitting,
    onRecordDateChange: setRecordDateValue,
    onRecordTimeChange: setRecordTimeValue,
    previewStatusMessage: imageSelection.previewUnavailable
      ? imageSelection.isLocalImage
        ? "미리보기를 표시하지 못했습니다. 업로드 시 서버에서 변환을 시도합니다."
        : "저장된 이미지를 표시하지 못했습니다."
      : null,
    recordDateValue,
    recordTimeValue,
    requiresLegacyMigration,
    selectedUsers,
    setDescription,
    setType,
    submitLabel:
      submitPhase === "uploading"
        ? "사진 업로드 중..."
        : submitPhase === "saving"
          ? "저장 중..."
          : null,
    toggleSelectedUser: (role: UserRole) =>
      setSelectedUsers((prev) => toggleMealParticipant(prev, role)),
    type,
  };
};
