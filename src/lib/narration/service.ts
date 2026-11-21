/**
 * Narración: importar archivo (obligatorio, sin dependencias externas), generar con ElevenLabs (si hay clave)
 * o generar una voz SINTÉTICA de demostración con espeak-ng (si está instalado).
 * El audio definitivo nunca se altera: solo se mide (ffprobe) y se alinea.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { env } from "../env";
import { mediaAbs, mediaRel, paths } from "../paths";
import { newId } from "../ids";
import { probe, run } from "../media-tools";
import { getScript, getStoryboard, logAiUsage, saveNarration } from "../store";
import { distributeWords, estimateAlignment, parseSilences, tokenize, wordsFromCharAlignment } from "../captions/alignment";
import type { Narration, WordTiming } from "@/shared/schema";

export class NarrationError extends Error {}

const AUDIO_TYPES: Record<string, { mime: string; magic: (b: Buffer) => boolean }> = {
  ".mp3": { mime: "audio/mpeg", magic: (b) => b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  ".wav": { mime: "audio/wav", magic: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WAVE" },
  ".m4a": { mime: "audio/mp4", magic: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" },
};

/** Texto de referencia para alinear: narración del storyboard si existe; si no, el guion. */
export function narrationText(projectId: string): string {
  const sb = getStoryboard(projectId);
  if (sb?.spec.scenes.some((s) => s.narration.trim())) return sb.spec.scenes.map((s) => s.narration.trim()).filter(Boolean).join(" ");
  const sc = getScript(projectId);
  return sc ? sc.segments.map((s) => s.text.trim()).join(" ") : "";
}

async function detectSilences(file: string): Promise<{ start: number; end: number }[]> {
  try {
    const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.22", "-f", "null", "-"], 120000);
    return parseSilences(stderr);
  } catch {
    return [];
  }
}

