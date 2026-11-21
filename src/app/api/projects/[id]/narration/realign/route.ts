export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json, HttpError, type Ctx } from "@/lib/api";
import { realign } from "@/lib/narration/service";
import { getActiveNarration, getStoryboard, saveStoryboard, updateNarrationWords } from "@/lib/store";
import { applyNarration } from "@/lib/storyboard/service";

/** Recalcula la alineación estimada con el texto actual del storyboard. */
export const POST = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  const n = getActiveNarration(id);
  if (!n) throw new HttpError(400, "No hay narración activa");
  updateNarrationWords(id, await realign(id, n));
  const sb = getStoryboard(id);
  if (sb) saveStoryboard(id, applyNarration(id, sb.spec), sb.provider);
  return json({ narration: getActiveNarration(id) });
});
