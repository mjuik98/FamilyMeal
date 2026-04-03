import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { adminStorage } from "@/lib/firebase-admin";
import {
  ALLOWED_MEAL_IMAGE_TYPES,
  MAX_MEAL_IMAGE_DIMENSION,
  MAX_MEAL_IMAGE_UPLOAD_BYTES,
  NORMALIZED_MEAL_IMAGE_QUALITY,
} from "@/lib/meal-image-policy";
import { RouteError } from "@/lib/route-errors";

const ALLOWED_IMAGE_TYPE_SET = new Set<string>(ALLOWED_MEAL_IMAGE_TYPES);
const NORMALIZED_CONTENT_TYPE = "image/jpeg";

const validateImageFile = (file: File): string => {
  const contentType = file.type.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPE_SET.has(contentType)) {
    throw new RouteError("Unsupported image type", 415);
  }

  if (file.size <= 0) {
    throw new RouteError("Image payload is empty", 400);
  }
  if (file.size > MAX_MEAL_IMAGE_UPLOAD_BYTES) {
    throw new RouteError("Image payload is too large", 413);
  }

  return contentType;
};

const normalizeMealImageBuffer = async (buffer: Buffer): Promise<Buffer> => {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_MEAL_IMAGE_DIMENSION,
        height: MAX_MEAL_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: NORMALIZED_MEAL_IMAGE_QUALITY,
        mozjpeg: true,
      })
      .toBuffer();
  } catch {
    throw new RouteError("Image normalization failed", 415);
  }
};

const buildStoragePath = (uid: string): string => `meals/${uid}/${Date.now()}_${randomUUID()}.jpg`;

const buildDownloadUrl = (bucketName: string, objectPath: string, token: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

export const storeMealImageFile = async ({
  uid,
  bucketName,
  file: imageFile,
}: {
  uid: string;
  bucketName: string;
  file: File;
}) => {
  validateImageFile(imageFile);
  const sourceBuffer = Buffer.from(await imageFile.arrayBuffer());
  const normalizedBuffer = await normalizeMealImageBuffer(sourceBuffer);
  const objectPath = buildStoragePath(uid);
  const downloadToken = randomUUID();
  const storageFile = adminStorage.bucket(bucketName).file(objectPath);

  await storageFile.save(normalizedBuffer, {
    resumable: false,
    contentType: NORMALIZED_CONTENT_TYPE,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        uploadedBy: uid,
      },
    },
  });

  return {
    imageUrl: buildDownloadUrl(bucketName, objectPath, downloadToken),
    path: objectPath,
  };
};
