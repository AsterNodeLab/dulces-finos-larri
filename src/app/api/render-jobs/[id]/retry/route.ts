export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, type Ctx } from "@/lib/api";
import { retryRender } from "@/lib/render/service";

export const POST = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  return json({ job: retryRender(id) }, 202);
});
