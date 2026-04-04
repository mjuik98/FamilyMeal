"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Send } from "lucide-react";

import { useMealImageSelection } from "@/components/hooks/useMealImageSelection";
import PageHeader from "@/components/PageHeader";
import SurfaceSection from "@/components/SurfaceSection";
import { useToast } from "@/components/Toast";
import { useUser } from "@/context/UserContext";
import { addMeal } from "@/lib/client/meals";
import { formatDateKey, parseDateKey } from "@/lib/date-utils";
import { MEAL_IMAGE_INPUT_ACCEPT } from "@/lib/meal-image-policy";
import { USER_ROLES, VALID_MEAL_TYPES } from "@/lib/domain/meal-policy";
import { logError } from "@/lib/logging";
import { getMealDraftDefaults, saveMealDraftDefaults } from "@/lib/meal-draft";
import { buildAutoMealDescription } from "@/lib/meal-copy";
import { toMealCreateErrorMessage } from "@/lib/meal-errors";
import { hasMealParticipants, readMealImageDataUrl, toggleMealParticipant } from "@/lib/meal-form";
import { isQaRuntimeActive, saveQaMeal } from "@/lib/qa/runtime";
import { Meal, UserRole } from "@/lib/types";
import { cleanupUploadedMealImage, uploadImage } from "@/lib/uploadImage";

const getQaAnchorDate = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + (6 - date.getDay()));
  return date;
};

function AddMealPageContent() {
  const { userProfile, loading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

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
      (isQaRuntimeActive() ? getQaAnchorDate() : new Date()),
    [searchParams]
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await imageSelection.selectFile(file);
    if (!result.ok) {
      showToast(result.error.message, "error");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
      const timestamp = recordDate.getTime();
      const cleanupUploadedImage = async (imageUrl: string | null) => {
        if (!imageUrl) {
          return;
        }

        try {
          await cleanupUploadedMealImage(imageUrl);
        } catch (cleanupError) {
          logError("Failed to cleanup uploaded meal image after save error", cleanupError);
        }
      };

      if (isQaRuntimeActive()) {
        setSubmitPhase("saving");
        const qaImageUrl = await readMealImageDataUrl(imageSelection.imageFile);
        saveQaMeal({
          id: `qa-custom-${Date.now()}`,
          ownerUid: userProfile.uid,
          userIds: selectedUsers,
          description: normalizedDescription,
          type,
          imageUrl: qaImageUrl,
          timestamp,
          commentCount: 0,
          comments: [],
          reactions: {},
        });
      } else {
        let imageUrl = "";
        let uploadedImageUrl: string | null = null;
        try {
          setSubmitPhase("uploading");
          uploadedImageUrl = await uploadImage(imageSelection.imageFile);
          imageUrl = uploadedImageUrl;
        } catch (error) {
          logError("Failed to upload meal image", error);
          showToast(toMealCreateErrorMessage(error, "upload"), "error");
          return;
        }

        try {
          setSubmitPhase("saving");
          await addMeal({
            ownerUid: userProfile.uid,
            userIds: selectedUsers,
            description: normalizedDescription,
            type,
            imageUrl,
            timestamp,
            commentCount: 0,
            reactions: {},
          });
        } catch (error) {
          await cleanupUploadedImage(uploadedImageUrl);
          logError("Failed to save meal document", error);
          showToast(toMealCreateErrorMessage(error, "save"), "error");
          return;
        }
      }

      showToast("식사 기록이 저장되었습니다.", "success");
      router.push(`/?date=${formatDateKey(recordDate)}`);
      router.refresh();
    } catch (error) {
      logError("Failed to add meal", error);
      showToast(toMealCreateErrorMessage(error, "save"), "error");
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
          <SurfaceSection
            title="사진"
            caption="설명은 비워둬도 됩니다. 사진을 올리면 자동 문구로 바로 저장할 수 있어요."
            actions={
              imageSelection.imagePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    imageSelection.clearImage();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="link-button"
                >
                  삭제
                </button>
              ) : undefined
            }
            bodyClassName=""
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="media-picker"
            >
              {imageSelection.imagePreview && !imageSelection.previewUnavailable ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSelection.imagePreview}
                  alt="Preview"
                  className="media-preview"
                  onError={() => imageSelection.markPreviewUnavailable()}
                />
              ) : (
                <div className="media-placeholder">
                  <Camera size={36} strokeWidth={1.5} />
                  <span style={{ fontSize: "0.85rem" }}>
                    {imageSelection.previewUnavailable
                      ? "미리보기를 표시하지 못했습니다"
                      : "눌러서 식사 사진 추가"}
                  </span>
                </div>
              )}
            </button>
            {imageSelection.localImageSummary ? (
              <p className="surface-note" style={{ marginTop: "10px" }}>
                {imageSelection.localImageSummary} · 업로드 시 서버에서 자동 최적화됩니다.
              </p>
            ) : null}
            {imageSelection.previewUnavailable ? (
              <p className="surface-note" style={{ marginTop: "8px", color: "var(--danger)" }}>
                미리보기를 표시하지 못했습니다. 업로드 시 서버에서 변환을 시도합니다.
              </p>
            ) : null}
            {imageSelection.validationError ? (
              <p className="surface-note" style={{ marginTop: "8px", color: "var(--danger)" }}>
                {imageSelection.validationError.message}
              </p>
            ) : null}
          </SurfaceSection>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(event) => {
              void handleImageChange(event);
            }}
            accept={MEAL_IMAGE_INPUT_ACCEPT}
            style={{ display: "none" }}
            data-testid="add-photo-input"
          />

          <SurfaceSection title="식사 정보" bodyClassName="surface-body form-stack">
              <div>
                <label className="form-label">식사 종류</label>
                <div className="chip-group">
                  {VALID_MEAL_TYPES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`chip-button${type === value ? " chip-button-active" : ""}`}
                      data-testid={`add-meal-type-${value}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">함께 먹은 사람</label>
                <div className="chip-group">
                  {USER_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedUsers((prev) => toggleMealParticipant(prev, role))}
                      className={`chip-button${selectedUsers.includes(role) ? " chip-button-active" : ""}`}
                      data-testid={`add-meal-user-${role}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`${autoDescription}처럼 자동으로 저장돼요`}
                  maxLength={300}
                  className="input-base textarea-base"
                  style={{
                    width: "100%",
                    minHeight: "116px",
                    padding: "14px 14px 16px",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
                <p className="surface-note" style={{ marginTop: "8px" }}>
                  비워두면 <strong>{autoDescription}</strong> 문구로 저장됩니다.
                </p>
              </div>
          </SurfaceSection>

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
