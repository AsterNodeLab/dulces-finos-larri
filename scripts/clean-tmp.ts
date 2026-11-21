/** Limpia temporales de data/tmp (bundles, TTS, renders parciales). Uso: npm run clean:tmp */
import "./env-bootstrap";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../src/lib/paths";

let n = 0;
if (fs.existsSync(paths.tmp)) {
  for (const f of fs.readdirSync(paths.tmp)) {
    fs.rmSync(path.join(paths.tmp, f), { recursive: true, force: true });
    n++;
  }
}
console.log(`Temporales eliminados: ${n}`);
