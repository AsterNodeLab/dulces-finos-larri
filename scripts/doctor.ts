/** Diagnóstico del entorno con mensajes comprensibles. Uso: npm run doctor */
import "./env-bootstrap";
import fs from "node:fs";
import os from "node:os";
import { env, providerStatus } from "../src/lib/env";
import { findTool } from "../src/lib/media-tools";
import { demoTtsAvailable } from "../src/lib/narration/service";

const ok = (b: boolean) => (b ? "OK " : "-- ");
const [maj, min] = process.versions.node.split(".").map(Number);
const nodeOk = maj > 22 || (maj === 22 && min >= 13);
console.log(`${ok(nodeOk)} Node ${process.versions.node} ${nodeOk ? "" : "(se requiere >= 22.13 por node:sqlite; instala Node 22 o 24 LTS)"}`);
console.log(`${ok(true)} SO ${os.platform()} ${os.release()} · CPU ${os.cpus().length} hilos · RAM ${(os.totalmem() / 1e9).toFixed(1)} GB`);
console.log(`${ok(fs.existsSync("node_modules/remotion"))} Dependencias instaladas ${fs.existsSync("node_modules/remotion") ? "" : "(ejecuta npm install)"}`);
console.log(`${ok(Boolean(findTool("ffmpeg")))} ffmpeg ${findTool("ffmpeg")?.bin ?? "no encontrado"}`);
console.log(`${ok(Boolean(findTool("ffprobe")))} ffprobe ${findTool("ffprobe")?.bin ?? "no encontrado"}`);
console.log(`${ok(!env.remotionBrowserExecutable || fs.existsSync(env.remotionBrowserExecutable))} Navegador de render ${env.remotionBrowserExecutable || "(Remotion descargará Chrome Headless Shell en el primer render)"}`);
const p = providerStatus();
console.log(`${ok(p.anthropic)} Anthropic ${p.anthropic ? p.anthropicModel : "sin clave → modo offline/demo"}`);
console.log(`${ok(p.elevenlabs)} ElevenLabs ${p.elevenlabs ? p.elevenlabsModel : "sin clave/voz → importa MP3/WAV"}`);
console.log(`${ok(p.openai)} OpenAI ${p.openai ? "configurado (transcripción con timestamps)" : "opcional, sin clave"}`);
console.log(`${ok(demoTtsAvailable())} espeak-ng (voz demo) ${demoTtsAvailable() ? "" : "opcional; el demo ya trae su narración"}`);
console.log(`   Render: concurrencia ${env.renderConcurrency}, preview escala ${env.previewScale}, preset ${env.x264Preset}`);
console.log(`   Datos: ${env.dataDir}`);
