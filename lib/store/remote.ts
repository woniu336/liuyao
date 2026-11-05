import type { CaseRecord, CaseStore } from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error || `请求失败（${res.status}）`);
  return json;
}

/**
 * 远端卦例存储（D1）。归属由服务端的匿名设备 Cookie 决定，客户端不传 owner。
 */
export class RemoteCaseStore implements CaseStore {
  readonly mode = 'remote' as const;

  async list(): Promise<CaseRecord[]> {
    const { cases } = await request<{ cases: CaseRecord[] }>('/api/cases');
    return cases;
  }

  async get(id: string): Promise<CaseRecord | null> {
    const res = await fetch(`/api/cases?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`读取卦例失败（${res.status}）`);
    const json = (await res.json()) as { case?: CaseRecord | null };
    return json.case ?? null;
  }

  async save(record: CaseRecord): Promise<void> {
    await request('/api/cases', { method: 'POST', body: JSON.stringify({ record }) });
  }

  async remove(id: string): Promise<void> {
    await request(`/api/cases?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    await request('/api/cases', { method: 'PATCH', body: JSON.stringify({ id, favorite }) });
  }

  /** 一次性导入（本地 → 远端迁移用） */
  async importAll(records: CaseRecord[]): Promise<void> {
    if (!records.length) return;
    await request('/api/cases', { method: 'POST', body: JSON.stringify({ cases: records }) });
  }
}
