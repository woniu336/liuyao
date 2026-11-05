-- 0001_init.sql
-- 后台与共享状态的初始表结构（Cloudflare D1 / SQLite）
-- 约定：所有时间用 ISO-8601 字符串；JSON 以 TEXT 存储。

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS llm_profiles (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  base_url   TEXT NOT NULL,
  model      TEXT NOT NULL,
  key_env    TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  sort       INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL DEFAULT 'local',
  kind         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  time_input   TEXT NOT NULL,
  question     TEXT NOT NULL DEFAULT '',
  gender       TEXT,
  input_json   TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  favorite     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cases_owner_created ON cases (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit (at DESC);
