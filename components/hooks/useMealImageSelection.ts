"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatMealImageFileSummary,
  type MealImageValidationError,
  validateMealImageFile,
} from "@/lib/meal-image-policy";
import {
  readMealImageDataUrl,
  readMealImagePreview,
  revokeMealImagePreview,
} from "@/lib/meal-form";

type MealImageSelectionResult =
  | { ok: true; warningMessage?: string }
  | { ok: false; error: MealImageValidationError };

const LOCAL_PREVIEW_UNAVAILABLE_MESSAGE =
  "미리보기를 표시하지 못했습니다. 업로드 시 서버에서 변환을 시도합니다.";

export const useMealImageSelection = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<MealImageValidationError | null>(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  const requestSequenceRef = useRef(0);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      revokeMealImagePreview(previewRef.current);
    },
    []
  );

  const localImageSummary = useMemo(() => {
    if (!imageFile) return null;
    return formatMealImageFileSummary(imageFile);
  }, [imageFile]);
  const prefersStablePreview = useMemo(() => {
    if (typeof navigator !== "object") {
      return false;
    }

    // Whale has shown unstable repaint behavior with blob preview URLs for local files.
    return /Whale\//i.test(navigator.userAgent);
  }, []);

  const clearImage = useCallback(() => {
    requestSequenceRef.current += 1;
    revokeMealImagePreview(previewRef.current);
    previewRef.current = null;
    setImagePreview(null);
    setImageFile(null);
    setValidationError(null);
    setPreviewUnavailable(false);
  }, []);

  const setRemoteImage = useCallback((nextImageUrl: string | null) => {
    requestSequenceRef.current += 1;
    revokeMealImagePreview(previewRef.current);
    previewRef.current = nextImageUrl;
    setImagePreview(nextImageUrl);
    setImageFile(null);
    setValidationError(null);
    setPreviewUnavailable(false);
  }, []);

  const selectFile = useCallback(async (file: File): Promise<MealImageSelectionResult> => {
    const nextValidationError = validateMealImageFile(file);
    if (nextValidationError) {
      if (imageFile) {
        clearImage();
      }
      setValidationError(nextValidationError);
      return {
        ok: false,
        error: nextValidationError,
      };
    }

    const requestId = ++requestSequenceRef.current;
    setValidationError(null);
    setPreviewUnavailable(false);

    let preview: string;
    try {
      preview = prefersStablePreview
        ? await readMealImageDataUrl(file)
        : await readMealImagePreview(file);
    } catch {
      if (requestId !== requestSequenceRef.current) {
        return {
          ok: true,
        };
      }

      revokeMealImagePreview(previewRef.current);
      previewRef.current = null;
      setImagePreview(null);
      setImageFile(file);
      setPreviewUnavailable(true);

      return {
        ok: true,
        warningMessage: LOCAL_PREVIEW_UNAVAILABLE_MESSAGE,
      };
    }

    if (requestId !== requestSequenceRef.current) {
      revokeMealImagePreview(preview);
      return {
        ok: true,
      };
    }

    revokeMealImagePreview(previewRef.current);
    previewRef.current = preview;
    setImagePreview(preview);
    setImageFile(file);

    return {
      ok: true,
    };
  }, [clearImage, imageFile, prefersStablePreview]);

  const markPreviewUnavailable = useCallback(() => {
    setPreviewUnavailable(true);
  }, []);

  return useMemo(
    () => ({
      clearImage,
      imageFile,
      imagePreview,
      isLocalImage: imageFile !== null,
      localImageSummary,
      markPreviewUnavailable,
      previewUnavailable,
      selectFile,
      setRemoteImage,
      validationError,
    }),
    [
      clearImage,
      imageFile,
      imagePreview,
      localImageSummary,
      markPreviewUnavailable,
      previewUnavailable,
      selectFile,
      setRemoteImage,
      validationError,
    ]
  );
};
