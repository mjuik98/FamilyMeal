import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const normalizeEnvValue = (value: string | undefined): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const adminProjectId = normalizeEnvValue(
  process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);
const adminClientEmail = normalizeEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
const adminPrivateKey = normalizeEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(
  /\\n/g,
  "\n"
);
const adminStorageBucket = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

const hasServiceAccount = Boolean(adminProjectId && adminClientEmail && adminPrivateKey);

const createAdminApp = (): App => {
  if (getApps().length > 0) {
    return getApps()[0] as App;
  }

  if (hasServiceAccount) {
    return initializeApp({
      credential: cert({
        projectId: adminProjectId,
        clientEmail: adminClientEmail,
        privateKey: adminPrivateKey,
      }),
      projectId: adminProjectId,
      ...(adminStorageBucket ? { storageBucket: adminStorageBucket } : {}),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(adminProjectId ? { projectId: adminProjectId } : {}),
    ...(adminStorageBucket ? { storageBucket: adminStorageBucket } : {}),
  });
};

export const adminApp = createAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
