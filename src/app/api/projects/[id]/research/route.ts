export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { RunResearchSchema, runResearch } from "@/lib/research/service";
import { advanceStatus, getProject, getResearch, saveResearch } from "@/lib/store";
import { ResearchSchema } from "@/shared/schema";

/** Ingiere entradas (URL / texto / pregunta) y analiza. */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const body = await readJson(req, RunResearchSchema);
  return json(await runResearch(id, body));
});

/** Guarda la investigación editada a mano (resumen, ángulos, fuentes, claims y su estado). */
export const PUT = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const body = await readJson(req, ResearchSchema.omit({ updatedAt: true, provider: true, isDemo: true }).extend({ provider: z.string().optional() }));
  const prev = getResearch(id);
  const saved = saveResearch(id, { ...body, provider: prev ? (prev.provider.endsWith("+edit") ? prev.provider : prev.provider + "+edit") : "manual", isDemo: prev?.isDemo ?? false });
  advanceStatus(id, "research");
  return json({ research: saved });
});
