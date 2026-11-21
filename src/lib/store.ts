/**
 * Capa de persistencia (repositorio). Convierte filas SQLite ↔ tipos del contrato (src/shared/schema.ts).
 * Toda escritura valida con Zod antes de guardar.
 */
import { db, parseJson, tx } from "./db";
import { newId, nowIso } from "./ids";
import {
  AssetSchema,
  ClaimSchema,
  type Asset,
  type Claim,
  type CreateProjectInput,
  type MetricEntry,
  type Narration,
  type Project,
  type ProjectStatus,
  type RenderJob,
  type Research,
  type Script,
  type ScriptSegment,
  type ScriptSettings,
  type Source,
  SourceSchema,
  type VideoSpec,
  VideoSpecSchema,
  type WordTiming,
} from "@/shared/schema";

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? null : String(v));

/* ───────────────────────────── Proyectos ───────────────────────────── */

function toProject(r: Row): Project {
  return {
    id: String(r.id),
    title: String(r.title),
    brand: r.brand as Project["brand"],
    template: r.template as Project["template"],
    status: r.status as ProjectStatus,
    idea: String(r.idea ?? ""),
    isDemo: Number(r.is_demo) === 1,
    scheduledFor: s(r.scheduled_for),
    publishedAt: s(r.published_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export function listProjects(filter: { brand?: string; status?: string } = {}): Project[] {
  const where: string[] = [];
  const args: string[] = [];
  if (filter.brand) (where.push("brand = ?"), args.push(filter.brand));
  if (filter.status) (where.push("status = ?"), args.push(filter.status));
  const sql = `SELECT * FROM projects ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY updated_at DESC`;
  return (db().prepare(sql).all(...args) as Row[]).map(toProject);
}

export function getProject(id: string): Project | null {
  const r = db().prepare("SELECT * FROM projects WHERE id = ?").get(id) as Row | undefined;
  return r ? toProject(r) : null;
}

export function createProject(input: CreateProjectInput & { isDemo?: boolean; status?: ProjectStatus }): Project {
  const id = newId("p_");
  const now = nowIso();
  db()
    .prepare(
      "INSERT INTO projects (id,title,brand,template,status,idea,is_demo,scheduled_for,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    )
    .run(id, input.title, input.brand, input.template, input.status ?? "idea", input.idea ?? "", input.isDemo ? 1 : 0, input.scheduledFor ?? null, now, now);
  return getProject(id)!;
}

export function updateProject(
  id: string,
  patch: Partial<Pick<Project, "title" | "template" | "status" | "idea" | "scheduledFor" | "publishedAt">>,
): Project | null {
  const map: Record<string, string> = {
    title: "title",
    template: "template",
    status: "status",
    idea: "idea",
    scheduledFor: "scheduled_for",
    publishedAt: "published_at",
  };
  const sets: string[] = [];
  const args: (string | null)[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      sets.push(`${col} = ?`);
      args.push((patch as Record<string, string | null>)[k] ?? null);
    }
  }
  sets.push("updated_at = ?");
  args.push(nowIso());
  db().prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...args, id);
  return getProject(id);
}

export function touchProject(id: string) {
  db().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(nowIso(), id);
}

/** Avanza el estado solo hacia adelante (no retrocede un proyecto ya aprobado/exportado). */
const ORDER: ProjectStatus[] = ["idea", "research", "script", "production", "review", "approved", "exported"];
export function advanceStatus(id: string, to: ProjectStatus) {
  const p = getProject(id);
  if (!p) return;
  if (ORDER.indexOf(to) > ORDER.indexOf(p.status)) updateProject(id, { status: to });
  else touchProject(id);
}

export function deleteProject(id: string) {
  db().prepare("DELETE FROM projects WHERE id = ?").run(id);
}

/* ─────────────────────────── Investigación ─────────────────────────── */

export function getResearch(projectId: string): Research | null {
  const r = db().prepare("SELECT * FROM research WHERE project_id = ?").get(projectId) as Row | undefined;
  const sources = (db().prepare("SELECT * FROM sources WHERE project_id = ? ORDER BY rowid").all(projectId) as Row[]).map(
    (x): Source => ({
      id: String(x.id),
      url: s(x.url),
      title: String(x.title),
      publisher: s(x.publisher),
      publishedAt: s(x.published_at),
      accessedAt: String(x.accessed_at),
      kind: x.kind as Source["kind"],
      excerpt: s(x.excerpt),
    }),
  );
  const claims = (db().prepare("SELECT * FROM claims WHERE project_id = ? ORDER BY position, rowid").all(projectId) as Row[]).map(
    (x): Claim => ({ id: String(x.id), sourceId: s(x.source_id), text: String(x.text), status: x.status as Claim["status"], note: s(x.note) }),
  );
  if (!r && sources.length === 0 && claims.length === 0) return null;
  return {
    summary: String(r?.summary ?? ""),
    angles: parseJson(r?.angles as string, []),
    provider: String(r?.provider ?? "manual"),
    isDemo: Number(r?.is_demo ?? 0) === 1,
    updatedAt: String(r?.updated_at ?? nowIso()),
    sources,
    claims,
  };
}

/** Reemplaza por completo la investigación del proyecto (fuentes, claims, resumen). */
export function saveResearch(projectId: string, r: Omit<Research, "updatedAt">): Research {
  const now = nowIso();
  tx(() => {
    const conn = db();
    conn.prepare("DELETE FROM sources WHERE project_id = ?").run(projectId);
    conn.prepare("DELETE FROM claims WHERE project_id = ?").run(projectId);
    conn
      .prepare(
        "INSERT INTO research (project_id, summary, angles, provider, is_demo, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET summary=excluded.summary, angles=excluded.angles, provider=excluded.provider, is_demo=excluded.is_demo, updated_at=excluded.updated_at",
      )
      .run(projectId, r.summary, JSON.stringify(r.angles), r.provider, r.isDemo ? 1 : 0, now);
    const insS = conn.prepare(
      "INSERT INTO sources (id, project_id, url, title, publisher, published_at, accessed_at, kind, excerpt) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    for (const src of r.sources) {
      const v = SourceSchema.parse(src);
      insS.run(v.id, projectId, v.url, v.title, v.publisher, v.publishedAt, v.accessedAt, v.kind, v.excerpt);
    }
    const insC = conn.prepare("INSERT INTO claims (id, project_id, source_id, text, status, note, position) VALUES (?,?,?,?,?,?,?)");
    r.claims.forEach((c, i) => {
      const v = ClaimSchema.parse(c);
      insC.run(v.id, projectId, v.sourceId, v.text, v.status, v.note, i);
    });
  });
  touchProject(projectId);
  return getResearch(projectId)!;
}

/* ─────────────────────────────── Guion ─────────────────────────────── */

export function getScript(projectId: string): Script | null {
  const r = db().prepare("SELECT * FROM scripts WHERE project_id = ?").get(projectId) as Row | undefined;
  if (!r) return null;
  return {
    segments: parseJson<ScriptSegment[]>(r.segments as string, []),
    settings: parseJson<ScriptSettings>(r.settings as string, {} as ScriptSettings),
    provider: String(r.provider),
    approvedAt: s(r.approved_at),
    version: Number(r.version),
    updatedAt: String(r.updated_at),
  };
}

/** Guarda una nueva versión del guion. Editar un guion aprobado lo des-aprueba. */
export function saveScript(projectId: string, segments: ScriptSegment[], settings: ScriptSettings, provider: string, approvedAt: string | null = null): Script {
  const prev = getScript(projectId);
  const version = (prev?.version ?? 0) + 1;
  const now = nowIso();
  tx(() => {
    db()
      .prepare(
        "INSERT INTO scripts (project_id, segments, settings, provider, approved_at, version, updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET segments=excluded.segments, settings=excluded.settings, provider=excluded.provider, approved_at=excluded.approved_at, version=excluded.version, updated_at=excluded.updated_at",
      )
      .run(projectId, JSON.stringify(segments), JSON.stringify(settings), provider, approvedAt, version, now);
    db()
      .prepare("INSERT INTO script_versions (id, project_id, version, segments, settings, provider, created_at) VALUES (?,?,?,?,?,?,?)")
      .run(newId("sv_"), projectId, version, JSON.stringify(segments), JSON.stringify(settings), provider, now);
  });
  touchProject(projectId);
  return getScript(projectId)!;
}

export function approveScript(projectId: string): Script | null {
  db().prepare("UPDATE scripts SET approved_at = ?, updated_at = ? WHERE project_id = ?").run(nowIso(), nowIso(), projectId);
  advanceStatus(projectId, "production");
  return getScript(projectId);
}

export function listScriptVersions(projectId: string) {
  return (db().prepare("SELECT version, provider, created_at FROM script_versions WHERE project_id = ? ORDER BY version DESC").all(projectId) as Row[]).map(
    (r) => ({ version: Number(r.version), provider: String(r.provider), createdAt: String(r.created_at) }),
  );
}

/* ──────────────────────────── Storyboard ───────────────────────────── */

export function getStoryboard(projectId: string): { spec: VideoSpec; provider: string; updatedAt: string } | null {
  const r = db().prepare("SELECT * FROM storyboards WHERE project_id = ?").get(projectId) as Row | undefined;
  if (!r) return null;
  const parsed = VideoSpecSchema.safeParse(parseJson(r.spec as string, null));
  if (!parsed.success) return null;
  return { spec: parsed.data, provider: String(r.provider), updatedAt: String(r.updated_at) };
}

export function saveStoryboard(projectId: string, spec: VideoSpec, provider: string) {
  const v = VideoSpecSchema.parse(spec);
  db()
    .prepare(
      "INSERT INTO storyboards (project_id, spec, provider, updated_at) VALUES (?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET spec=excluded.spec, provider=excluded.provider, updated_at=excluded.updated_at",
    )
    .run(projectId, JSON.stringify(v), provider, nowIso());
  touchProject(projectId);
  return getStoryboard(projectId)!;
}

/* ───────────────────────────── Narración ───────────────────────────── */

function toNarration(r: Row): Narration {
  return {
    id: String(r.id),
    kind: r.kind as Narration["kind"],
    filePath: String(r.file_path),
    mime: String(r.mime),
    durationInSeconds: Number(r.duration_s),
    alignmentSource: r.alignment_source as Narration["alignmentSource"],
    words: parseJson<WordTiming[]>(r.words as string, []),
    createdAt: String(r.created_at),
  };
}

export function getActiveNarration(projectId: string): Narration | null {
  const r = db().prepare("SELECT * FROM narrations WHERE project_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1").get(projectId) as Row | undefined;
  return r ? toNarration(r) : null;
}

export function saveNarration(projectId: string, n: Omit<Narration, "id" | "createdAt">): Narration {
  const id = newId("n_");
  tx(() => {
    db().prepare("UPDATE narrations SET is_active = 0 WHERE project_id = ?").run(projectId);
    db()
      .prepare(
        "INSERT INTO narrations (id, project_id, kind, file_path, mime, duration_s, alignment_source, words, is_active, created_at) VALUES (?,?,?,?,?,?,?,?,1,?)",
      )
      .run(id, projectId, n.kind, n.filePath, n.mime, n.durationInSeconds, n.alignmentSource, JSON.stringify(n.words), nowIso());
  });
  touchProject(projectId);
  return getActiveNarration(projectId)!;
}

export function updateNarrationWords(projectId: string, words: WordTiming[]) {
  db().prepare("UPDATE narrations SET words = ? WHERE project_id = ? AND is_active = 1").run(JSON.stringify(words), projectId);
}

export function clearNarration(projectId: string) {
  db().prepare("UPDATE narrations SET is_active = 0 WHERE project_id = ?").run(projectId);
  touchProject(projectId);
}

/* ─────────────────────────────── Render ────────────────────────────── */

function toJob(r: Row): RenderJob {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    status: r.status as RenderJob["status"],
    quality: r.quality as RenderJob["quality"],
    progress: Number(r.progress),
    outputPath: s(r.output_path),
    error: s(r.error),
    createdAt: String(r.created_at),
    startedAt: s(r.started_at),
    finishedAt: s(r.finished_at),
    outputMeta: parseJson(r.output_meta as string, null),
  };
}

export function createRenderJob(projectId: string, quality: RenderJob["quality"], spec: VideoSpec): RenderJob {
  const id = newId("r_");
  db()
    .prepare("INSERT INTO render_jobs (id, project_id, status, quality, progress, spec, created_at) VALUES (?,?,?,?,0,?,?)")
    .run(id, projectId, "queued", quality, JSON.stringify(spec), nowIso());
  return getRenderJob(id)!;
}

export function getRenderJob(id: string): RenderJob | null {
  const r = db().prepare("SELECT * FROM render_jobs WHERE id = ?").get(id) as Row | undefined;
  return r ? toJob(r) : null;
}

export function getRenderJobSpec(id: string): VideoSpec | null {
  const r = db().prepare("SELECT spec FROM render_jobs WHERE id = ?").get(id) as Row | undefined;
  return r ? VideoSpecSchema.parse(JSON.parse(String(r.spec))) : null;
}

export function listRenderJobs(filter: { projectId?: string; limit?: number } = {}): RenderJob[] {
  const lim = Math.min(filter.limit ?? 50, 200);
  const rows = filter.projectId
    ? db().prepare("SELECT * FROM render_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?").all(filter.projectId, lim)
    : db().prepare("SELECT * FROM render_jobs ORDER BY created_at DESC LIMIT ?").all(lim);
  return (rows as Row[]).map(toJob);
}

export function nextQueuedJob(): RenderJob | null {
  const r = db().prepare("SELECT * FROM render_jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1").get() as Row | undefined;
  return r ? toJob(r) : null;
}

/** Reclama atómicamente el siguiente trabajo en cola (evita que dos workers tomen el mismo). */
export function claimNextJob(pid: number): RenderJob | null {
  for (let i = 0; i < 5; i++) {
    const next = nextQueuedJob();
    if (!next) return null;
    const r = db().prepare("UPDATE render_jobs SET status = 'bundling', pid = ?, started_at = ? WHERE id = ? AND status = 'queued'").run(pid, nowIso(), next.id);
    if (Number(r.changes) === 1) return getRenderJob(next.id);
  }
  return null;
}

export function activeJobs(): RenderJob[] {
  return (db().prepare("SELECT * FROM render_jobs WHERE status IN ('bundling','rendering')").all() as Row[]).map(toJob);
}

export function updateRenderJob(
  id: string,
  patch: Partial<{ status: RenderJob["status"]; progress: number; outputPath: string | null; error: string | null; startedAt: string; finishedAt: string; outputMeta: RenderJob["outputMeta"]; pid: number | null }>,
) {
  const map: Record<string, string> = {
    status: "status",
    progress: "progress",
    outputPath: "output_path",
    error: "error",
    startedAt: "started_at",
    finishedAt: "finished_at",
    outputMeta: "output_meta",
    pid: "pid",
  };
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      sets.push(`${col} = ?`);
      const v = (patch as Record<string, unknown>)[k];
      args.push(k === "outputMeta" ? (v ? JSON.stringify(v) : null) : (v as string | number | null));
    }
  }
  if (!sets.length) return;
  db().prepare(`UPDATE render_jobs SET ${sets.join(", ")} WHERE id = ?`).run(...args, id);
}

