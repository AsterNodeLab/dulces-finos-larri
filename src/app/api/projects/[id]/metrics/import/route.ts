export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, HttpError, type Ctx } from "@/lib/api";
import { addMetric, getProject } from "@/lib/store";
import { PLATFORMS } from "@/shared/schema";

/**
 * Importa métricas desde CSV exportado por el usuario.
 * Encabezados aceptados: platform,url,views,likes,comments,shares,saves,recorded_at
 */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const { csv } = await readJson(req, z.object({ csv: z.string().max(200_000) }));
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new HttpError(400, "El CSV necesita encabezado y al menos una fila");
  const head = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const col = (row: string[], k: string) => { const i = head.indexOf(k); return i >= 0 ? row[i]?.trim() ?? "" : ""; };
  const num = (v: string) => (v === "" ? null : Number.isFinite(Number(v.replace(/[,_\s]/g, ""))) ? Math.max(0, Math.round(Number(v.replace(/[,_\s]/g, "")))) : null);
  const added = [];
  const errors: string[] = [];
  for (const [i, line] of lines.slice(1).entries()) {
    const row = line.split(",");
    const platform = col(row, "platform").toLowerCase();
    if (!(PLATFORMS as readonly string[]).includes(platform)) { errors.push(`Fila ${i + 2}: plataforma inválida "${platform}"`); continue; }
    const date = col(row, "recorded_at");
    added.push(addMetric({ projectId: id, platform: platform as (typeof PLATFORMS)[number], url: col(row, "url") || null, views: num(col(row, "views")), likes: num(col(row, "likes")), comments: num(col(row, "comments")), shares: num(col(row, "shares")), saves: num(col(row, "saves")), recordedAt: date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString(), origin: "csv" }));
  }
  return json({ added: added.length, errors });
});