async function transcribeWithWhisper(file: string, projectId: string): Promise<WordTiming[] | null> {
  if (!env.openaiApiKey) return null;
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append("model", env.openaiTranscribeModel);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("language", "es");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.openaiApiKey}` },
    body: form,
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { words?: { word: string; start: number; end: number }[] };
  logAiUsage({ projectId, provider: "openai", model: env.openaiTranscribeModel, operation: "transcribe", estCostUsd: null });
  return j.words?.map((w) => ({ text: w.word.trim(), start: w.start, end: w.end })).filter((w) => w.text) ?? null;
}

async function alignFile(projectId: string, abs: string, duration: number): Promise<{ words: WordTiming[]; source: Narration["alignmentSource"] }> {
  const whisper = await transcribeWithWhisper(abs, projectId).catch(() => null);
  if (whisper?.length) return { words: whisper, source: "whisper" };
  const text = narrationText(projectId);
  const silences = await detectSilences(abs);
  return { words: text ? estimateAlignment(text, duration, silences) : [], source: "estimated" };
}

function projectDir(projectId: string) {
  if (!/^[\w-]+$/.test(projectId)) throw new NarrationError("ID inválido");
  const rel = mediaRel("projects", projectId);
  fs.mkdirSync(mediaAbs(rel), { recursive: true });
  return rel;
}

export async function importNarration(projectId: string, file: { name: string; bytes: Buffer }): Promise<Narration> {
  const ext = path.extname(file.name).toLowerCase();
  const type = AUDIO_TYPES[ext];
  if (!type) throw new NarrationError("Formato no soportado. Usa MP3, WAV o M4A.");
  if (file.bytes.length > env.maxUploadMb * 1024 * 1024) throw new NarrationError(`El archivo supera ${env.maxUploadMb} MB.`);
  if (!type.magic(file.bytes)) throw new NarrationError("El contenido no corresponde a un archivo de audio válido.");
  const rel = mediaRel(projectDir(projectId), `narration-${newId()}${ext}`);
  const abs = mediaAbs(rel);
  fs.writeFileSync(abs, file.bytes);
  try {
    const info = await probe(abs);
    if (!info.hasAudio || info.durationInSeconds <= 0.3) throw new NarrationError("No se detectó audio utilizable en el archivo.");
    if (info.durationInSeconds > 600) throw new NarrationError("La narración supera 10 minutos.");
    const { words, source } = await alignFile(projectId, abs, info.durationInSeconds);
    return saveNarration(projectId, { kind: "upload", filePath: rel, mime: type.mime, durationInSeconds: info.durationInSeconds, alignmentSource: source, words });
  } catch (e) {
    fs.rmSync(abs, { force: true });
    throw e;
  }
}

export async function generateElevenLabs(projectId: string): Promise<Narration> {
  if (!env.elevenlabsApiKey || !env.elevenlabsVoiceId) throw new NarrationError("Configura ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID en .env.local.");
  const text = narrationText(projectId);
  if (!text) throw new NarrationError("No hay guion ni storyboard con narración.");
  if (text.length > 5000) throw new NarrationError("El texto supera 5,000 caracteres.");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.elevenlabsVoiceId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": env.elevenlabsApiKey },
    body: JSON.stringify({ text, model_id: env.elevenlabsModel, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    signal: AbortSignal.timeout(300_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    audio_base64?: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
    detail?: unknown;
  };
  if (!res.ok || !body.audio_base64) throw new NarrationError(`ElevenLabs ${res.status}: ${JSON.stringify(body.detail ?? "sin audio").slice(0, 300)}`);
  logAiUsage({ projectId, provider: "elevenlabs", model: env.elevenlabsModel, operation: "tts", characters: text.length, estCostUsd: null });
  const rel = mediaRel(projectDir(projectId), `narration-${newId()}.mp3`);
  const abs = mediaAbs(rel);
  fs.writeFileSync(abs, Buffer.from(body.audio_base64, "base64"));
  const info = await probe(abs);
  const words = body.alignment ? wordsFromCharAlignment(body.alignment) : estimateAlignment(text, info.durationInSeconds, await detectSilences(abs));
  return saveNarration(projectId, { kind: "elevenlabs", filePath: rel, mime: "audio/mpeg", durationInSeconds: info.durationInSeconds, alignmentSource: body.alignment ? "elevenlabs" : "estimated", words });
}

export function demoTtsAvailable(): boolean {
  const r = spawnSync("espeak-ng", ["--version"], { stdio: "ignore", timeout: 5000 });
  return r.status === 0;
}

/** Voz sintética de DEMOSTRACIÓN. Usa la voz mexicana MBROLA mx2 si está instalada, o es-419. */
export function pickDemoVoice(): string {
  const r = spawnSync("espeak-ng", ["--voices=es"], { encoding: "utf8", timeout: 5000 });
  const out = r.stdout ?? "";
  if (/mb-mx2/.test(out) && fs.existsSync("/usr/share/mbrola/mx2")) return "mb-mx2";
  return "es-419";
}

/**
 * Sintetiza frase por frase (límites exactos conocidos) y concatena. Las palabras se reparten
 * dentro de cada frase (estimación), pero los cortes de frase son exactos.
 */
export async function synthesizeDemoVoice(text: string, outWav: string): Promise<{ duration: number; words: WordTiming[] }> {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
  const voice = pickDemoVoice();
  const tmpDir = path.join(paths.tmp, `tts-${newId()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const parts: string[] = [];
    const words: WordTiming[] = [];
    let t = 0;
    for (let i = 0; i < sentences.length; i++) {
      const f = path.join(tmpDir, `s${String(i).padStart(3, "0")}.wav`);
      const r = spawnSync("espeak-ng", ["-v", voice, "-s", "158", "-p", "42", "-g", "2", "-w", f, sentences[i]], { stdio: "ignore", timeout: 60000 });
      if (r.status !== 0 || !fs.existsSync(f)) throw new NarrationError("espeak-ng falló al sintetizar.");
      // Normaliza a 44.1 kHz mono + 0.18 s de silencio al final de cada frase.
      const norm = path.join(tmpDir, `n${String(i).padStart(3, "0")}.wav`);
      await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", f, "-af", "apad=pad_dur=0.18", "-ar", "44100", "-ac", "1", norm]);
      const d = (await probe(norm)).durationInSeconds;
      words.push(...distributeWords(tokenize(sentences[i]), t + 0.03, t + d - 0.2));
      t += d;
      parts.push(norm);
    }
    const list = path.join(tmpDir, "list.txt");
    fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
    await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-ar", "44100", "-ac", "1", outWav]);
    const duration = (await probe(outWav)).durationInSeconds;
    return { duration, words };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function generateDemoVoice(projectId: string): Promise<Narration> {
  if (!demoTtsAvailable()) throw new NarrationError("espeak-ng no está instalado. Importa un MP3/WAV o configura ElevenLabs.");
  const text = narrationText(projectId);
  if (!text) throw new NarrationError("No hay guion ni storyboard con narración.");
  const rel = mediaRel(projectDir(projectId), `narration-demo-${newId()}.wav`);
  const { duration, words } = await synthesizeDemoVoice(text, mediaAbs(rel));
  return saveNarration(projectId, { kind: "demo-tts", filePath: rel, mime: "audio/wav", durationInSeconds: duration, alignmentSource: "estimated", words });
}

/** Re-alinea la narración activa con el texto actual (tras editar el storyboard). */
export async function realign(projectId: string, n: Narration): Promise<WordTiming[]> {
  const abs = mediaAbs(n.filePath);
  const text = narrationText(projectId);
  return estimateAlignment(text, n.durationInSeconds, await detectSilences(abs));
}
