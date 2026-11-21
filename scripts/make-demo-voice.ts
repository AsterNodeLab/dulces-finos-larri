/**
 * Genera la narración de DEMOSTRACIÓN (voz sintética espeak-ng + MBROLA mx2) para el proyecto demo
 * y la guarda en assets/demo/ (se versiona en git para que Windows no necesite espeak).
 * No es la voz definitiva del creador: está marcada como demo en la app y en el video.
 *
 * Uso: npm run demo:voice   (requiere espeak-ng; en Ubuntu: apt-get install espeak-ng mbrola mbrola-mx2)
 */
import "./env-bootstrap";
import fs from "node:fs";
import path from "node:path";
import { demoNarrationText } from "../src/content/demo-project";
import { synthesizeDemoVoice, demoTtsAvailable, pickDemoVoice } from "../src/lib/narration/service";
import { run } from "../src/lib/media-tools";

async function main() {
  if (!demoTtsAvailable()) throw new Error("espeak-ng no está instalado.");
  const out = path.join(process.cwd(), "assets", "demo");
  fs.mkdirSync(out, { recursive: true });
  const wav = path.join(out, "narration-demo.wav");
  const { duration, words } = await synthesizeDemoVoice(demoNarrationText(), wav);
  const mp3 = path.join(out, "narration-demo.mp3");
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "128k", mp3]);
  fs.rmSync(wav);
  fs.writeFileSync(
    path.join(out, "narration-demo.json"),
    JSON.stringify({ voice: `espeak-ng ${pickDemoVoice()}`, note: "Voz sintética de demostración. Sustitúyela por tu narración real.", durationInSeconds: duration, words }, null, 2),
  );
  console.log(`OK ${mp3} ${duration.toFixed(2)} s, ${words.length} palabras`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
