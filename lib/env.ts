import { z } from "zod";

const rawPublicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_ALLOWED_EMAILS: process.env.NEXT_PUBLIC_ALLOWED_EMAILS,
  NEXT_PUBLIC_ENABLE_PWA: process.env.NEXT_PUBLIC_ENABLE_PWA,
};

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().trim().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().trim().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().trim().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().trim().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().trim().min(1),
  NEXT_PUBLIC_ALLOWED_EMAILS: z.string().optional().default(""),
  NEXT_PUBLIC_ENABLE_PWA: z.enum(["true", "false"]).optional().default("false"),
});

const parsed = PublicEnvSchema.safeParse(rawPublicEnv);
if (!parsed.success) {
  const keys = parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
  const uniqueKeys = [...new Set(keys)];
  throw new Error(`[env] Invalid NEXT_PUBLIC env vars: ${uniqueKeys.join(", ")}`);
}

const values = parsed.data;

const allowedEmails = values.NEXT_PUBLIC_ALLOWED_EMAILS.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const publicEnv = {
  firebase: {
    apiKey: values.NEXT_PUBLIC_FIREBASE_API_KEY.trim(),
    authDomain: values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim(),
    projectId: values.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim(),
    storageBucket: values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.trim(),
    messagingSenderId: values.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.trim(),
    appId: values.NEXT_PUBLIC_FIREBASE_APP_ID.trim(),
  },
  allowedEmails,
  enablePwa: values.NEXT_PUBLIC_ENABLE_PWA === "true",
} as const;
