import { LocalCaseStore, MemoryCaseStore } from './local-store';
import { RemoteCaseStore } from './remote';
import type { CaseStore } from './types';

const MIGRATED_KEY = 'liuyao.cases.migrated.v1';

let pending: Promise<CaseStore> | null = null;

/**
 * 取卦例存储（异步）。
 *
 * 1. 先问服务端 `/api/cases?probe=1`：
 *    - mode=d1 → 用远端存储（匿名设备 Cookie 归属，持久化）
 *    - mode=memory（next dev 无绑定）→ 用本地 localStorage，避免"重启就丢"的错觉
 * 2. 接口不可用（离线/未部署）→ 本地 localStorage
 * 3. 切到远端时，把 localStorage 里的旧卦例一次性导入（按 id 幂等），避免历史丢失
 */
export function getCaseStore(): Promise<CaseStore> {
  if (!pending) pending = resolveCaseStore();
  return pending;
}

async function resolveCaseStore(): Promise<CaseStore> {
  if (typeof window === 'undefined') return new MemoryCaseStore();

  try {
    const res = await fetch('/api/cases?probe=1', { cache: 'no-store' });
    if (res.ok) {
      const { mode } = (await res.json()) as { mode?: string };
      if (mode === 'd1') {
        const remote = new RemoteCaseStore();
        await migrateLocalCases(remote);
        return remote;
      }
    }
  } catch {
    /* 接口不可用：退回本地 */
  }

  return localCaseStore();
}

function localCaseStore(): CaseStore {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probe = '__liuyao_cases_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return new LocalCaseStore(window.localStorage);
    } catch {
      /* 隐私模式 / 配额禁用 */
    }
  }
  return new MemoryCaseStore();
}

async function migrateLocalCases(remote: RemoteCaseStore): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (window.localStorage.getItem(MIGRATED_KEY)) return;
  } catch {
    return;
  }
  try {
    const records = await new LocalCaseStore(window.localStorage).list();
    await remote.importAll(records);
    window.localStorage.setItem(MIGRATED_KEY, '1');
  } catch {
    /* 网络失败就下次再试；不阻塞本次使用 */
  }
}

/** 测试用：重置单例 */
export function __resetCaseStoreForTests(store?: CaseStore) {
  pending = store ? Promise.resolve(store) : null;
}

export { LocalCaseStore, MemoryCaseStore, RemoteCaseStore };
export * from './types';
