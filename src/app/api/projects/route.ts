export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, readJson } from "@/lib/api";
import { createProject, listProjects, listRenderJobs } from "@/lib/store";
import { CreateProjectInputSchema } from "@/shared/schema";

export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  const projects = listProjects({ brand: u.searchParams.get("brand") ?? undefined, status: u.searchParams.get("status") ?? undefined });
  const jobs = listRenderJobs({ limit: 200 });
  // Último render por proyecto (para el dashboard).
  const lastRender = Object.fromEntries(projects.map((p) => [p.id, jobs.find((j) => j.projectId === p.id) ?? null]));
  return json({ projects, lastRender });
});

export const POST = handle(async (req: Request) => {
  const input = await readJson(req, CreateProjectInputSchema);
  return json({ project: createProject(input) }, 201);
});
