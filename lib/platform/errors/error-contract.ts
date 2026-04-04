const KNOWN_ERROR_CODES: Record<string, string> = {
  "Auth token expired": "auth_token_expired",
  "Comment not found": "comment_not_found",
  "Email is not allowed": "email_not_allowed",
  "Empty bearer token": "empty_bearer_token",
  "Image normalization failed": "image_normalization_failed",
  "Image payload is empty": "image_payload_empty",
  "Image payload is too large": "image_payload_too_large",
  "Invalid archive cursor": "invalid_archive_cursor",
  "Invalid archive query": "invalid_archive_query",
  "Invalid auth token": "invalid_auth_token",
  "Invalid comment id": "invalid_comment_id",
  "Invalid JSON body": "invalid_json_body",
  "Invalid meal date": "invalid_meal_date",
  "Invalid meal id": "invalid_meal_id",
  "Invalid meal image URL": "invalid_meal_image_url",
  "Invalid payload": "invalid_payload",
  "Legacy meals must be migrated before mutation": "legacy_meal_requires_migration",
  "Meal not found": "meal_not_found",
  "Meal participants must include your role": "meal_participants_must_include_your_role",
  "Missing bearer token": "missing_bearer_token",
  "Nested replies are not supported": "nested_replies_not_supported",
  "Not allowed": "not_allowed",
  "Not authenticated": "not_authenticated",
  "Parent comment not found": "parent_comment_not_found",
  "Reply comments exist": "reply_comments_exist",
  "Role is locked. Contact admin to change it.": "role_locked",
  "Server allowlist is not configured": "server_allowlist_not_configured",
  "Server auth is not configured": "server_auth_not_configured",
  "Server Firebase project mismatch": "server_firebase_project_mismatch",
  "Storage bucket is not configured": "storage_bucket_not_configured",
  "Unexpected delete status": "unexpected_delete_status",
  "Unsupported image type": "unsupported_image_type",
  "User profile is required": "user_profile_required",
  "Valid user role is required": "valid_user_role_required",
  "internal error": "internal_error",
  "invalid json": "invalid_json",
  "payload too large": "payload_too_large",
  "rate limit exceeded": "rate_limit_exceeded",
};

const sanitizeCode = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

export const normalizeErrorCode = (
  message: string,
  fallback = "request_failed"
): string => {
  const known = KNOWN_ERROR_CODES[message];
  if (known) {
    return known;
  }

  const sanitized = sanitizeCode(message);
  return sanitized || fallback;
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message.trim() : "";

export const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const rawCode = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (typeof rawCode === "string" && rawCode.trim().length > 0) {
    return normalizeErrorCode(rawCode, "request_failed");
  }

  const message = getErrorMessage(error);
  return message ? normalizeErrorCode(message, "request_failed") : null;
};
