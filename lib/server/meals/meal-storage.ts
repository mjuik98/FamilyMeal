import { serverEnv } from "@/lib/config/server-env";
import { adminStorage } from "@/lib/firebase-admin";

const getStorageBucketName = (): string | null => {
  const bucket = serverEnv.storageBucket?.trim();
  return bucket && bucket.length > 0 ? bucket : null;
};

const getStorageObjectPathFromUrl = (imageUrl: string): string | null => {
  const bucketName = getStorageBucketName();
  if (!bucketName) return null;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname !== "firebasestorage.googleapis.com") {
      return null;
    }

    const expectedPrefix = `/v0/b/${bucketName}/o/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      return null;
    }

    const encodedPath = parsed.pathname.slice(expectedPrefix.length);
    if (!encodedPath) return null;
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
};

export const deleteStorageObjectByUrl = async (imageUrl: unknown): Promise<void> => {
  if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) return;

  const bucketName = getStorageBucketName();
  const objectPath = getStorageObjectPathFromUrl(imageUrl);
  if (!bucketName || !objectPath) return;

  await adminStorage.bucket(bucketName).file(objectPath).delete({ ignoreNotFound: true });
};
