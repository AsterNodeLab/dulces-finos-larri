/**
 * Acceso a SQLite con el módulo nativo de Node (node:sqlite, Node >= 22.13).
 * Ventaja de portabilidad: no requiere compilar módulos nativos en Windows.
 */
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { MIGRATIONS } from "./migrations";
import { ensureDirs, paths } from "../paths";

/**
 * process.getBuiltinModule (Node >= 22.3) carga el módulo nativo en tiempo de ejecución sin pasar por el
 * bundler: funciona igual con Turbopack, webpack, tsx y vitest.
 */
function loadSqlite(): typeof import("node:sqlite") {
  const mod = process.getBuiltinModule?.("node:sqlite") as typeof import("node:sqlite") | undefined;
  if (!mod) throw new Error("node:sqlite no disponible: se requiere Node.js >= 22.13.");
  return mod;
}

const g = globalThis as unknown as { __vqDb?: DatabaseSyncType };

export function db(): DatabaseSyncType {
  if (g.__vqDb) return g.__vqDb;
  ensureDirs();
  silenceSqliteWarning();
  const { DatabaseSync } = loadSqlite();
  const conn = new DatabaseSync(paths.db);
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(conn);
  g.__vqDb = conn;
  return conn;
}

export function migrate(conn: DatabaseSyncType): number[] {
  conn.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
  const applied = new Set((conn.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id));
  const done: number[] = [];
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    conn.exec("BEGIN");
    try {
      conn.exec(m.sql);
      conn.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(m.id, m.name, new Date().toISOString());
      conn.exec("COMMIT");
      done.push(m.id);
    } catch (e) {
      conn.exec("ROLLBACK");
      throw e;
    }
  }
  return done;
}

export function tx<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const r = fn();
    conn.exec("COMMIT");
    return r;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

let warned = false;
function silenceSqliteWarning() {
  if (warned) return;
  warned = true;
  const orig = process.emitWarning.bind(process);
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const msg = typeof warning === "string" ? warning : warning?.message;
    if (msg && msg.includes("SQLite is an experimental feature")) return;
    return (orig as (...a: unknown[]) => void)(warning, ...rest);
  }) as typeof process.emitWarning;
}

/** Parse JSON almacenado; ante corrupción devuelve el fallback. */
export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
