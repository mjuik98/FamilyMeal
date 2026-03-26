const getMessage = (error: unknown): string =>
  error instanceof Error ? error.message.trim() : "";

const isAuthError = (message: string): boolean =>
  message === "Not authenticated" ||
  message === "Missing bearer token" ||
  message === "Empty bearer token" ||
  message === "Auth token expired" ||
  message === "Invalid auth token";

const toUploadFailureMessage = (message: string): string => {
  if (isAuthError(message)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (message.includes("Unsupported image type")) {
    return "사진 업로드에 실패했습니다. 지원하지 않는 이미지 형식입니다.";
  }
  if (message.includes("too large")) {
    return "사진 업로드에 실패했습니다. 이미지 용량이 너무 큽니다.";
  }
  if (message.includes("Storage bucket is not configured")) {
    return "사진 업로드에 실패했습니다. 저장소 설정을 확인해 주세요.";
  }
  return "사진 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";
};

const toCreateFailureMessage = (message: string): string => {
  if (isAuthError(message)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (message.includes("Valid user role is required")) {
    return "프로필에서 가족 역할을 먼저 선택해 주세요.";
  }
  if (message.includes("Meal participants must include your role")) {
    return "함께 먹은 사람에 본인을 포함해 주세요.";
  }
  return "식사 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
};

const toUpdateFailureMessage = (message: string): string => {
  if (isAuthError(message)) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (message.includes("Meal not found")) {
    return "수정할 식사 기록을 찾지 못했습니다.";
  }
  if (message.includes("Not allowed")) {
    return "작성자만 수정할 수 있습니다.";
  }
  if (message.includes("Valid user role is required")) {
    return "프로필에서 가족 역할을 먼저 선택해 주세요.";
  }
  return "식사 기록 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.";
};

export const toMealCreateErrorMessage = (
  error: unknown,
  stage: "upload" | "save" = "save"
): string => {
  const message = getMessage(error);
  return stage === "upload" ? toUploadFailureMessage(message) : toCreateFailureMessage(message);
};

export const toMealUpdateErrorMessage = (
  error: unknown,
  stage: "upload" | "save" = "save"
): string => {
  const message = getMessage(error);
  return stage === "upload" ? toUploadFailureMessage(message) : toUpdateFailureMessage(message);
};
