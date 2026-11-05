import { getRuntimeEnv } from '../server/runtime';
import { D1AdminStore } from './d1';
import type { D1Like } from './d1-types';
import { MemoryAdminStore } from './memory';
import type { AdminStore } from './types';

export interface AdminStoreHandle {
  store: AdminStore;
  mode: 'd1' | 'memory';
}

let memory: MemoryAdminStore | null = null;
const d1Stores = new WeakMap<object, D1AdminStore>();

/**
 * 取后台存储。
 *
 * - Workers（vinext / 线上）：用 `DB` 绑定，mode = 'd1'
 * - next dev / 测试：没有绑定，退回内存实现，mode = 'memory'（UI 会明示）
 */
export async function getAdminStore(): Promise<AdminStoreHandle> {
  const env = await getRuntimeEnv();
  const db = env?.DB as D1Like | undefined;
  if (db) {
    let store = d1Stores.get(db as unknown as object);
    if (!store) {
      store = new D1AdminStore(db);
      d1Stores.set(db as unknown as object, store);
    }
    return { store, mode: 'd1' };
  }
  memory ??= new MemoryAdminStore();
  return { store: memory, mode: 'memory' };
}

/** 测试用：重置内存单例 */
export function __resetAdminStoreForTests() {
  memory = null;
}

export { MemoryAdminStore, D1AdminStore };
export type { AdminStore } from './types';
