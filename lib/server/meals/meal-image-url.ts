import { MAX_MEAL_IMAGE_URL_LENGTH } from "@/lib/domain/meal-policy";
import { serverEnv } from "@/lib/config/server-env";

const FIREBASE_STORAGE_HOSTNAME = "firebasestorage.googleapis.com";
const MEAL_IMAGE_STORAGE_PREFIX = "meals/";

export const getMealImageStorageBucketName = (): string | null => {
  const bucketName = serverEnv.storageBucket?.trim();
  return bucketName && bucketName.length > 0 ? bucketName : null;
};

export const getMealImageStorageObjectPath = (imageUrl: unknown): string | null => {
  if (typeof imageUrl !== "string") {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.length > MAX_MEAL_IMAGE_URL_LENGTH) {
    return null;
  }

  const bucketName = getMealImageStorageBucketName();
  if (!bucketName) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname !== FIREBASE_STORAGE_HOSTNAME) {
      return null;
    }

    const expectedPrefix = `/v0/b/${bucketName}/o/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      return null;
    }

    const encodedPath = parsed.pathname.slice(expectedPrefix.length);
    if (!encodedPath) {
      return null;
    }

    const objectPath = decodeURIComponent(encodedPath);
    if (!objectPath.startsWith(MEAL_IMAGE_STORAGE_PREFIX)) {
      return null;
    }

    return objectPath;
  } catch {
    return null;
  }
};

export const isOwnedMealImageUrl = (imageUrl: unknown, uid: string): boolean => {
  const normalizedUid = uid.trim();
  if (!normalizedUid) {
    return false;
  }

  const objectPath = getMealImageStorageObjectPath(imageUrl);
  return objectPath?.startsWith(`${MEAL_IMAGE_STORAGE_PREFIX}${normalizedUid}/`) ?? false;
};
