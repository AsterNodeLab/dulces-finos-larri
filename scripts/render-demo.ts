/**
 * Prueba de punta a punta sin la app web: asegura el proyecto demo, encola un render y ejecuta el worker
 * en este mismo proceso de consola. Uso: npm run render:demo [-- --preview]
 */
import "./env-bootstrap";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createDemoProject, findDemoProject } from "../src/lib/demo";
import { createRenderJob, getRenderJob } from "../src/lib/store";
import { buildRenderSpec } from "../src/lib/storyboard/service";
import { paths } from "../src/lib/paths";

const quality = process.argv.includes("--preview") ? "preview" : "final";
const project = findDemoProject() ?? createDemoProject();
const job = createRenderJob(project.id, quality, buildRenderSpec(project.id));
console.log(`Render ${quality} del proyecto demo ${project.id} → job ${job.id}`);
const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const r = spawnSync(process.execPath, [tsxCli, path.join("scripts", "render-worker.ts")], { stdio: "inherit", env: process.env });
const done = getRenderJob(job.id);
if (done?.status === "done") {
  console.log(`OK: ${path.join(paths.renders, done.outputPath!)}`);
  console.log(JSON.stringify(done.outputMeta));
} else {
  console.error(`Render terminó con estado ${done?.status}: ${done?.error}`);
  process.exit(r.status || 1);
}
