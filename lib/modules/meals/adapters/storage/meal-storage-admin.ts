import { adminStorage } from "@/lib/firebase-admin";

export const deleteStoredMealImageObject = async ({
  bucketName,
  objectPath,
}: {
  bucketName: string;
  objectPath: string;
}): Promise<void> => {
  await adminStorage.bucket(bucketName).file(objectPath).delete({ ignoreNotFound: true });
};
