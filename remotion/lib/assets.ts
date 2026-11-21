/**
 * Resolución de assets (audio, música, imágenes de personaje).
 * - assetBaseUrl === null → render con el worker: staticFile() sobre publicDir = data/media.
 * - assetBaseUrl string  → Player en Next.js: p. ej. "/api/media/" + segmentos codificados.
 * Código puro de navegador: sin imports de Node.
 */
import { staticFile } from "remotion";

/** Quita barras iniciales y bloquea segmentos de escape ("..", "."). */
function cleanSegments(path: string): string[] {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter((seg) => seg.length > 0 && seg !== "." && seg !== "..");
}

export function resolveAsset(path: string, assetBaseUrl: string | null): string {
  // URLs absolutas o data: se respetan tal cual (p. ej. previsualizaciones locales).
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const segments = cleanSegments(path);
  if (assetBaseUrl === null) {
    // staticFile() ya codifica caracteres especiales de cada segmento.
    return staticFile(segments.join("/"));
  }
  const base = assetBaseUrl.endsWith("/") ? assetBaseUrl : `${assetBaseUrl}/`;
  return base + segments.map((s) => encodeURIComponent(s)).join("/");
}
