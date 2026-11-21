/**
 * Interfaz desacoplada de render. Hoy: LocalRenderBackend (proceso worker aparte, secuencial).
 * Mañana: un CloudRenderBackend (p. ej. Remotion Lambda o una VM) implementando la misma interfaz.
 * Nunca se renderiza dentro de una función serverless de vida corta ni dentro del proceso de Next.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { activeJobs, getJobHeartbeat, getJobPid, getRenderJob, updateRenderJob } from "../store";
import { paths, ensureDirs } from "../paths";
import { nowIso } from "../ids";

export interface RenderBackend {
  readonly id: string;
  /** Asegura que el trabajo en cola será procesado. */
  kick(): void;
  cancel(jobId: string): void;
}

const g = globalThis as unknown as { __vqWorker?: { pid: number; startedAt: number } | null };

function isAlive(pid: number | null | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Sin señal de vida en este tiempo se considera colgado (cubre reutilización de PID en Windows). */
const HEARTBEAT_TIMEOUT_MS = 5 * 60_000;

/** Marca como error los trabajos "en curso" cuyo worker ya no existe o dejó de dar señales de vida. */
export function reapStaleJobs() {
  for (const j of activeJobs()) {
    const pid = getJobPid(j.id);
    const hb = getJobHeartbeat(j.id);
    const silent = hb ? Date.now() - Date.parse(hb) > HEARTBEAT_TIMEOUT_MS : false;
    if (!isAlive(pid) || silent) updateRenderJob(j.id, { status: "error", error: "El proceso de render se interrumpió (la app se reinició o el worker terminó inesperadamente). Reintenta.", finishedAt: nowIso(), pid: null });
  }
}

export class LocalRenderBackend implements RenderBackend {
  readonly id = "local";

  kick() {
    const w = g.__vqWorker;
    if (w && isAlive(w.pid)) return; // el worker en curso tomará el siguiente trabajo de la cola
    reapStaleJobs();
    ensureDirs();
    const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    const script = path.join(process.cwd(), "scripts", "render-worker.ts");
    if (!fs.existsSync(tsxCli) || !fs.existsSync(script)) throw new Error("No se encontró el worker de render (scripts/render-worker.ts) o tsx. Ejecuta npm install.");
    const log = fs.openSync(path.join(paths.logs, "render-worker.log"), "a");
    const child = spawn(process.execPath, [tsxCli, script], {
      cwd: process.cwd(),
      env: { ...process.env, VQ_WORKER: "1" },
      stdio: ["ignore", log, log],
      windowsHide: true,
      detached: false,
    });
    child.on("exit", () => {
      if (g.__vqWorker?.pid === child.pid) g.__vqWorker = null;
      fs.closeSync(log);
    });
    child.unref();
    g.__vqWorker = { pid: child.pid ?? 0, startedAt: Date.now() };
  }

  cancel(jobId: string) {
    const job = getRenderJob(jobId);
    if (!job) return;
    if (job.status === "queued") updateRenderJob(jobId, { status: "cancelled", finishedAt: nowIso() });
    else if (job.status === "bundling" || job.status === "rendering") updateRenderJob(jobId, { status: "cancelled" }); // el worker lo detecta y aborta
  }
}

let backend: RenderBackend | null = null;
export function renderBackend(): RenderBackend {
  return (backend ??= new LocalRenderBackend());
}
