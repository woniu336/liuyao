/* 由 scripts/gen-db-schema.mjs 生成，请勿手改。
 * 事实源：migrations/*.sql
 */

export const SCHEMA_SQL = "-- >>> 0001_init.sql\n-- 0001_init.sql\n-- 卦例表（Cloudflare D1 / SQLite）\n-- 约定：所有时间用 ISO-8601 字符串；JSON 以 TEXT 存储。\n-- 说明：后台（settings / llm_profiles / admin_audit）已下线，\n-- 大模型配置改由用户自带、只存在本机浏览器，服务端不落库。\n\nCREATE TABLE IF NOT EXISTS cases (\n  id           TEXT PRIMARY KEY,\n  owner_id     TEXT NOT NULL DEFAULT 'local',\n  kind         TEXT NOT NULL,\n  created_at   TEXT NOT NULL,\n  time_input   TEXT NOT NULL,\n  question     TEXT NOT NULL DEFAULT '',\n  gender       TEXT,\n  input_json   TEXT NOT NULL,\n  summary_json TEXT NOT NULL,\n  favorite     INTEGER NOT NULL DEFAULT 0\n);\n\nCREATE INDEX IF NOT EXISTS idx_cases_owner_created ON cases (owner_id, created_at DESC);";

export const SCHEMA_STATEMENTS: readonly string[] = [
  "CREATE TABLE IF NOT EXISTS cases (\n  id           TEXT PRIMARY KEY,\n  owner_id     TEXT NOT NULL DEFAULT 'local',\n  kind         TEXT NOT NULL,\n  created_at   TEXT NOT NULL,\n  time_input   TEXT NOT NULL,\n  question     TEXT NOT NULL DEFAULT '',\n  gender       TEXT,\n  input_json   TEXT NOT NULL,\n  summary_json TEXT NOT NULL,\n  favorite     INTEGER NOT NULL DEFAULT 0\n)",
  "CREATE INDEX IF NOT EXISTS idx_cases_owner_created ON cases (owner_id, created_at DESC)"
];
