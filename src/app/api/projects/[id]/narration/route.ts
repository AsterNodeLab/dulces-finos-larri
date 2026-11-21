export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, HttpError, readJson, type Ctx } from "@/lib/api";
import { importNarration } from "@/lib/narration/service";
import { clearNarration, getActiveNarration, getProject, getStoryboard, saveStoryboard, updateNarrationWords } from "@/lib/store";
import { applyNarration } from "@/lib/storyboard/service";
import { env } from "@/lib/env";
import { WordTimingSchema } from "@/shared/schema";

function resync(id: string) {
  const sb = getStoryboard(id);
  if (sb) saveStoryboard(id, applyNarration(id, sb.spec), sb.provider);
}

/** Importa narración (MP3/WAV/M4A) como multipart/form-data, campo "file". */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > (env.maxUploadMb + 1) * 1024 * 1024) throw new HttpError(413, `El archivo supera ${env.maxUploadMb} MB`);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, 'Envía el audio en el campo "file"');
  const narration = await importNarration(id, { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) });
  resync(id);
  return json({ narration }, 201);
});

/** Edita los subtítulos (texto/tiempos por palabra) antes del render. */
export const PUT = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getActiveNarration(id)) throw new HttpError(400, "No hay narración activa");
  const { words } = await readJson(req, z.object({ words: z.array(WordTimingSchema).max(5000) }));
  updateNarrationWords(id, words);
  resync(id);
  return json({ narration: getActiveNarration(id) });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  clearNarration(id);
  resync(id);
  return json({ ok: true });
});
