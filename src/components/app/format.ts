const LOCALE = "es-MX";

export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(iso: string | null | undefined, fallback = "—"): string {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" }) : fallback;
}

export function fmtDateTime(iso: string | null | undefined, fallback = "—"): string {
  const d = parseDate(iso);
  return d ? d.toLocaleString(LOCALE, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : fallback;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 83.4 → "1:23" */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtSeconds(seconds: number, digits = 1): string {
  return `${seconds.toFixed(digits)} s`;
}

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2025-11-04T…" o "2025-11-04" → "2025-11-04" (día local si trae hora). */
export function dayKeyOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = parseDate(iso);
  return d ? toDayKey(d) : null;
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Ruta de un archivo de data/media servida por /api/media. */
export function mediaUrl(rel: string): string {
  return `/api/media/${rel.split("/").map(encodeURIComponent).join("/")}`;
}
