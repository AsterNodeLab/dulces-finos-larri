/**
 * Carga .env.local / .env para scripts (Next lo hace solo para el servidor web).
 * Parser mínimo: KEY=valor, comillas opcionales, comentarios con #. No sobrescribe variables ya definidas.
 */
import fs from "node:fs";
import path from "node:path";

export function loadEnvConfig(dir = process.cwd()) {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