export function getJobPid(id: string): number | null {
  const r = db().prepare("SELECT pid FROM render_jobs WHERE id = ?").get(id) as Row | undefined;
  return r?.pid == null ? null : Number(r.pid);
}

/* ─────────────────────────────── Assets ────────────────────────────── */

function toAsset(r: Row): Asset {
  return AssetSchema.parse({
    id: r.id,
    brand: r.brand,
    kind: r.kind,
    label: r.label,
    filePath: r.file_path,
    mime: r.mime,
    licenseNote: r.license_note ?? null,
    createdAt: r.created_at,
  });
}

export function listAssets(brand?: string): Asset[] {
  const rows = brand ? db().prepare("SELECT * FROM assets WHERE brand = ? ORDER BY created_at DESC").all(brand) : db().prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
  return (rows as Row[]).map(toAsset);
}

export function getAsset(id: string): Asset | null {
  const r = db().prepare("SELECT * FROM assets WHERE id = ?").get(id) as Row | undefined;
  return r ? toAsset(r) : null;
}

export function createAsset(a: Omit<Asset, "id" | "createdAt">): Asset {
  const id = newId("a_");
  db()
    .prepare("INSERT INTO assets (id, brand, kind, label, file_path, mime, license_note, created_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, a.brand, a.kind, a.label, a.filePath, a.mime, a.licenseNote, nowIso());
  return getAsset(id)!;
}

export function deleteAsset(id: string) {
  db().prepare("DELETE FROM assets WHERE id = ?").run(id);
}

/* ────────────────────────────── Métricas ───────────────────────────── */

export function listMetrics(projectId?: string): MetricEntry[] {
  const rows = projectId
    ? db().prepare("SELECT * FROM metrics WHERE project_id = ? ORDER BY recorded_at DESC").all(projectId)
    : db().prepare("SELECT * FROM metrics ORDER BY recorded_at DESC").all();
  return (rows as Row[]).map((r) => ({
    id: String(r.id),
    projectId: String(r.project_id),
    platform: r.platform as MetricEntry["platform"],
    url: s(r.url),
    views: r.views == null ? null : Number(r.views),
    likes: r.likes == null ? null : Number(r.likes),
    comments: r.comments == null ? null : Number(r.comments),
    shares: r.shares == null ? null : Number(r.shares),
    saves: r.saves == null ? null : Number(r.saves),
    recordedAt: String(r.recorded_at),
    origin: r.origin as MetricEntry["origin"],
  }));
}

export function addMetric(m: Omit<MetricEntry, "id">): MetricEntry {
  const id = newId("m_");
  db()
    .prepare("INSERT INTO metrics (id, project_id, platform, url, views, likes, comments, shares, saves, recorded_at, origin) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, m.projectId, m.platform, m.url, m.views, m.likes, m.comments, m.shares, m.saves, m.recordedAt, m.origin);
  return listMetrics(m.projectId).find((x) => x.id === id)!;
}

export function deleteMetric(id: string) {
  db().prepare("DELETE FROM metrics WHERE id = ?").run(id);
}

/* ───────────────────────── Uso de IA y settings ────────────────────── */

export function logAiUsage(u: { projectId: string | null; provider: string; model: string; operation: string; inputTokens?: number; outputTokens?: number; characters?: number; estCostUsd?: number | null }) {
  db()
    .prepare("INSERT INTO ai_usage (id, project_id, provider, model, operation, input_tokens, output_tokens, characters, est_cost_usd, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(newId("u_"), u.projectId, u.provider, u.model, u.operation, u.inputTokens ?? 0, u.outputTokens ?? 0, u.characters ?? 0, u.estCostUsd ?? null, nowIso());
}

export function countAiCallsSince(provider: string, sinceIso: string): number {
  const r = db().prepare("SELECT COUNT(*) AS n FROM ai_usage WHERE provider = ? AND created_at >= ?").get(provider, sinceIso) as Row;
  return Number(r.n);
}

export function aiUsageForProject(projectId: string) {
  const rows = db()
    .prepare("SELECT provider, model, operation, input_tokens, output_tokens, characters, est_cost_usd, created_at FROM ai_usage WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as Row[];
  const total = rows.reduce((a, r) => a + (r.est_cost_usd == null ? 0 : Number(r.est_cost_usd)), 0);
  return {
    calls: rows.map((r) => ({
      provider: String(r.provider),
      model: String(r.model),
      operation: String(r.operation),
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      characters: Number(r.characters),
      estCostUsd: r.est_cost_usd == null ? null : Number(r.est_cost_usd),
      createdAt: String(r.created_at),
    })),
    estTotalUsd: total,
    hasUnpricedCalls: rows.some((r) => r.est_cost_usd == null),
  };
}

export function getSettings(): Record<string, string> {
  const rows = db().prepare("SELECT key, value FROM settings").all() as Row[];
  return Object.fromEntries(rows.map((r) => [String(r.key), String(r.value)]));
}

export function setSetting(key: string, value: string) {
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}
