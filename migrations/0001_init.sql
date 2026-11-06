-- 0001_init.sql
-- 卦例表（Cloudflare D1 / SQLite）
-- 约定：所有时间用 ISO-8601 字符串；JSON 以 TEXT 存储。
-- 说明：后台（settings / llm_profiles / admin_audit）已下线，
-- 大模型配置改由用户自带、只存在本机浏览器，服务端不落库。

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
