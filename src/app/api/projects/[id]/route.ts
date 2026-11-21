export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import fs from "node:fs";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { aiUsageForProject, deleteProject, getActiveNarration, getProject, getResearch, getScript, getStoryboard, listRenderJobs, listScriptVersions, updateProject } from "@/lib/store";
import { UpdateProjectInputSchema } from "@/shared/schema";
import { mediaAbs, mediaRel, paths } from "@/lib/paths";
import path from "node:path";

/** Proyecto completo: lo necesario para reabrirlo y seguir editando. */
export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) throw notFound("Proyecto");
  return json({
    project,
    research: getResearch(id),
    script: getScript(id),
    scriptVersions: listScriptVersions(id),
    storyboard: getStoryboard(id),
    narration: getActiveNarration(id),
    renders: listRenderJobs({ projectId: id }),
    usage: aiUsageForProject(id),
  });
});

export const PATCH = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const patch = await readJson(req, UpdateProjectInputSchema);
  return json({ project: updateProject(id, patch) });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const renders = listRenderJobs({ projectId: id });
  deleteProject(id);
  // Limpia archivos del proyecto.
  fs.rmSync(mediaAbs(mediaRel("projects", id)), { recursive: true, force: true });
  for (const r of renders) if (r.outputPath) fs.rmSync(path.join(paths.renders, path.basename(r.outputPath)), { force: true });
  return json({ ok: true });
});
