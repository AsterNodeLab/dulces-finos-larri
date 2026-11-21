/**
 * Configuración del servidor. Solo se importa en código de servidor (API routes, scripts).
 * Los secretos se leen de variables de entorno (.env.local) y NUNCA se envían al cliente.
 */
import path from "node:path";

function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const env = {
  dataDir: path.resolve(/* turbopackIgnore: true */ process.env.VQ_DATA_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data")),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  anthropicMaxCallsPerHour: num("ANTHROPIC_MAX_CALLS_PER_HOUR", 60),

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiTranscribeModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",

  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
  elevenlabsModel: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",

  /** Navegador para Remotion (opcional). En Windows se deja vacío: Remotion descarga Chrome Headless Shell. */
  remotionBrowserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE ?? "",
  /** Hilos de render de Remotion. 2 es seguro para Ryzen 5 3500U / 12 GB. */
  renderConcurrency: num("RENDER_CONCURRENCY", 2),
  /** Escala para renders de previsualización (0.5 → 540x960). */
  previewScale: Number(process.env.RENDER_PREVIEW_SCALE ?? 0.5) || 0.5,
  /** Preset x264 para el render final. */
  x264Preset: process.env.RENDER_X264_PRESET ?? "medium",

  maxUploadMb: num("MAX_UPLOAD_MB", 60),
  /** Feeds del radar (coma-separados). */
  radarFeeds: (process.env.RADAR_FEEDS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};

export function providerStatus() {
  return {
    anthropic: Boolean(env.anthropicApiKey),
    anthropicModel: env.anthropicModel,
    openai: Boolean(env.openaiApiKey),
    elevenlabs: Boolean(env.elevenlabsApiKey && env.elevenlabsVoiceId),
    elevenlabsModel: env.elevenlabsModel,
  };
}
