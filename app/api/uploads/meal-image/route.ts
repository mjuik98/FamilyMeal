import { NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import { getRouteErrorMessage, getRouteErrorStatus, RouteError } from "@/lib/route-errors";
import { requireVerifiedUser } from "@/lib/server/route-auth";
import { storeMealImageFromDataUri } from "@/lib/server/uploads/meal-image-use-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UploadImageSchema = z.object({
  imageData: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RouteError("Invalid JSON body", 400);
    }

    const parsed = UploadImageSchema.safeParse(body);
    if (!parsed.success) {
      throw new RouteError("Invalid payload", 400);
    }

    const bucketName = serverEnv.storageBucket?.trim();
    if (!bucketName) {
      throw new RouteError("Storage bucket is not configured", 503);
    }

    const uploaded = await storeMealImageFromDataUri({
      uid: user.uid,
      bucketName,
      imageData: parsed.data.imageData,
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
