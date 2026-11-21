export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, notFound, type Ctx } from "@/lib/api";
import { getProject } from "@/lib/store";
import { buildRenderSpec } from "@/lib/storyboard/service";
import { buildSrt } from "@/lib/captions/srt";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  const p = getProject(id);
  if (!p) throw notFound("Proyecto");
  const srt = buildSrt(buildRenderSpec(id));
  const name = p.title.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "subtitulos";
  return new Response(srt, { headers: { "content-type": "application/x-subrip; charset=utf-8", "content-disposition": `attachment; filename="${name}.srt"` } });
});
