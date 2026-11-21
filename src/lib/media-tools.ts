/**
 * Localiza ffmpeg/ffprobe de forma portable:
 * 1) variables FFMPEG_PATH / FFPROBE_PATH, 2) binarios del sistema en PATH,
 * 3) binarios que trae Remotion (@remotion/compositor-<plataforma>), presentes tras `npm install` en Windows/Linux/macOS.
 */
import { execFile, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Tool = "ffmpeg" | "ffprobe";
const cache: Partial<Record<Tool, { bin: string; env: NodeJS.ProcessEnv } | null>> = {};

function compositorDirs(): string[] {
  // Ruta construida en tiempo de ejecución (evita que el bundler la rastree como import dinámico).
  const nm = [process.cwd(), "node_modules", "@remotion"].join(path.sep);
  if (!fs.existsSync(nm)) return [];
  return fs
    .readdirSync(nm)
    .filter((d) => d.startsWith("compositor-"))
    .map((d) => path.join(nm, d));
}

export function findTool(tool: Tool): { bin: string; env: NodeJS.ProcessEnv } | null {
  if (cache[tool] !== undefined) return cache[tool]!;
  const exe = process.platform === "win32" ? `${tool}.exe` : tool;
  const envVar = process.env[tool === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"];
  const candidates: { bin: string; env: NodeJS.ProcessEnv }[] = [];
  if (envVar) candidates.push({ bin: envVar, env: process.env });
  candidates.push({ bin: exe, env: process.env });
  for (const dir of compositorDirs()) {
    const bin = path.join(dir, exe);
    if (fs.existsSync(bin)) {
      // En Linux los binarios de Remotion necesitan sus .so junto al ejecutable.
      const ld = [dir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter);
      candidates.push({ bin, env: { ...process.env, LD_LIBRARY_PATH: ld, DYLD_LIBRARY_PATH: ld } });
    }
  }
  for (const c of candidates) {
    const r = spawnSync(c.bin, ["-version"], { env: c.env, stdio: "ignore", timeout: 10000 });
    if (r.status === 0) return (cache[tool] = c);
  }
  return (cache[tool] = null);
}

export function run(tool: Tool, args: string[], timeoutMs = 120000): Promise<{ stdout: string; stderr: string }> {
  const t = findTool(tool);
  if (!t) return Promise.reject(new Error(`${tool} no está disponible. Ejecuta "npm install" (Remotion trae ffmpeg) o instala FFmpeg.`));
  return new Promise((resolve, reject) => {
    execFile(t.bin, args, { env: t.env, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${tool} falló: ${String(stderr || err.message).slice(-800)}`));
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export interface ProbeResult {
  durationInSeconds: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
  formatName: string;
}

export async function probe(file: string): Promise<ProbeResult> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], 30000);
  const j = JSON.parse(stdout) as {
    format?: { duration?: string; format_name?: string };
    streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; r_frame_rate?: string; duration?: string }[];
  };
  const v = j.streams?.find((x) => x.codec_type === "video");
  const a = j.streams?.find((x) => x.codec_type === "audio");
  let fps: number | null = null;
  if (v?.r_frame_rate) {
    const [n, d] = v.r_frame_rate.split("/").map(Number);
    fps = d ? n / d : n;
  }
  const duration = Number(j.format?.duration ?? a?.duration ?? v?.duration ?? 0);
  return {
    durationInSeconds: Number.isFinite(duration) ? duration : 0,
    width: v?.width ?? null,
    height: v?.height ?? null,
    fps,
    hasAudio: Boolean(a),
    hasVideo: Boolean(v),
    videoCodec: v?.codec_name ?? null,
    audioCodec: a?.codec_name ?? null,
    formatName: j.format?.format_name ?? "",
  };
}
