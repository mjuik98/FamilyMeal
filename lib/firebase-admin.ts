import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { serverEnv } from "@/lib/config/server-env";

const adminProjectId = serverEnv.firebaseAdmin.projectId;
const adminClientEmail = serverEnv.firebaseAdmin.clientEmail;
const adminPrivateKey = serverEnv.firebaseAdmin.privateKey;
const adminStorageBucket = serverEnv.storageBucket;

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
