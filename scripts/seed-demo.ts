/** Crea el proyecto demo si no existe. Uso: npm run db:seed-demo [-- --force] */
import "./env-bootstrap";
import { createDemoProject, findDemoProject } from "../src/lib/demo";
import { deleteProject } from "../src/lib/store";

const force = process.argv.includes("--force");
const existing = findDemoProject();
if (existing && !force) {
  console.log(`El proyecto demo ya existe: ${existing.id}`);
} else {
  if (existing) deleteProject(existing.id);
  const p = createDemoProject();
  console.log(`Proyecto demo creado: ${p.id} — "${p.title}"`);
}
