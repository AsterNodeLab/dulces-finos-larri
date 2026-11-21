export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { generateStoryboard, saveEditedStoryboard } from "@/lib/storyboard/service";
import { getProject } from "@/lib/store";
import { VideoSpecSchema } from "@/shared/schema";

/** Genera el storyboard desde el guion aprobado (Motion Director IA o determinista). */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const b = await readJson(req, z.object({ useAi: z.boolean().optional() }).default({}));
  return json({ storyboard: await generateStoryboard(id, b) });
});

/** Guarda el VideoSpec editado (escenas, textos, duraciones, estilos, subtítulos). */
export const PUT = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const { spec } = await readJson(req, z.object({ spec: VideoSpecSchema }));
  return json({ storyboard: saveEditedStoryboard(id, spec) });
});
