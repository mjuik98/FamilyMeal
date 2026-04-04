type PublicEnvKey =
  | "NEXT_PUBLIC_FIREBASE_API_KEY"
  | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  | "NEXT_PUBLIC_FIREBASE_APP_ID"
  | "NEXT_PUBLIC_ENABLE_PWA"
  | "NEXT_PUBLIC_ENABLE_QA"
  | "NEXT_PUBLIC_APP_VERSION";

const rawPublicEnv: Record<PublicEnvKey, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_ENABLE_PWA: process.env.NEXT_PUBLIC_ENABLE_PWA,
  NEXT_PUBLIC_ENABLE_QA: process.env.NEXT_PUBLIC_ENABLE_QA,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
};

const readOptionalPublicEnv = (key: PublicEnvKey): string | undefined => {
  const value = rawPublicEnv[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const readRequiredPublicEnv = (key: PublicEnvKey): string => {
  const value = readOptionalPublicEnv(key);
  if (!value) {
    throw new Error(`[env] Missing required NEXT_PUBLIC env var: ${key}`);
  }

  return value;
};

const readBooleanPublicEnv = (key: "NEXT_PUBLIC_ENABLE_PWA" | "NEXT_PUBLIC_ENABLE_QA"): boolean => {
  const value = readOptionalPublicEnv(key);
  if (!value) {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`[env] Invalid NEXT_PUBLIC env var: ${key}`);
};

export const publicEnv = {
  firebase: {
    apiKey: readRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  },
  enablePwa: readBooleanPublicEnv("NEXT_PUBLIC_ENABLE_PWA"),
  enableQa: readBooleanPublicEnv("NEXT_PUBLIC_ENABLE_QA"),
  appVersion: readOptionalPublicEnv("NEXT_PUBLIC_APP_VERSION") ?? "dev",
} as const;
