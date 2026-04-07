"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useUser } from "@/lib/modules/profile/ui/UserSessionProvider";
import { useToast } from "@/lib/platform/feedback/ToastProvider";
import {
  combineDateAndTime,
  formatDateKey,
  getMealFormDateTimeDefaults,
} from "@/lib/date-utils";
import { logError } from "@/lib/logging";
import { createMealRecord } from "@/lib/modules/meals/application/meal-editor-service";
import { createMealRuntimeState } from "@/lib/modules/meals/application/meal-read-service";
import {
  buildAutoMealDescription,
} from "@/lib/modules/meals/domain/meal-copy";
import {
  getMealDraftDefaults,
  saveMealDraftDefaults,
} from "@/lib/modules/meals/domain/meal-draft";
import {
  hasMealParticipants,
  toggleMealParticipant,
} from "@/lib/modules/meals/domain/meal-form";
import { MEAL_IMAGE_INPUT_ACCEPT } from "@/lib/modules/meals/domain/meal-image-policy";
import { toMealCreateErrorMessage } from "@/lib/modules/meals/ui/meal-error-messages";
import { useMealImageSelection } from "@/lib/modules/meals/ui/useMealImageSelection";
import type { Meal, UserRole } from "@/lib/types";

type SubmitPhase = "idle" | "uploading" | "saving";

export const useAddMealPageController = () => {
  const { userProfile, loading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [runtimeState] = useState(() => createMealRuntimeState());

  const [description, setDescription] = useState("");
  const [type, setType] = useState<Meal["type"]>("점심");
  const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [recordDateTime, setRecordDateTime] = useState(() =>
    getMealFormDateTimeDefaults(
      searchParams.get("date"),
      runtimeState.qaMode ? runtimeState.qaAnchorDate : new Date()
    )
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageSelection = useMealImageSelection();
  const autoDescription = useMemo(
    () => buildAutoMealDescription(type, selectedUsers),
    [selectedUsers, type]
  );

  useEffect(() => {
    if (loading) return;

    if (!userProfile?.role) {
      router.replace("/");
      return;
    }

    if (draftReady) return;

    const defaults = getMealDraftDefaults();
    setType(defaults.mealType);
    setSelectedUsers(
      defaults.participantIds.length > 0
        ? defaults.participantIds
        : [userProfile.role]
    );
    setDraftReady(true);
  }, [draftReady, loading, router, userProfile?.role]);

  useEffect(() => {
    if (!draftReady || selectedUsers.length === 0) return;
    saveMealDraftDefaults({
      mealType: type,
      participantIds: selectedUsers,
    });
  }, [draftReady, selectedUsers, type]);

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

  const persistMeal = async () => {
    if (!userProfile?.uid) return;
    if (!imageSelection.imageFile) {
      showToast("식사 사진을 먼저 추가해 주세요.", "error");
      return;
    }

    const normalizedDescription = description.trim() || autoDescription;
    if (normalizedDescription.length > 300) {
      showToast("설명은 300자 이하로 입력해 주세요.", "error");
      return;
    }
    if (!hasMealParticipants(selectedUsers)) {
      showToast("함께 먹은 사람을 1명 이상 선택해 주세요.", "error");
      return;
    }
    const nextRecordDate = combineDateAndTime(
      recordDateTime.recordDateValue,
      recordDateTime.recordTimeValue
    );
    if (!nextRecordDate) {
      showToast("날짜와 시간을 올바르게 입력해 주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await createMealRecord({
        userUid: userProfile.uid,
        selectedUsers,
        description: normalizedDescription,
        autoDescription,
        type,
        imageFile: imageSelection.imageFile,
        recordDate: nextRecordDate,
        runtimeState,
        onPhaseChange: (phase) => setSubmitPhase(phase),
      });

      showToast("식사 기록이 저장되었습니다.", "success");
      router.push(`/?date=${formatDateKey(nextRecordDate)}`);
      router.refresh();
    } catch (error) {
      logError("Failed to add meal", error);
      const step = submitPhase === "uploading" ? "upload" : "save";
      showToast(toMealCreateErrorMessage(error, step), "error");
    } finally {
      setIsSubmitting(false);
      setSubmitPhase("idle");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await persistMeal();
  };

  return {
    autoDescription,
    canRender: Boolean(userProfile?.role),
    description,
    draftReady,
    fileInputRef,
    handleClearImage,
    handleImageChange,
    handleSubmit,
    imageSelection,
    inputAccept: MEAL_IMAGE_INPUT_ACCEPT,
    isSubmitting,
    loading,
    onRecordDateChange: (value: string) =>
      setRecordDateTime((prev) => ({ ...prev, recordDateValue: value })),
    onRecordTimeChange: (value: string) =>
      setRecordDateTime((prev) => ({ ...prev, recordTimeValue: value })),
    persistMeal,
    previewStatusMessage: imageSelection.previewUnavailable
      ? "미리보기를 표시하지 못했습니다. 업로드 시 서버에서 변환을 시도합니다."
      : null,
    recordDateValue: recordDateTime.recordDateValue,
    recordTimeValue: recordDateTime.recordTimeValue,
    selectedUsers,
    setDescription,
    setSelectedUsers,
    setType,
    submitLabel:
      submitPhase === "uploading"
        ? "사진 업로드 중..."
        : submitPhase === "saving"
          ? "저장 중..."
          : null,
    type,
    toggleSelectedUser: (role: UserRole) =>
      setSelectedUsers((prev) => toggleMealParticipant(prev, role)),
  };
};
