"use client";

import { Suspense } from "react";
import { Send } from "lucide-react";

import { MealDetailsSection } from "@/components/meal-editor/MealDetailsSection";
import { MealImageField } from "@/components/meal-editor/MealImageField";
import PageHeader from "@/components/PageHeader";
import {
  useAddMealPageController,
} from "@/lib/modules/meals/ui/useAddMealPageController";

function AddMealPageContent() {
  const controller = useAddMealPageController();

  if (controller.loading) {
    return (
      <div className="loading-shell">
        <div className="spinner" />
      </div>
    );
  }

  if (!controller.canRender) return null;

  return (
    <div className="page-shell">
      <div className="page-stack">
        <PageHeader title="새 식사 기록" subtitle="사진 한 장과 식사 종류만 있으면 바로 저장할 수 있어요." />

        <form onSubmit={(event) => void controller.handleSubmit(event)} className="form-stack">
          <MealImageField
            caption="설명은 비워둬도 됩니다. 사진을 올리면 자동 문구로 바로 저장할 수 있어요."
            emptyStateLabel="눌러서 식사 사진 추가"
            fileInputRef={controller.fileInputRef}
            imagePreview={controller.imageSelection.imagePreview}
            inputAccept={controller.inputAccept}
            inputTestId="add-photo-input"
            localImageSummary={controller.imageSelection.localImageSummary}
            onClearImage={controller.handleClearImage}
            onImageChange={(event) => {
              void controller.handleImageChange(event);
            }}
            onPreviewError={() => controller.imageSelection.markPreviewUnavailable()}
            previewUnavailable={controller.imageSelection.previewUnavailable}
            previewStatusMessage={controller.previewStatusMessage}
            validationError={controller.imageSelection.validationError}
          />

          <MealDetailsSection
            description={controller.description}
            descriptionNote={
              <>
                비워두면 <strong>{controller.autoDescription}</strong> 문구로 저장됩니다.
              </>
            }
            descriptionPlaceholder={`${controller.autoDescription}처럼 자동으로 저장돼요`}
            onDescriptionChange={controller.setDescription}
            onToggleUser={controller.toggleSelectedUser}
            onTypeChange={controller.setType}
            selectedUsers={controller.selectedUsers}
            testIdPrefix="add"
            type={controller.type}
          />

          <div className="surface-row" style={{ gap: "10px", alignItems: "stretch" }}>
            <button
              type="button"
              disabled={
                controller.isSubmitting ||
                !controller.imageSelection.imageFile ||
                controller.selectedUsers.length === 0
              }
              className="secondary-button"
              onClick={() => void controller.persistMeal()}
              data-testid="add-quick-save"
              style={{ flex: 1 }}
            >
              {controller.submitLabel ?? "사진만 저장"}
            </button>
            <button
              type="submit"
              disabled={
                controller.isSubmitting ||
                !controller.imageSelection.imageFile ||
                controller.selectedUsers.length === 0
              }
              className="primary-button"
              style={{ flex: 1 }}
            >
              {controller.submitLabel ?? <><Send size={18} /> 설명까지 저장</>}
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
