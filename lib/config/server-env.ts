const normalizeEnvValue = (value: string | undefined): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseAllowedEmails = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const parseOptionalBoolean = (value: string | undefined): boolean =>
  normalizeEnvValue(value) === "true";

export const serverEnv = {
  firebaseAdmin: {
    projectId: normalizeEnvValue(
      process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ),
    clientEmail: normalizeEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
    privateKey: normalizeEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, "\n"),
  },
  storageBucket:
    normalizeEnvValue(process.env.FIREBASE_STORAGE_BUCKET) ??
    normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  allowedEmails: parseAllowedEmails(process.env.ALLOWED_EMAILS),
  allowRoleReassign: parseOptionalBoolean(process.env.ALLOW_ROLE_REASSIGN),
  upstash: {
    url: normalizeEnvValue(process.env.UPSTASH_REDIS_REST_URL),
    token: normalizeEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN),
  },
  qaRouteToken: normalizeEnvValue(process.env.QA_ROUTE_TOKEN) ?? "",
  deploymentVersion:
    normalizeEnvValue(process.env.VERCEL_GIT_COMMIT_SHA) ??
    normalizeEnvValue(process.env.VERCEL_DEPLOYMENT_ID) ??
    normalizeEnvValue(process.env.NEXT_PUBLIC_APP_VERSION) ??
    "local",
  isProduction: process.env.NODE_ENV === "production",
} as const;
