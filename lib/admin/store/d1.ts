import type { AuditEntry, LlmProfile } from '../types';
import { SCHEMA_STATEMENTS } from './schema.generated';
import type { AdminStore } from './types';
import type { D1Like } from './d1-types';

interface ProfileRow {
  id: string;
  label: string;
  base_url: string;
  model: string;
  key_env: string;
  enabled: number;
  sort: number;
  updated_at: string;
}

interface AuditRow {
  id: number;
  at: string;
  actor: string;
  action: string;
  detail: string | null;
}

const ensured = new WeakSet<object>();

/**
 * D1 实现。
 *
 * 首次使用时执行一次 `CREATE TABLE IF NOT EXISTS`（语句来自 migrations/*.sql 的生成物），
 * 让本地 D1 与首次部署都能直接跑；后续 schema 变更仍走 migrations 文件。
 */
export class D1AdminStore implements AdminStore {
  constructor(private readonly db: D1Like) {}

  private async ready(): Promise<void> {
    if (ensured.has(this.db as unknown as object)) return;
    for (const statement of SCHEMA_STATEMENTS) {
      await this.db.prepare(statement).run();
    }
    ensured.add(this.db as unknown as object);
  }

  async getSetting<T>(key: string): Promise<T | null> {
    await this.ready();
    const row = await this.db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
    if (!row?.value) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }

  async setSetting(key: string, value: unknown, actor: string): Promise<void> {
    await this.ready();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      )
      .bind(key, JSON.stringify(value), now, actor)
      .run();
    await this.appendAudit(actor, `setting.${key}`, summarize(value));
  }

  async listProfiles(): Promise<LlmProfile[]> {
    await this.ready();
    const res = await this.db
      .prepare('SELECT * FROM llm_profiles ORDER BY sort ASC, label ASC')
      .all<ProfileRow>();
    return (res.results ?? []).map(rowToProfile);
  }

  async upsertProfile(profile: LlmProfile, actor: string): Promise<void> {
    await this.ready();
    await this.db
      .prepare(
        `INSERT INTO llm_profiles (id, label, base_url, model, key_env, enabled, sort, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label, base_url = excluded.base_url, model = excluded.model,
           key_env = excluded.key_env, enabled = excluded.enabled, sort = excluded.sort,
           updated_at = excluded.updated_at`,
      )
      .bind(
        profile.id,
        profile.label,
        profile.baseUrl,
        profile.model,
        profile.keyEnv,
        profile.enabled ? 1 : 0,
        profile.sort,
        profile.updatedAt,
      )
      .run();
    await this.appendAudit(actor, 'llm.profile.upsert', profile.id);
  }

  async deleteProfile(id: string, actor: string): Promise<void> {
    await this.ready();
    await this.db.prepare('DELETE FROM llm_profiles WHERE id = ?').bind(id).run();
    await this.appendAudit(actor, 'llm.profile.delete', id);
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    await this.ready();
    const n = Math.max(1, Math.min(limit, 200));
    const res = await this.db
      .prepare('SELECT id, at, actor, action, detail FROM admin_audit ORDER BY id DESC LIMIT ?')
      .bind(n)
      .all<AuditRow>();
    return (res.results ?? []).map((r) => ({
      id: r.id,
      at: r.at,
      actor: r.actor,
      action: r.action,
      detail: r.detail,
    }));
  }

  async appendAudit(actor: string, action: string, detail?: string | null): Promise<void> {
    await this.ready();
    await this.db
      .prepare('INSERT INTO admin_audit (at, actor, action, detail) VALUES (?, ?, ?, ?)')
      .bind(new Date().toISOString(), actor, action, detail ?? null)
      .run();
  }
}

function rowToProfile(row: ProfileRow): LlmProfile {
  return {
    id: row.id,
    label: row.label,
    baseUrl: row.base_url,
    model: row.model,
    keyEnv: row.key_env,
    enabled: Boolean(row.enabled),
    sort: row.sort,
    updatedAt: row.updated_at,
  };
}

function summarize(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    return s && s.length > 500 ? `${s.slice(0, 500)}…` : (s ?? '');
  } catch {
    return '';
  }
}
