/**
 * Migraciones SQLite reproducibles. Se aplican en orden y se registran en schema_migrations.
 * Nunca edites una migración ya publicada: agrega una nueva.
 */
export const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "initial",
    sql: `
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL CHECK (brand IN ('vision-one','visionquant')),
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idea',
  idea TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  scheduled_for TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_projects_brand ON projects(brand, updated_at);

CREATE TABLE research (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  angles TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  title TEXT NOT NULL,
  publisher TEXT,
  published_at TEXT,
  accessed_at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('primary','secondary')),
  excerpt TEXT
);
CREATE INDEX idx_sources_project ON sources(project_id);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT,
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified','unverified','disputed')),
  note TEXT,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_claims_project ON claims(project_id);

CREATE TABLE scripts (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  segments TEXT NOT NULL,
  settings TEXT NOT NULL,
  provider TEXT NOT NULL,
  approved_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE script_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  segments TEXT NOT NULL,
  settings TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE storyboards (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  spec TEXT NOT NULL,
  provider TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE narrations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  duration_s REAL NOT NULL,
  alignment_source TEXT NOT NULL,
  words TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_narrations_project ON narrations(project_id, is_active);

CREATE TABLE render_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  quality TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  spec TEXT NOT NULL,
  output_path TEXT,
  output_meta TEXT,
  error TEXT,
  pid INTEGER,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);
CREATE INDEX idx_render_jobs_status ON render_jobs(status, created_at);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  license_note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT,
  views INTEGER, likes INTEGER, comments INTEGER, shares INTEGER, saves INTEGER,
  recorded_at TEXT NOT NULL,
  origin TEXT NOT NULL
);

CREATE TABLE ai_usage (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  characters INTEGER NOT NULL DEFAULT 0,
  est_cost_usd REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ai_usage_time ON ai_usage(created_at);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`,
  },
];
