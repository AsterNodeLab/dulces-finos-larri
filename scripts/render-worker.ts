/**
 * Worker de render (proceso independiente del servidor web).
 * Procesa la cola de render_jobs de forma SECUENCIAL y termina cuando no quedan trabajos.
 * Pensado para equipos modestos (Ryzen 5 3500U / 12 GB): un solo render a la vez,
 * concurrencia de frames configurable (RENDER_CONCURRENCY), previsualizaciones a escala reducida.
 *
 * Uso manual: npm run render:worker
 */
import "./env-bootstrap";
import fs from "node:fs";
import path from "node:path";

import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "../src/lib/env";
import { ensureDirs, paths } from "../src/lib/paths";
import { nowIso } from "../src/lib/ids";
import { probe } from "../src/lib/media-tools";
import { advanceStatus, claimNextJob, getRenderJob, getRenderJobSpec, updateRenderJob } from "../src/lib/store";
import type { CompositionProps } from "../src/shared/schema";

const COMPOSITION_ID = "VisionQuantVideo";

function log(...a: unknown[]) {
  console.log(`[render-worker ${new Date().toISOString()}]`, ...a);
}

let serveUrl: string | null = null;
let bundleDir: string | null = null;

async function getBundle(jobId: string): Promise<string> {
  if (serveUrl) return serveUrl;
  updateRenderJob(jobId, { status: "bundling", progress: 0 });
  bundleDir = path.join(paths.tmp, `bundle-${process.pid}`);
  serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    publicDir: paths.media,
    outDir: bundleDir,
    enableCaching: true,
    onProgress: (p) => {
      if (p % 20 === 0) updateRenderJob(jobId, { progress: p / 1000 });
    },
  });
  return serveUrl;
}

async function processJob(jobId: string) {
  const job = getRenderJob(jobId);
  const spec = getRenderJobSpec(jobId);
  if (!job || !spec) return;
  log(`job ${jobId} (${job.quality}) project ${job.projectId}`);
  updateRenderJob(jobId, { error: null });
  const outRel = `${jobId}.mp4`;
  const outAbs = path.join(paths.renders, outRel);
  const tmpOut = path.join(paths.tmp, `${jobId}.partial.mp4`);
  const { cancelSignal, cancel } = makeCancelSignal();
  let lastWrite = 0;
  try {
    const url = await getBundle(jobId);
    const inputProps: CompositionProps = { spec, assetBaseUrl: null };
    const browserExecutable = env.remotionBrowserExecutable || null;
    const composition = await selectComposition({ serveUrl: url, id: COMPOSITION_ID, inputProps, browserExecutable });
    updateRenderJob(jobId, { status: "rendering", progress: 0 });
    const preview = job.quality === "preview";
    await renderMedia({
      composition,
      serveUrl: url,
      codec: "h264",
      audioCodec: "aac",
      outputLocation: tmpOut,
      inputProps,
      browserExecutable,
      concurrency: env.renderConcurrency,
      scale: preview ? env.previewScale : 1,
      crf: preview ? 28 : 20,
      x264Preset: preview ? "veryfast" : (env.x264Preset as "medium"),
      pixelFormat: "yuv420p",
      imageFormat: "jpeg",
      jpegQuality: preview ? 70 : 90,
      cancelSignal,
      // Memoria acotada para equipos con 12 GB.
      offthreadVideoCacheSizeInBytes: 256 * 1024 * 1024,
      chromiumOptions: { gl: process.platform === "win32" ? "angle" : "swangle" },
      timeoutInMilliseconds: 120_000,
      onProgress: ({ progress }) => {
        const now = Date.now();
        if (now - lastWrite < 700) return;
        lastWrite = now;
        updateRenderJob(jobId, { progress });
        if (getRenderJob(jobId)?.status === "cancelled") cancel();
      },
    });
    fs.renameSync(tmpOut, outAbs);
    const info = await probe(outAbs);
    const size = fs.statSync(outAbs).size;
    const expected = spec.scenes.reduce((a, s) => a + s.durationInFrames, 0) / spec.fps;
    if (!info.hasVideo || Math.abs(info.durationInSeconds - expected) > 0.5) {
      throw new Error(`Verificación fallida: duración ${info.durationInSeconds.toFixed(2)} s, esperada ${expected.toFixed(2)} s.`);
    }
    updateRenderJob(jobId, {
      status: "done",
      progress: 1,
      outputPath: outRel,
      finishedAt: nowIso(),
      pid: null,
      outputMeta: { width: info.width ?? 0, height: info.height ?? 0, durationInSeconds: info.durationInSeconds, fps: info.fps ?? spec.fps, sizeBytes: size, hasAudio: info.hasAudio },
    });
    if (job.quality === "final") advanceStatus(job.projectId, "review");
    log(`job ${jobId} done: ${info.width}x${info.height} ${info.durationInSeconds.toFixed(2)}s audio=${info.hasAudio} ${(size / 1e6).toFixed(1)}MB`);
  } catch (e) {
    fs.rmSync(tmpOut, { force: true });
    const cancelled = getRenderJob(jobId)?.status === "cancelled";
    const msg = cancelled ? "Cancelado por el usuario." : (e as Error).message?.slice(0, 2000) || String(e);
    updateRenderJob(jobId, { status: cancelled ? "cancelled" : "error", error: msg, finishedAt: nowIso(), pid: null });
    log(`job ${jobId} ${cancelled ? "cancelled" : "error"}: ${msg}`);
  }
}

async function main() {
  ensureDirs();
  log("start");
  try {
    for (;;) {
      const job = claimNextJob(process.pid);
      if (!job) break;
      await processJob(job.id);
    }
  } finally {
    if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
    log("idle, exit");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
