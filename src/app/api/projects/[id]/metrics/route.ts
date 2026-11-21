export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { addMetric, getProject, listMetrics } from "@/lib/store";
import { PLATFORMS } from "@/shared/schema";

const n = z.number().int().min(0).nullable().default(null);
const MetricInputSchema = z.object({
  platform: z.enum(PLATFORMS),
  url: z.string().url().max(500).nullable().default(null),
  views: n, likes: n, comments: n, shares: n, saves: n,
  recordedAt: z.string().datetime().optional(),
});

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  return json({ metrics: listMetrics(id) });
});

/** Registro manual de métricas reales (no hay conexión con TikTok/Meta todavía). */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const m = await readJson(req, MetricInputSchema);
  return json({ metric: addMetric({ ...m, projectId: id, recordedAt: m.recordedAt ?? new Date().toISOString(), origin: "manual" }) }, 201);
});
