import { randomBytes } from "node:crypto";

/** IDs cortos, ordenables por tiempo y seguros para rutas de archivo. */
export function newId(prefix = ""): string {
  const t = Date.now().toString(36);
  const r = randomBytes(5).toString("hex");
  return `${prefix}${t}${r}`;
}

export const nowIso = () => new Date().toISOString();
