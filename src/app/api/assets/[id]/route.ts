export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import fs from "node:fs";
import { handle, json, notFound, type Ctx } from "@/lib/api";
import { deleteAsset, getAsset } from "@/lib/store";
import { mediaAbs } from "@/lib/paths";

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  const a = getAsset(id);
  if (!a) throw notFound("Recurso");
  fs.rmSync(mediaAbs(a.filePath), { force: true });
  deleteAsset(id);
  return json({ ok: true });
});
