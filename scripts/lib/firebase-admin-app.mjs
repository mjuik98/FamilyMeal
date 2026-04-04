import admin from "firebase-admin";

const PROJECT_ID_ENV_KEYS = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "GCLOUD_PROJECT",
];

const normalizeEnvValue = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const resolveAdminProjectId = () => {
  for (const key of PROJECT_ID_ENV_KEYS) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) {
      return value;
    }
  }

  throw new Error("Firebase project id is required for admin scripts");
};

export const getAdminDbContext = () => {
  const projectId = resolveAdminProjectId();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  return {
    admin,
    db: admin.firestore(),
    projectId,
  };
};

export { admin };
