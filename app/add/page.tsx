"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send } from "lucide-react";

import { useMealImageSelection } from "@/components/hooks/useMealImageSelection";
import { MealDetailsSection } from "@/components/meal-editor/MealDetailsSection";
import { MealImageField } from "@/components/meal-editor/MealImageField";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useUser } from "@/context/UserContext";
import { formatDateKey, parseDateKey } from "@/lib/date-utils";
import { createMealRecord } from "@/lib/features/meals/application/meal-editor-service";
import { createMealRuntimeState } from "@/lib/features/meals/application/meal-read-service";
import { MEAL_IMAGE_INPUT_ACCEPT } from "@/lib/meal-image-policy";
import { logError } from "@/lib/logging";
import { getMealDraftDefaults, saveMealDraftDefaults } from "@/lib/meal-draft";
import { buildAutoMealDescription } from "@/lib/meal-copy";
import { toMealCreateErrorMessage } from "@/lib/meal-errors";
import { hasMealParticipants, toggleMealParticipant } from "@/lib/meal-form";
import { Meal, UserRole } from "@/lib/types";

function AddMealPageContent() {
  const { userProfile, loading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [runtimeState] = useState(() => createMealRuntimeState());

  const [description, setDescription] = useState("");
  const [type, setType] = useState<Meal["type"]>("점심");
  const [selectedUsers, setSelectedUsers] = useState<UserRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [draftReady, setDraftReady] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageSelection = useMealImageSelection();
  const recordDate = useMemo(
    () =>
      parseDateKey(searchParams.get("date")) ??
      (runtimeState.qaMode ? runtimeState.qaAnchorDate : new Date()),
    [runtimeState, searchParams]
  );
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
    setSelectedUsers(defaults.participantIds.length > 0 ? defaults.participantIds : [userProfile.role]);
    setDraftReady(true);
  }, [draftReady, loading, router, userProfile?.role]);

  useEffect(() => {
    if (!draftReady || selectedUsers.length === 0) return;
    saveMealDraftDefaults({
      mealType: type,
      participantIds: selectedUsers,
    });
  }, [draftReady, selectedUsers, type]);

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!userProfile?.role) return null;

  const submissionLabel =
    submitPhase === "uploading" ? "사진 업로드 중..." : submitPhase === "saving" ? "저장 중..." : null;
  const handleClearImage = () => {
    imageSelection.clearImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    setIsSubmitting(true);
    try {
      await createMealRecord({
        userUid: userProfile.uid,
        selectedUsers,
        description: normalizedDescription,
        autoDescription,
        type,
        imageFile: imageSelection.imageFile,
        recordDate,
        runtimeState,
        onPhaseChange: setSubmitPhase,
      });

      showToast("식사 기록이 저장되었습니다.", "success");
      router.push(`/?date=${formatDateKey(recordDate)}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistMeal();
  };

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader title="새 식사 기록" subtitle="사진 한 장과 식사 종류만 있으면 바로 저장할 수 있어요." />

        <form onSubmit={handleSubmit} className="form-stack">
          <MealImageField
            caption="설명은 비워둬도 됩니다. 사진을 올리면 자동 문구로 바로 저장할 수 있어요."
            emptyStateLabel="눌러서 식사 사진 추가"
            fileInputRef={fileInputRef}
            imagePreview={imageSelection.imagePreview}
            inputAccept={MEAL_IMAGE_INPUT_ACCEPT}
            inputTestId="add-photo-input"
            localImageSummary={imageSelection.localImageSummary}
            onClearImage={handleClearImage}
            onImageChange={(event) => {
              void handleImageChange(event);
            }}
            onPreviewError={() => imageSelection.markPreviewUnavailable()}
            previewUnavailable={imageSelection.previewUnavailable}
            previewStatusMessage={
              imageSelection.previewUnavailable
                ? "미리보기를 표시하지 못했습니다. 업로드 시 서버에서 변환을 시도합니다."
                : null
            }
            validationError={imageSelection.validationError}
          />

          <MealDetailsSection
            description={description}
            descriptionNote={
              <>
                비워두면 <strong>{autoDescription}</strong> 문구로 저장됩니다.
              </>
            }
            descriptionPlaceholder={`${autoDescription}처럼 자동으로 저장돼요`}
            onDescriptionChange={setDescription}
            onToggleUser={(role) =>
              setSelectedUsers((prev) => toggleMealParticipant(prev, role))
            }
            onTypeChange={setType}
            selectedUsers={selectedUsers}
            testIdPrefix="add"
            type={type}
          />

          <div className="surface-row" style={{ gap: "10px", alignItems: "stretch" }}>
            <button
              type="button"
              disabled={isSubmitting || !imageSelection.imageFile || !hasMealParticipants(selectedUsers)}
              className="secondary-button"
              onClick={() => void persistMeal()}
              data-testid="add-quick-save"
              style={{ flex: 1 }}
            >
              {submissionLabel ?? "사진만 저장"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !imageSelection.imageFile || !hasMealParticipants(selectedUsers)}
              className="primary-button"
              style={{ flex: 1 }}
            >
              {submissionLabel ?? <><Send size={18} /> 설명까지 저장</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddMealPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-shell">
          <div className="spinner" />
        </div>
      }
    >
      <AddMealPageContent />
    </Suspense>
  );
}
