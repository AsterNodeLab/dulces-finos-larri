export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json } from "@/lib/api";
import { listRenderJobs } from "@/lib/store";
import { reapStaleJobs } from "@/lib/render/backend";

export const GET = handle(async (req: Request) => {
  reapStaleJobs();
  const u = new URL(req.url);
  return json({ jobs: listRenderJobs({ projectId: u.searchParams.get("projectId") ?? undefined, limit: Number(u.searchParams.get("limit") ?? 50) }) });
});
