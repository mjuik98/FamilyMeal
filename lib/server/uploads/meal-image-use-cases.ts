import { randomUUID } from "node:crypto";

import { adminStorage } from "@/lib/firebase-admin";
import { RouteError } from "@/lib/route-errors";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const DEFAULT_CONTENT_TYPE = "image/jpeg";

const parseDataUri = (imageData: string): { contentType: string; buffer: Buffer } => {
  const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new RouteError("Invalid image data", 400);
  }

  const [, contentType, base64Payload] = match;
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new RouteError("Unsupported image type", 415);
  }

  const buffer = Buffer.from(base64Payload.replace(/\s+/g, ""), "base64");
  if (buffer.length === 0) {
    throw new RouteError("Image payload is empty", 400);
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new RouteError("Image payload is too large", 413);
  }

  return { contentType, buffer };
};

const getFileExtension = (contentType: string): string => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/heic") return "heic";
  if (contentType === "image/heif") return "heif";
  return "jpg";
};

const buildStoragePath = (uid: string, contentType: string): string => {
  const extension = getFileExtension(contentType);
  return `meals/${uid}/${Date.now()}_${randomUUID()}.${extension}`;
};

const buildDownloadUrl = (bucketName: string, objectPath: string, token: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

export const storeMealImageFromDataUri = async ({
  uid,
  bucketName,
  imageData,
}: {
  uid: string;
  bucketName: string;
  imageData: string;
}) => {
  const { contentType, buffer } = parseDataUri(imageData);
  const objectPath = buildStoragePath(uid, contentType);
  const downloadToken = randomUUID();
  const file = adminStorage.bucket(bucketName).file(objectPath);

  await file.save(buffer, {
    resumable: false,
    contentType: contentType || DEFAULT_CONTENT_TYPE,
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
