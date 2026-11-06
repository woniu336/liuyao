import type { D1Like } from '@/lib/db/d1-types';
import { getRuntimeEnv } from '@/lib/db/runtime';
import { D1CaseStore } from './d1-case-store';
import { MemoryCaseStore } from './local-store';
import type { CaseStore } from './types';

const memoryByOwner = new Map<string, MemoryCaseStore>();

/**
 * 服务端卦例存储（按匿名 owner 隔离）。
 *
 * - Workers/线上（有 DB 绑定）：D1
 * - next dev（无绑定）：进程内存（客户端会看到 mode=memory，改走 localStorage，避免"重启就丢"的错觉）
 */
export async function getServerCaseStore(ownerId: string): Promise<{ store: CaseStore; mode: 'd1' | 'memory' }> {
  const env = await getRuntimeEnv();
  const db = env?.DB as D1Like | undefined;
  if (db) return { store: new D1CaseStore(db, ownerId), mode: 'd1' };

  let store = memoryByOwner.get(ownerId);
  if (!store) {
    store = new MemoryCaseStore();
    memoryByOwner.set(ownerId, store);
  }
  return { store, mode: 'memory' };
}
