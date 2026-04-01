export const QA_MOCK_MODE_KEY = "familymeal:qa-mock-mode";
export const QA_NOTIFICATION_PREFS_KEY = "familymeal:qa-notification-prefs";
export const QA_ACTIVITY_READ_IDS_KEY = "familymeal:qa-activity-read-ids";
export const QA_CUSTOM_MEALS_KEY = "familymeal:qa-custom-meals";

export const readJsonFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJsonToStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};
