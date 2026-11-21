export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { enqueueRender } from "@/lib/render/service";
import { getProject } from "@/lib/store";
import { RenderQualitySchema } from "@/shared/schema";

/** Encola un render (preview = escala reducida y rápido; final = 1080x1920 H.264 + AAC). */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const { quality } = await readJson(req, z.object({ quality: RenderQualitySchema.default("final") }));
  return json({ job: enqueueRender(id, quality) }, 202);
});
