import { deleteStoredMealImageObject } from "@/lib/modules/meals/adapters/storage/meal-storage-admin";
import {
  getMealImageStorageBucketName,
  getMealImageStorageObjectPath,
  isOwnedMealImageUrl,
} from "@/lib/modules/meals/server/meal-image-url";

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

  await deleteStoredMealImageObject({
    bucketName,
    objectPath,
  });
  return true;
};
