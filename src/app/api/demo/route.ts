export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json } from "@/lib/api";
import { createDemoProject, findDemoProject } from "@/lib/demo";

/** Crea (si no existe) el proyecto de demostración y lo devuelve. */
export const POST = handle(async () => {
  const existing = findDemoProject();
  return json({ project: existing ?? createDemoProject(), created: !existing });
});
