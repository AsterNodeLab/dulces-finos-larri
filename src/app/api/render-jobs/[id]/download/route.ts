export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { handle, notFound, HttpError, type Ctx } from "@/lib/api";
import { getProject, getRenderJob } from "@/lib/store";
import { paths } from "@/lib/paths";

/** Descarga (o reproduce inline con ?inline=1) el MP4 renderizado. */
export const GET = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  const job = getRenderJob(id);
  if (!job) throw notFound("Render");
  if (job.status !== "done" || !job.outputPath) throw new HttpError(409, "El render no está listo");
  const abs = path.join(paths.renders, path.basename(job.outputPath));
  if (!fs.existsSync(abs)) throw new HttpError(410, "El archivo ya no existe en disco");
  const p = getProject(job.projectId);
  const slug = (p?.title ?? "video").normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "video";
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const size = fs.statSync(abs).size;
  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "content-type": "video/mp4",
    "accept-ranges": "bytes",
    "content-disposition": `${inline ? "inline" : "attachment"}; filename="${slug}-${job.quality}.mp4"`,
  };
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    return new Response(Readable.toWeb(fs.createReadStream(abs, { start, end })) as ReadableStream, { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(abs)) as ReadableStream, { headers: { ...headers, "content-length": String(size) } });
});
