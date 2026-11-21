export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import fs from "node:fs";
import path from "node:path";
import { handle, json, HttpError } from "@/lib/api";
import { createAsset, listAssets } from "@/lib/store";
import { env } from "@/lib/env";
import { mediaAbs, mediaRel } from "@/lib/paths";
import { newId } from "@/lib/ids";
import { AssetKindSchema, BrandIdSchema } from "@/shared/schema";

const IMAGE: Record<string, { mime: string; magic: (b: Buffer) => boolean }> = {
  ".png": { mime: "image/png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  ".jpg": { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  ".jpeg": { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  ".webp": { mime: "image/webp", magic: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
};
const AUDIO: Record<string, { mime: string; magic: (b: Buffer) => boolean }> = {
  ".mp3": { mime: "audio/mpeg", magic: (b) => b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  ".wav": { mime: "audio/wav", magic: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WAVE" },
  ".m4a": { mime: "audio/mp4", magic: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" },
};

export const GET = handle(async (req: Request) => {
  const brand = new URL(req.url).searchParams.get("brand") ?? undefined;
  return json({ assets: listAssets(brand) });
});

/** Sube un recurso de marca (multipart): file, brand, kind, label, licenseNote. SVG no se acepta (puede contener scripts). */
export const POST = handle(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, "Se esperaba multipart/form-data");
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, 'Falta el archivo ("file")');
  const brand = BrandIdSchema.parse(form.get("brand"));
  const kind = AssetKindSchema.parse(form.get("kind"));
  const label = String(form.get("label") ?? file.name).slice(0, 120);
  const licenseNote = form.get("licenseNote") ? String(form.get("licenseNote")).slice(0, 300) : null;
  if (kind === "music" && !licenseNote) throw new HttpError(400, "Para música indica la licencia o el origen (nota de licencia).");
  const ext = path.extname(file.name).toLowerCase();
  const table = kind === "music" ? AUDIO : IMAGE;
  const t = table[ext];
  if (!t) throw new HttpError(400, kind === "music" ? "Música: MP3, WAV o M4A" : "Imagen: PNG, JPG o WEBP");
  if (file.size > env.maxUploadMb * 1024 * 1024) throw new HttpError(413, `Máximo ${env.maxUploadMb} MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!t.magic(bytes)) throw new HttpError(400, "El contenido no coincide con el tipo de archivo");
  const rel = mediaRel("brand", brand, `${kind}-${newId()}${ext}`);
  fs.mkdirSync(path.dirname(mediaAbs(rel)), { recursive: true });
  fs.writeFileSync(mediaAbs(rel), bytes);
  return json({ asset: createAsset({ brand, kind, label, filePath: rel, mime: t.mime, licenseNote }) }, 201);
});
