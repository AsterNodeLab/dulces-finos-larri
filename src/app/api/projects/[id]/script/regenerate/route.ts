export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { regenerateSegment } from "@/lib/script-service";
import { getProject } from "@/lib/store";

export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const b = await readJson(req, z.object({ segmentId: z.string().min(1), instruction: z.string().max(500).default("") }));
  return json({ script: await regenerateSegment(id, b.segmentId, b.instruction) });
});
