export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json } from "@/lib/api";
import { providerStatus, env } from "@/lib/env";
import { findTool } from "@/lib/media-tools";
import { demoTtsAvailable } from "@/lib/narration/service";
import { db } from "@/lib/db";

/** Estado del sistema y de proveedores (nunca devuelve valores de claves). */
export const GET = handle(async () => {
  db();
  return json({
    ok: true,
    providers: providerStatus(),
    tools: { ffmpeg: Boolean(findTool("ffmpeg")), ffprobe: Boolean(findTool("ffprobe")), demoTts: demoTtsAvailable() },
    render: { backend: "local", concurrency: env.renderConcurrency, previewScale: env.previewScale, x264Preset: env.x264Preset },
    mode: providerStatus().anthropic || providerStatus().openai ? "ai" : "offline",
  });
});
