export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, notFound, type Ctx } from "@/lib/api";
import { renderBackend } from "@/lib/render/backend";
import { getRenderJob } from "@/lib/store";

export const POST = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getRenderJob(id)) throw notFound("Render");
  renderBackend().cancel(id);
  return json({ job: getRenderJob(id) });
});
