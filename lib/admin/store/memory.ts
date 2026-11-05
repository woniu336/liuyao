import type { AuditEntry, LlmProfile } from '../types';
import type { AdminStore } from './types';

/**
 * 内存实现：next dev（无 Workers 绑定）与测试用。
 * 进程/模块重载即清空——界面上会明确提示当前是内存模式。
 */
export class MemoryAdminStore implements AdminStore {
  private settings = new Map<string, unknown>();
  private profiles = new Map<string, LlmProfile>();
  private audit: AuditEntry[] = [];
  private nextAuditId = 1;

  async getSetting<T>(key: string): Promise<T | null> {
    return this.settings.has(key) ? (this.settings.get(key) as T) : null;
  }

  async setSetting(key: string, value: unknown, actor: string): Promise<void> {
    this.settings.set(key, value);
    await this.appendAudit(actor, `setting.${key}`, summarize(value));
  }

  async listProfiles(): Promise<LlmProfile[]> {
    return [...this.profiles.values()].sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
  }

  async upsertProfile(profile: LlmProfile, actor: string): Promise<void> {
    this.profiles.set(profile.id, profile);
    await this.appendAudit(actor, 'llm.profile.upsert', profile.id);
  }

  async deleteProfile(id: string, actor: string): Promise<void> {
    this.profiles.delete(id);
    await this.appendAudit(actor, 'llm.profile.delete', id);
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    return this.audit.slice(0, Math.max(0, Math.min(limit, 200)));
  }

  async appendAudit(actor: string, action: string, detail?: string | null): Promise<void> {
    this.audit.unshift({
      id: this.nextAuditId++,
      at: new Date().toISOString(),
      actor,
      action,
      detail: detail ?? null,
    });
    if (this.audit.length > 500) this.audit.length = 500;
  }
}

function summarize(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    return s && s.length > 500 ? `${s.slice(0, 500)}…` : (s ?? '');
  } catch {
    return '';
  }
}
