/* 由 scripts/gen-admin-schema.mjs 生成，请勿手改。
 * 事实源：migrations/*.sql
 */

export const SCHEMA_SQL = "-- >>> 0001_init.sql\n-- 0001_init.sql\n-- 后台与共享状态的初始表结构（Cloudflare D1 / SQLite）\n-- 约定：所有时间用 ISO-8601 字符串；JSON 以 TEXT 存储。\n\nCREATE TABLE IF NOT EXISTS settings (\n  key        TEXT PRIMARY KEY,\n  value      TEXT NOT NULL,\n  updated_at TEXT NOT NULL,\n  updated_by TEXT NOT NULL DEFAULT 'system'\n);\n\nCREATE TABLE IF NOT EXISTS llm_profiles (\n  id         TEXT PRIMARY KEY,\n  label      TEXT NOT NULL,\n  base_url   TEXT NOT NULL,\n  model      TEXT NOT NULL,\n  key_env    TEXT NOT NULL,\n  enabled    INTEGER NOT NULL DEFAULT 1,\n  sort       INTEGER NOT NULL DEFAULT 0,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS cases (\n  id           TEXT PRIMARY KEY,\n  owner_id     TEXT NOT NULL DEFAULT 'local',\n  kind         TEXT NOT NULL,\n  created_at   TEXT NOT NULL,\n  time_input   TEXT NOT NULL,\n  question     TEXT NOT NULL DEFAULT '',\n  gender       TEXT,\n  input_json   TEXT NOT NULL,\n  summary_json TEXT NOT NULL,\n  favorite     INTEGER NOT NULL DEFAULT 0\n);\n\nCREATE INDEX IF NOT EXISTS idx_cases_owner_created ON cases (owner_id, created_at DESC);\n\nCREATE TABLE IF NOT EXISTS admin_audit (\n  id     INTEGER PRIMARY KEY AUTOINCREMENT,\n  at     TEXT NOT NULL,\n  actor  TEXT NOT NULL,\n  action TEXT NOT NULL,\n  detail TEXT\n);\n\nCREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit (at DESC);";

export const SCHEMA_STATEMENTS: readonly string[] = [
  "CREATE TABLE IF NOT EXISTS settings (\n  key        TEXT PRIMARY KEY,\n  value      TEXT NOT NULL,\n  updated_at TEXT NOT NULL,\n  updated_by TEXT NOT NULL DEFAULT 'system'\n)",
  "CREATE TABLE IF NOT EXISTS llm_profiles (\n  id         TEXT PRIMARY KEY,\n  label      TEXT NOT NULL,\n  base_url   TEXT NOT NULL,\n  model      TEXT NOT NULL,\n  key_env    TEXT NOT NULL,\n  enabled    INTEGER NOT NULL DEFAULT 1,\n  sort       INTEGER NOT NULL DEFAULT 0,\n  updated_at TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS cases (\n  id           TEXT PRIMARY KEY,\n  owner_id     TEXT NOT NULL DEFAULT 'local',\n  kind         TEXT NOT NULL,\n  created_at   TEXT NOT NULL,\n  time_input   TEXT NOT NULL,\n  question     TEXT NOT NULL DEFAULT '',\n  gender       TEXT,\n  input_json   TEXT NOT NULL,\n  summary_json TEXT NOT NULL,\n  favorite     INTEGER NOT NULL DEFAULT 0\n)",
  "CREATE INDEX IF NOT EXISTS idx_cases_owner_created ON cases (owner_id, created_at DESC)",
  "CREATE TABLE IF NOT EXISTS admin_audit (\n  id     INTEGER PRIMARY KEY AUTOINCREMENT,\n  at     TEXT NOT NULL,\n  actor  TEXT NOT NULL,\n  action TEXT NOT NULL,\n  detail TEXT\n)",
  "CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit (at DESC)"
];
