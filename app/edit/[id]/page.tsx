"use client";

import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { MealDetailsSection } from "@/components/meal-editor/MealDetailsSection";
import { MealImageField } from "@/components/meal-editor/MealImageField";
import PageHeader from "@/components/PageHeader";
import {
  useEditMealPageController,
} from "@/lib/modules/meals/ui/useEditMealPageController";

export default function EditMealPage() {
  const router = useRouter();
  const controller = useEditMealPageController();

  if (!controller.canRender && !controller.isLoading) return null;

  if (controller.isLoading) {
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

        {controller.requiresLegacyMigration && (
          <div className="surface-card empty-state">
            <p className="empty-state-copy">
              등록 이전 기록은 소유자 이전 작업 후 수정할 수 있습니다.
            </p>
          </div>
        )}

        <form onSubmit={(event) => void controller.handleSubmit(event)} className="form-stack">
          <MealImageField
            disabled={controller.requiresLegacyMigration}
            emptyStateLabel="눌러서 사진 추가"
            fileInputRef={controller.fileInputRef}
            imagePreview={controller.imageSelection.imagePreview}
            inputAccept={controller.inputAccept}
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
            dateTimeFields={
              <div>
                <label className="form-label">언제 먹었나요</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={controller.recordDateValue}
                    onChange={(event) =>
                      controller.onRecordDateChange(event.target.value)
                    }
                    required
                    disabled={controller.requiresLegacyMigration}
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
                    value={controller.recordTimeValue}
                    onChange={(event) =>
                      controller.onRecordTimeChange(event.target.value)
                    }
                    required
                    disabled={controller.requiresLegacyMigration}
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
            description={controller.description}
            descriptionPlaceholder="어떤 식사를 했는지 적어주세요"
            descriptionRequired
            disabled={controller.requiresLegacyMigration}
            onDescriptionChange={controller.setDescription}
            onToggleUser={controller.toggleSelectedUser}
            onTypeChange={controller.setType}
            selectedUsers={controller.selectedUsers}
            type={controller.type}
          />

          <div className="form-actions">
            <button type="button" onClick={() => router.back()} className="secondary-button">
              취소
            </button>
            <button
              type="submit"
              disabled={
                controller.isSubmitting ||
                controller.requiresLegacyMigration ||
                controller.selectedUsers.length === 0
              }
              className="primary-button"
            >
              {controller.submitLabel ?? <><Save size={18} /> 수정 완료</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
