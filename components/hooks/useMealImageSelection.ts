"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatMealImageFileSummary,
  type MealImageValidationError,
  validateMealImageFile,
} from "@/lib/meal-image-policy";
import { readMealImagePreview, revokeMealImagePreview } from "@/lib/meal-form";

type MealImageSelectionResult =
  | { ok: true }
  | { ok: false; error: MealImageValidationError };

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
      if (previewRef.current?.startsWith("blob:")) {
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

    const preview = await readMealImagePreview(file);
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
  }, [clearImage]);

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
