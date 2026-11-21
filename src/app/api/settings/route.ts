export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { env, providerStatus } from "@/lib/env";
import { getSettings, setSetting } from "@/lib/store";

/**
 * Ajustes NO secretos (preferencias editoriales). Las claves API solo se configuran en .env.local:
 * esta ruta indica si están configuradas, nunca su valor.
 */
const SettingsSchema = z.object({
  defaultBrand: z.enum(["vision-one", "visionquant"]).optional(),
  defaultTargetDuration: z.enum(["15", "30", "45", "60", "90"]).optional(),
  defaultAudience: z.string().max(200).optional(),
  captionsMaxChars: z.string().regex(/^\d{2}$/).optional(),
});

export const GET = handle(async () =>
  json({
    settings: getSettings(),
    providers: providerStatus(),
    render: { concurrency: env.renderConcurrency, previewScale: env.previewScale, x264Preset: env.x264Preset, browser: env.remotionBrowserExecutable ? "custom" : "remotion-default" },
    envFile: ".env.local",
  }),
);

export const PUT = handle(async (req: Request) => {
  const s = await readJson(req, SettingsSchema);
  for (const [k, v] of Object.entries(s)) if (v !== undefined) setSetting(k, v);
  return json({ settings: getSettings() });
});
