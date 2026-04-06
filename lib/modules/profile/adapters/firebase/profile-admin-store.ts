import { adminDb } from "@/lib/firebase-admin";

export type UserProfileDoc = {
  uid?: unknown;
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  notificationPreferences?: unknown;
};

type StoredUserProfileSnapshot = {
  exists: boolean;
  data: UserProfileDoc;
};

const getUserProfileRef = (uid: string) => adminDb.collection("users").doc(uid);

export const loadStoredUserProfile = async (
  uid: string
): Promise<StoredUserProfileSnapshot> => {
  const snapshot = await getUserProfileRef(uid).get();

  return {
    exists: snapshot.exists,
    data: (snapshot.data() ?? {}) as UserProfileDoc,
  };
};

export const saveStoredUserProfile = async (
  uid: string,
  profile: Record<string, unknown>
): Promise<UserProfileDoc> => {
  const userRef = getUserProfileRef(uid);
  await userRef.set(profile, { merge: true });

  const snapshot = await userRef.get();
  return (snapshot.data() ?? {}) as UserProfileDoc;
};

export const runStoredUserProfileTransaction = async <T>(
  uid: string,
  handler: (current: UserProfileDoc) => Promise<{ nextProfile: Record<string, unknown>; result: T }>
): Promise<T> =>
  adminDb.runTransaction(async (tx) => {
    const userRef = getUserProfileRef(uid);
    const snapshot = await tx.get(userRef);
    const current = (snapshot.data() ?? {}) as UserProfileDoc;
    const { nextProfile, result } = await handler(current);

    tx.set(userRef, nextProfile, { merge: true });
    return result;
  });
