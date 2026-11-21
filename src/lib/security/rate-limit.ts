import { countAiCallsSince } from "../store";

export class RateLimitError extends Error {}

/** Límite de llamadas por hora por proveedor (persistente en SQLite: sobrevive reinicios). */
export function assertWithinRate(provider: string, maxPerHour: number) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const n = countAiCallsSince(provider, since);
  if (n >= maxPerHour) throw new RateLimitError(`Límite de ${maxPerHour} llamadas/hora a ${provider} alcanzado. Ajusta el límite en .env.local si es intencional.`);
}
