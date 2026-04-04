import { adminStorage } from "@/lib/firebase-admin";
import {
  getMealImageStorageBucketName,
  getMealImageStorageObjectPath,
  isOwnedMealImageUrl,
} from "@/lib/server/meals/meal-image-url";

export const deleteStorageObjectByUrl = async (
  imageUrl: unknown,
  options?: { uid?: string }
): Promise<boolean> => {
  const bucketName = getMealImageStorageBucketName();
  const objectPath = getMealImageStorageObjectPath(imageUrl);
  if (!bucketName || !objectPath) {
    return false;
  }
  if (options?.uid && !isOwnedMealImageUrl(imageUrl, options.uid)) {
    return false;
  }

  await adminStorage.bucket(bucketName).file(objectPath).delete({ ignoreNotFound: true });
  return true;
};
