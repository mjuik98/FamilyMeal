"use client";

import type { ChangeEventHandler, ReactNode, RefObject } from "react";
import { Camera } from "lucide-react";

import SurfaceSection from "@/components/SurfaceSection";

type MealImageFieldProps = {
  caption?: ReactNode;
  disabled?: boolean;
  emptyStateLabel: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imagePreview: string | null;
  inputAccept: string;
  inputTestId?: string;
  localImageSummary: string | null;
  onClearImage: () => void;
  onImageChange: ChangeEventHandler<HTMLInputElement>;
  onPreviewError: () => void;
  previewUnavailable: boolean;
  previewStatusMessage?: string | null;
  validationError: { message: string } | null;
};

export function MealImageField({
  caption,
  disabled = false,
  emptyStateLabel,
  fileInputRef,
  imagePreview,
  inputAccept,
  inputTestId,
  localImageSummary,
  onClearImage,
  onImageChange,
  onPreviewError,
  previewUnavailable,
  previewStatusMessage,
  validationError,
}: MealImageFieldProps) {
  return (
    <>
      <SurfaceSection
        title="사진"
        caption={caption}
        actions={
          imagePreview ? (
            <button type="button" onClick={onClearImage} className="link-button">
              삭제
            </button>
          ) : undefined
        }
        bodyClassName=""
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="media-picker"
        >
          {imagePreview && !previewUnavailable ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Preview"
              className="media-preview"
              onError={onPreviewError}
            />
          ) : (
            <div className="media-placeholder">
              <Camera size={36} strokeWidth={1.5} />
              <span style={{ fontSize: "0.85rem" }}>
                {previewUnavailable ? "미리보기를 표시하지 못했습니다" : emptyStateLabel}
              </span>
            </div>
          )}
        </button>
        {localImageSummary ? (
          <p className="surface-note" style={{ marginTop: "10px" }}>
            {localImageSummary} · 업로드 시 서버에서 자동 최적화됩니다.
          </p>
        ) : null}
        {previewStatusMessage ? (
          <p className="surface-note" style={{ marginTop: "8px", color: "var(--danger)" }}>
            {previewStatusMessage}
          </p>
        ) : null}
        {validationError ? (
          <p className="surface-note" style={{ marginTop: "8px", color: "var(--danger)" }}>
            {validationError.message}
          </p>
        ) : null}
      </SurfaceSection>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageChange}
        disabled={disabled}
        accept={inputAccept}
        style={{ display: "none" }}
        data-testid={inputTestId}
      />
    </>
  );
}
