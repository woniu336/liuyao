import { LocalCaseStore, MemoryCaseStore } from './local-store';
import type { CaseStore } from './types';

let singleton: CaseStore | null = null;

/**
 * 取卦例存储。
 *
 * 浏览器里是 localStorage；SSR / 测试环境退回内存实现（不落盘、不抛错），
 * 保证组件在服务端渲染时调用也不会炸。
 *
 * 将来接 D1：`getCaseStore()` 按 `NEXT_PUBLIC_CASE_STORE` / 登录态返回 RemoteCaseStore 即可，
 * 调用方（CasesView、保存按钮）不用改。
 */
export function getCaseStore(): CaseStore {
  if (singleton) return singleton;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probe = '__liuyao_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      singleton = new LocalCaseStore(window.localStorage);
      return singleton;
    } catch {
      // 隐私模式 / 配额禁用：退回内存，本次会话仍可用
    }
  }
  singleton = new MemoryCaseStore();
  return singleton;
}

/** 测试用：重置单例 */
export function __resetCaseStoreForTests(store?: CaseStore) {
  singleton = store ?? null;
}

export { LocalCaseStore, MemoryCaseStore };
export * from './types';
