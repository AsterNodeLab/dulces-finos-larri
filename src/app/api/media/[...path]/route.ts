export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { handle, notFound, type Ctx } from "@/lib/api";
import { mediaAbs } from "@/lib/paths";

const TYPES: Record<string, string> = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** Sirve archivos de data/media con soporte de Range (Player). Bloquea path traversal y tipos no permitidos. */
export const GET = handle(async (req: Request, ctx: Ctx<{ path: string[] }>) => {
  const { path: parts } = await ctx.params;
  if (parts.some((p) => p === ".." || p.includes("\\") || p.startsWith("."))) throw notFound("Archivo");
  let abs: string;
  try {
    abs = mediaAbs(parts.map(decodeURIComponent).join("/"));
  } catch {
    throw notFound("Archivo");
  }
  const type = TYPES[path.extname(abs).toLowerCase()];
  if (!type || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw notFound("Archivo");
  const size = fs.statSync(abs).size;
  const headers = { "content-type": type, "accept-ranges": "bytes", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" };
  const m = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    return new Response(Readable.toWeb(fs.createReadStream(abs, { start, end })) as ReadableStream, { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(abs)) as ReadableStream, { headers: { ...headers, "content-length": String(size) } });
});
