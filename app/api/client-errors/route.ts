import { ingestClientErrorReport } from "@/lib/platform/http/client-error-ingest";
import { handleRoute } from "@/lib/platform/http/route-handler";

export async function POST(request: Request) {
  return handleRoute(() => ingestClientErrorReport(request));
}
