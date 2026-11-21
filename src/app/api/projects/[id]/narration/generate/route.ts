export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, notFound, readJson, type Ctx } from "@/lib/api";
import { generateDemoVoice, generateElevenLabs } from "@/lib/narration/service";
import { getProject, getStoryboard, saveStoryboard } from "@/lib/store";
import { applyNarration } from "@/lib/storyboard/service";

/** Genera narración: "elevenlabs" (requiere clave) o "demo-tts" (voz sintética de demostración, espeak-ng). */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { id } = await ctx.params;
  if (!getProject(id)) throw notFound("Proyecto");
  const { provider } = await readJson(req, z.object({ provider: z.enum(["elevenlabs", "demo-tts"]) }));
  const narration = provider === "elevenlabs" ? await generateElevenLabs(id) : await generateDemoVoice(id);
  const sb = getStoryboard(id);
  if (sb) saveStoryboard(id, applyNarration(id, sb.spec), sb.provider);
  return json({ narration }, 201);
});
