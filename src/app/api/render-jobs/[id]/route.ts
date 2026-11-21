export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, notFound, type Ctx } from "@/lib/api";
import { getRenderJob } from "@/lib/store";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  const job = getRenderJob(id);
  if (!job) throw notFound("Render");
  return json({ job });
});
