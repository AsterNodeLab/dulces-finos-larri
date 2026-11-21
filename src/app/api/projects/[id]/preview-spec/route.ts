export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, notFound, type Ctx } from "@/lib/api";
import { getProject } from "@/lib/store";
import { buildRenderSpec } from "@/lib/storyboard/service";

/** Spec exacto que se renderizaría ahora (para el Remotion Player). assetBaseUrl: "/api/media/". */
export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  return json({ spec: buildRenderSpec(id), assetBaseUrl: "/api/media/" });
});
