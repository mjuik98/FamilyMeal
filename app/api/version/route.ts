import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/config/server-env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const version = serverEnv.deploymentVersion;

  return NextResponse.json(
    {
      version,
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
