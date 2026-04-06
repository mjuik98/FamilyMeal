import { serverEnv } from "@/lib/config/server-env";
import { storeMealImageFile } from "@/lib/modules/meals/adapters/storage/meal-image-upload";
import { MAX_MEAL_IMAGE_REQUEST_BYTES } from "@/lib/modules/meals/domain/meal-image-policy";
import { deleteStorageObjectByUrl } from "@/lib/modules/meals/server/meal-storage";
import { requireVerifiedUser } from "@/lib/platform/auth/route-auth";
import { parseMultipartFileFromRequest } from "@/lib/platform/http/multipart-file";
import { parseJsonBody } from "@/lib/platform/http/request-body";
import { handleRoute } from "@/lib/platform/http/route-handler";
import { RouteError } from "@/lib/platform/http/route-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validateUploadContentLength = (request: Request): void => {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_MEAL_IMAGE_REQUEST_BYTES) {
    throw new RouteError("Image upload request is too large", 413);
  }
};

const validateUploadContentType = (request: Request): void => {
  const contentType = request.headers.get("content-type")?.trim().toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw new RouteError("Invalid upload content type", 415);
  }
};

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireVerifiedUser(request);
    validateUploadContentLength(request);
    validateUploadContentType(request);

    const file = await parseMultipartFileFromRequest(request, {
      fieldName: "file",
      maxBytes: MAX_MEAL_IMAGE_REQUEST_BYTES,
    });

    const bucketName = serverEnv.storageBucket?.trim();
    if (!bucketName) {
      throw new RouteError("Storage bucket is not configured", 503);
    }

    const uploaded = await storeMealImageFile({
      uid: user.uid,
      bucketName,
      file,
    });

    return {
      ok: true,
      imageUrl: uploaded.imageUrl,
      path: uploaded.path,
    };
  });
}

export async function DELETE(request: Request) {
  return handleRoute(async () => {
    const user = await requireVerifiedUser(request);

    const body = await parseJsonBody(request);

    const imageUrl =
      body &&
      typeof body === "object" &&
      "imageUrl" in body &&
      typeof (body as { imageUrl?: unknown }).imageUrl === "string"
        ? (body as { imageUrl: string }).imageUrl
        : "";

    const deleted = await deleteStorageObjectByUrl(imageUrl, { uid: user.uid });
    if (!deleted) {
      throw new RouteError("Invalid meal image URL", 400);
    }

    return { ok: true };
  });
}
