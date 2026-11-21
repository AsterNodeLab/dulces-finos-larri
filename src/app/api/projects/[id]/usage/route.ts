export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, notFound, type Ctx } from "@/lib/api";
import { aiUsageForProject, getProject } from "@/lib/store";

/** Llamadas a proveedores y coste estimado del proyecto. */
export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  return json(aiUsageForProject(id));
});
