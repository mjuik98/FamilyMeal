"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { useMealImageSelection } from "@/components/hooks/useMealImageSelection";
import { MealDetailsSection } from "@/components/meal-editor/MealDetailsSection";
import { MealImageField } from "@/components/meal-editor/MealImageField";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useUser } from "@/context/UserContext";
import { combineDateAndTime, formatDateKey, formatTimeKey } from "@/lib/date-utils";
import {
  loadEditableMeal,
  updateExistingMealRecord,
} from "@/lib/features/meals/application/meal-editor-service";
import { MEAL_IMAGE_INPUT_ACCEPT } from "@/lib/meal-image-policy";
import { logError } from "@/lib/logging";
import { toMealUpdateErrorMessage } from "@/lib/meal-errors";
import { hasMealParticipants, toggleMealParticipant } from "@/lib/meal-form";
import { Meal, UserRole } from "@/lib/types";

export default function EditMealPage() {
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
  const [submitPhase, setSubmitPhase] = useState<"idle" | "uploading" | "saving">("idle");
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

  if (!authLoading && !currentRole) return null;

  const submissionLabel =
    submitPhase === "uploading" ? "사진 업로드 중..." : submitPhase === "saving" ? "저장 중..." : null;
  const previewStatusMessage = imageSelection.previewUnavailable
    ? imageSelection.isLocalImage
      ? "미리보기를 표시하지 못했습니다. 업로드 시 서버에서 변환을 시도합니다."
      : "저장된 이미지를 표시하지 못했습니다."
    : null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // legacy meals require owner migration before the server allows mutation
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
        onPhaseChange: setSubmitPhase,
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

  if (authLoading || mealLoading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader
          title="기록 수정하기"
          subtitle="기록된 내용을 같은 화면 패턴 안에서 깔끔하게 수정합니다."
        />

        {requiresLegacyMigration && (
          <div className="surface-card empty-state">
            <p className="empty-state-copy">
              등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          <MealImageField
            disabled={requiresLegacyMigration}
            emptyStateLabel="눌러서 사진 추가"
            fileInputRef={fileInputRef}
            imagePreview={imageSelection.imagePreview}
            inputAccept={MEAL_IMAGE_INPUT_ACCEPT}
            localImageSummary={imageSelection.localImageSummary}
            onClearImage={handleClearImage}
            onImageChange={(event) => {
              void handleImageChange(event);
            }}
            onPreviewError={() => imageSelection.markPreviewUnavailable()}
            previewUnavailable={imageSelection.previewUnavailable}
            previewStatusMessage={previewStatusMessage}
            validationError={imageSelection.validationError}
          />

          <MealDetailsSection
            dateTimeFields={
              <div>
                <label className="form-label">언제 먹었나요</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={recordDateValue}
                    onChange={(e) => setRecordDateValue(e.target.value)}
                    required
                    disabled={requiresLegacyMigration}
                    className="input-base"
                    data-testid="edit-meal-date-input"
                    style={{
                      flex: "1 1 220px",
                      minHeight: "48px",
                      borderRadius: "14px",
                      padding: "0 14px",
                      outline: "none",
                    }}
                  />
                  <input
                    type="time"
                    value={recordTimeValue}
                    onChange={(e) => setRecordTimeValue(e.target.value)}
                    required
                    disabled={requiresLegacyMigration}
                    className="input-base"
                    data-testid="edit-meal-time-input"
                    style={{
                      flex: "1 1 160px",
                      minHeight: "48px",
                      borderRadius: "14px",
                      padding: "0 14px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            }
            description={description}
            descriptionPlaceholder="어떤 식사를 했는지 적어주세요"
            descriptionRequired
            disabled={requiresLegacyMigration}
            onDescriptionChange={setDescription}
            onToggleUser={(role) =>
              setSelectedUsers((prev) => toggleMealParticipant(prev, role))
            }
            onTypeChange={setType}
            selectedUsers={selectedUsers}
            type={type}
          />

          <div className="form-actions">
            <button type="button" onClick={() => router.back()} className="secondary-button">
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || requiresLegacyMigration || !hasMealParticipants(selectedUsers)}
              className="primary-button"
            >
              {submissionLabel ?? <><Save size={18} /> 수정 완료</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
