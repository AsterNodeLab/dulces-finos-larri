export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, notFound, HttpError, type Ctx } from "@/lib/api";
import { approveScript, getProject, getScript } from "@/lib/store";

export const POST = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const s = getScript(id);
  if (!s) throw new HttpError(400, "No hay guion que aprobar");
  if (s.segments.some((x) => /\[Completa:/.test(x.text))) throw new HttpError(400, "El guion tiene huecos [Completa: …] sin llenar.");
  return json({ script: approveScript(id) });
});
