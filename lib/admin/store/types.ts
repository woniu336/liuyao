import type { AuditEntry, LlmProfile } from '../types';

/**
 * 后台数据存取接口。
 *
 * 所有方法异步：现在有内存实现（next dev / 测试）与 D1 实现（Workers），
 * 以后即使换成别的存储，调用方与 UI 都不用改。
 *
 * 写操作自带审计（actor + action），避免某个路由忘了记。
 */
export interface AdminStore {
  getSetting<T>(key: string): Promise<T | null>;
  setSetting(key: string, value: unknown, actor: string): Promise<void>;

  listProfiles(): Promise<LlmProfile[]>;
  upsertProfile(profile: LlmProfile, actor: string): Promise<void>;
  deleteProfile(id: string, actor: string): Promise<void>;

  listAudit(limit: number): Promise<AuditEntry[]>;
  appendAudit(actor: string, action: string, detail?: string | null): Promise<void>;
}
