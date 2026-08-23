export const SHADER_POCKET_DATABASE_FILENAME = "/shader-pocket.sqlite3";
export const SHADER_POCKET_DATABASE_VERSION = 5;
export const SHADER_POCKET_APPLICATION_ID = 0x53504b54;

export const CREATE_DATABASE_SCHEMA_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    functions_source TEXT NOT NULL DEFAULT '',
    active_pass_id TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS passes (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    language TEXT NOT NULL,
    source TEXT NOT NULL,
    uniform_values_json TEXT NOT NULL DEFAULT '{}',
    resolution_scale REAL NOT NULL DEFAULT 1,
    UNIQUE(project_id, position)
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    reason TEXT NOT NULL,
    name TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    content_hash TEXT NOT NULL,
    document_json TEXT NOT NULL,
    UNIQUE(project_id, content_hash)
  );

  CREATE TABLE IF NOT EXISTS global_sources (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);
  CREATE INDEX IF NOT EXISTS snapshots_project_created_idx
    ON snapshots(project_id, created_at DESC);
`;
