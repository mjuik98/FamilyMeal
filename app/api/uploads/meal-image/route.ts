import { NextResponse } from "next/server";

import { MAX_MEAL_IMAGE_REQUEST_BYTES } from "@/lib/meal-image-policy";
import { serverEnv } from "@/lib/config/server-env";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { requireVerifiedUser } from "@/lib/server/route-auth";
import { storeMealImageFile } from "@/lib/server/uploads/meal-image-use-cases";

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
  try {
    const user = await requireVerifiedUser(request);
    validateUploadContentLength(request);
    validateUploadContentType(request);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new RouteError("Invalid form data", 400);
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new RouteError("Image file is required", 400);
    }

    const bucketName = serverEnv.storageBucket?.trim();
    if (!bucketName) {
      throw new RouteError("Storage bucket is not configured", 503);
    }

    const uploaded = await storeMealImageFile({
      uid: user.uid,
      bucketName,
      file,
    });

    return NextResponse.json({
      ok: true,
      imageUrl: uploaded.imageUrl,
      path: uploaded.path,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getRouteErrorMessage(error) },
      { status: getRouteErrorStatus(error) }
    );
  }
}
