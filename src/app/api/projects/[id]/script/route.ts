export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { generateScript, saveManualScript, SaveScriptSchema } from "@/lib/script-service";
import { getProject } from "@/lib/store";
import { ScriptSettingsSchema } from "@/shared/schema";

/** Genera un guion nuevo (IA si hay clave; si no, esqueleto offline con huecos a completar). */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const { settings } = await readJson(req, z.object({ settings: ScriptSettingsSchema }));
  return json({ script: await generateScript(id, settings) });
});

/** Guarda ediciones manuales (crea versión; des-aprueba). */
export const PUT = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  return json({ script: saveManualScript(id, await readJson(req, SaveScriptSchema)) });
});
