/**
 * localStorage 版卦例存储。
 *
 * 读写都是「整包读 → 改 → 整包写」，记录上限 MAX_CASES，
 * 按 createdAt 倒序保留，避免长年使用把 5MB 配额撑爆。
 * 读到坏数据不抛错（用户不该因为一条脏记录看不到卦例夹），但写入前会把
 * 能解析的条目尽量留下。
 */

import {
  CASE_SCHEMA_VERSION,
  CASE_STORAGE_KEY,
  MAX_CASES,
  type CaseRecord,
  type CaseStore,
  type StorageLike,
} from './types';

interface Envelope {
  version: number;
  items: CaseRecord[];
}

function isRecord(x: unknown): x is CaseRecord {
  if (!x || typeof x !== 'object') return false;
  const r = x as Partial<CaseRecord>;
  return (
    typeof r.id === 'string' &&
    (r.kind === 'liuyao' || r.kind === 'xct') &&
    typeof r.createdAt === 'string' &&
    typeof r.timeInput === 'string' &&
    typeof r.question === 'string' &&
    !!r.input &&
    typeof r.input === 'object' &&
    !!r.summary &&
    typeof r.summary === 'object'
  );
}

/** 逐版迁移入口：目前只有 v1，留好钩子 */
function migrate(raw: unknown): CaseRecord[] {
  if (!raw || typeof raw !== 'object') return [];
  const env = raw as Partial<Envelope>;
  if (!Array.isArray(env.items)) return [];
  const items = env.items.filter(isRecord).map((r) => {
    // v1 是当前版本；将来 v1→v2 的字段补全写在这里
    return { ...r, schema: CASE_SCHEMA_VERSION, favorite: Boolean(r.favorite) };
  });
  return items;
}

export class LocalCaseStore implements CaseStore {
  constructor(private readonly storage: StorageLike) {}

  private read(): CaseRecord[] {
    let text: string | null = null;
    try {
      text = this.storage.getItem(CASE_STORAGE_KEY);
    } catch {
      return [];
    }
    if (!text) return [];
    try {
      return migrate(JSON.parse(text));
    } catch {
      return [];
    }
  }

  private write(items: CaseRecord[]): void {
    const sorted = [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, MAX_CASES);
    const env: Envelope = { version: CASE_SCHEMA_VERSION, items: sorted };
    this.storage.setItem(CASE_STORAGE_KEY, JSON.stringify(env));
  }

  async list(): Promise<CaseRecord[]> {
    return this.read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async get(id: string): Promise<CaseRecord | null> {
    return this.read().find((r) => r.id === id) ?? null;
  }

  async save(record: CaseRecord): Promise<void> {
    const items = this.read().filter((r) => r.id !== record.id);
    items.push(record);
    this.write(items);
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((r) => r.id !== id));
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    this.write(this.read().map((r) => (r.id === id ? { ...r, favorite } : r)));
  }
}

/** 测试 / SSR 用的内存实现 */
export class MemoryCaseStore implements CaseStore {
  private items: CaseRecord[] = [];
  async list() {
    return [...this.items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async get(id: string) {
    return this.items.find((r) => r.id === id) ?? null;
  }
  async save(record: CaseRecord) {
    this.items = this.items.filter((r) => r.id !== record.id);
    this.items.push(record);
  }
  async remove(id: string) {
    this.items = this.items.filter((r) => r.id !== id);
  }
  async setFavorite(id: string, favorite: boolean) {
    this.items = this.items.map((r) => (r.id === id ? { ...r, favorite } : r));
  }
}
