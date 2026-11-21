export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, type Ctx } from "@/lib/api";
import { deleteMetric } from "@/lib/store";

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  deleteMetric(id);
  return json({ ok: true });
});
