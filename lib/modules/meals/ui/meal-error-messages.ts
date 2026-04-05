import { getErrorCode } from "@/lib/platform/errors/error-contract";

const isAuthError = (code: string | null): boolean =>
  code === "not_authenticated" ||
  code === "missing_bearer_token" ||
  code === "empty_bearer_token" ||
  code === "auth_token_expired" ||
  code === "invalid_auth_token";

const toUploadFailureMessage = (code: string | null): string => {
  if (isAuthError(code)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (code === "unsupported_image_type") {
    return "사진 업로드에 실패했습니다. 지원하지 않는 이미지 형식입니다.";
  }
  if (code === "image_payload_too_large" || code === "payload_too_large") {
    return "사진 업로드에 실패했습니다. 이미지 용량이 너무 큽니다.";
  }
  if (code === "image_normalization_failed") {
    return "사진 업로드에 실패했습니다. 이미지를 처리할 수 없는 형식입니다.";
  }
  if (code === "storage_bucket_not_configured") {
    return "사진 업로드에 실패했습니다. 저장소 설정을 확인해 주세요.";
  }
  return "사진 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";
};

const toCreateFailureMessage = (code: string | null): string => {
  if (isAuthError(code)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (code === "valid_user_role_required") {
    return "프로필에서 가족 역할을 먼저 선택해 주세요.";
  }
  if (code === "meal_participants_must_include_your_role") {
    return "함께 먹은 사람에 본인을 포함해 주세요.";
  }
  return "식사 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
};

const toUpdateFailureMessage = (code: string | null): string => {
  if (isAuthError(code)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (code === "meal_not_found") {
    return "수정할 식사 기록을 찾지 못했습니다.";
  }
  if (code === "legacy_meal_requires_migration") {
    return "기존 기록이라 아직 수정할 수 없습니다. 소유자 이전 작업 후 다시 시도해 주세요.";
  }
  if (code === "not_allowed") {
    return "작성자만 수정할 수 있습니다.";
  }
  if (code === "valid_user_role_required") {
    return "프로필에서 가족 역할을 먼저 선택해 주세요.";
  }
  return "식사 기록 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.";
};

export const toMealDeleteErrorMessage = (error: unknown): string => {
  const code = getErrorCode(error);
  if (isAuthError(code)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (code === "legacy_meal_requires_migration") {
    return "기존 기록이라 아직 삭제할 수 없습니다. 소유자 이전 작업 후 다시 시도해 주세요.";
  }
  if (code === "not_allowed") {
    return "작성자만 삭제할 수 있습니다.";
  }
  if (code === "meal_not_found") {
    return "삭제할 식사 기록을 찾지 못했습니다.";
  }
  if (code === "unexpected_delete_status") {
    return "삭제 상태를 확인하지 못했습니다.";
  }
  return "삭제에 실패했습니다.";
};

export const toMealCreateErrorMessage = (
  error: unknown,
  stage: "upload" | "save" = "save"
): string => {
  const code = getErrorCode(error);
  return stage === "upload"
    ? toUploadFailureMessage(code)
    : toCreateFailureMessage(code);
};

export const toMealUpdateErrorMessage = (
  error: unknown,
  stage: "upload" | "save" = "save"
): string => {
  const code = getErrorCode(error);
  return stage === "upload"
    ? toUploadFailureMessage(code)
    : toUpdateFailureMessage(code);
};
