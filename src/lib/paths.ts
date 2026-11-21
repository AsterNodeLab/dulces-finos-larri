/**
 * Almacenamiento de archivos. Todo vive bajo data/ (gitignored):
 *   data/studio.db            base SQLite
 *   data/media/projects/<id>/ narración, assets del proyecto
 *   data/media/brand/<brand>/ biblioteca de marca (personaje, logos, música)
 *   data/renders/<jobId>.mp4  videos exportados
 *   data/tmp/                 temporales (se limpian)
 * data/media es el publicDir del bundle de Remotion → staticFile("projects/<id>/narration.wav").
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

export const paths = {
  data: env.dataDir,
  db: path.join(env.dataDir, "studio.db"),
  media: path.join(env.dataDir, "media"),
  renders: path.join(env.dataDir, "renders"),
  tmp: path.join(env.dataDir, "tmp"),
  logs: path.join(env.dataDir, "logs"),
};

export function ensureDirs() {
  for (const p of [paths.data, paths.media, paths.renders, paths.tmp, paths.logs]) fs.mkdirSync(p, { recursive: true });
}

/** Convierte una ruta relativa de media (con "/") en absoluta, impidiendo salir de data/media. */
export function mediaAbs(rel: string): string {
  const clean = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.resolve(/* turbopackIgnore: true */ paths.media, ...clean.split("/"));
  const root = path.resolve(/* turbopackIgnore: true */ paths.media) + path.sep;
  if (!abs.startsWith(root)) throw new Error("Ruta fuera del almacenamiento de media");
  return abs;
}

/** Ruta relativa POSIX (para guardar en BD y usar con staticFile). */
export function mediaRel(...parts: string[]): string {
  return parts.join("/").replace(/\\/g, "/");
}
