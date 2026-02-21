import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const adminProjectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const adminClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const adminPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(adminProjectId ? { projectId: adminProjectId } : {}),
  });
};

const adminApp = createAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
