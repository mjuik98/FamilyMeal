export const ALLOWED_MEAL_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const MAX_MEAL_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_MEAL_IMAGE_REQUEST_BYTES = MAX_MEAL_IMAGE_UPLOAD_BYTES + 1024 * 1024;
export const MAX_MEAL_IMAGE_DIMENSION = 1600;
export const NORMALIZED_MEAL_IMAGE_QUALITY = 82;
export const MEAL_IMAGE_INPUT_ACCEPT = ALLOWED_MEAL_IMAGE_TYPES.join(",");

const ALLOWED_MEAL_IMAGE_TYPE_SET = new Set<string>(ALLOWED_MEAL_IMAGE_TYPES);

export type MealImageValidationError = {
  code: "invalid_type" | "file_too_large";
  message: string;
};

const formatTypeLabel = (type: string): string => {
  if (type === "image/jpeg") return "JPG";
  if (type === "image/png") return "PNG";
  if (type === "image/webp") return "WEBP";
  if (type === "image/heic") return "HEIC";
  if (type === "image/heif") return "HEIF";
  return "이미지";
};

export const formatMealImageFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
};

export const formatMealImageFileSummary = (
  file: Pick<File, "type" | "size">
): string => `${formatTypeLabel(file.type)} · ${formatMealImageFileSize(file.size)}`;

export const validateMealImageFile = (
  file: Pick<File, "type" | "size"> | null | undefined
): MealImageValidationError | null => {
  if (!file || !ALLOWED_MEAL_IMAGE_TYPE_SET.has(file.type)) {
    return {
      code: "invalid_type",
      message: "지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP, HEIC, HEIF 파일만 업로드할 수 있습니다.",
    };
  }

  if (file.size > MAX_MEAL_IMAGE_UPLOAD_BYTES) {
    return {
      code: "file_too_large",
      message: `이미지 용량이 너무 큽니다. ${formatMealImageFileSize(MAX_MEAL_IMAGE_UPLOAD_BYTES)} 이하 파일만 업로드할 수 있습니다.`,
    };
  }

  return null;
};
