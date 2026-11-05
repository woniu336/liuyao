import { describe, expect, it } from 'vitest';
import { LocalCaseStore, MemoryCaseStore } from '../lib/store';
import { CASE_STORAGE_KEY, MAX_CASES, type CaseRecord, type StorageLike } from '../lib/store/types';

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function rec(id: string, createdAt: string, kind: 'liuyao' | 'xct' = 'liuyao'): CaseRecord {
  return {
    id,
    schema: 1,
    kind,
    createdAt,
    timeInput: '2026-11-05T12:02',
    question: `问${id}`,
    gender: '男',
    input:
      kind === 'liuyao'
        ? { kind, method: 'coin', coins: [1, 1, 1, 1, 1, 1], question: '', gender: '男' }
        : { kind, method: 'four', tianDiNums: ['1', '1', '4', '6'] },
    summary: { primary: '乾为天', changed: null },
  };
}

describe('卦例存储', () => {
  it('保存 / 读取 / 按时间倒序', async () => {
    const store = new LocalCaseStore(new FakeStorage());
    await store.save(rec('a', '2026-11-05T10:00:00.000Z'));
    await store.save(rec('b', '2026-11-05T11:00:00.000Z'));
    const list = await store.list();
    expect(list.map((r) => r.id)).toEqual(['b', 'a']);
    expect((await store.get('a'))?.question).toBe('问a');
    expect(await store.get('missing')).toBeNull();
  });

  it('超过上限时丢弃最旧的，保留最新', async () => {
    const store = new LocalCaseStore(new FakeStorage());
    for (let i = 0; i < MAX_CASES + 5; i += 1) {
      const t = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
      await store.save(rec(`c${i}`, t));
    }
    const list = await store.list();
    expect(list.length).toBe(MAX_CASES);
    expect(list[0].id).toBe(`c${MAX_CASES + 4}`);
    expect(list.some((r) => r.id === 'c0')).toBe(false);
  });

  it('坏数据不抛错，且后续写入能自愈', async () => {
    const storage = new FakeStorage();
    storage.setItem(CASE_STORAGE_KEY, '{ not json');
    const store = new LocalCaseStore(storage);
    expect(await store.list()).toEqual([]);

    await store.save(rec('ok', '2026-11-05T12:00:00.000Z'));
    expect((await store.list()).map((r) => r.id)).toEqual(['ok']);
  });

  it('删除与收藏', async () => {
    const store = new LocalCaseStore(new FakeStorage());
    await store.save(rec('a', '2026-11-05T10:00:00.000Z'));
    await store.save(rec('b', '2026-11-05T11:00:00.000Z'));
    await store.setFavorite('a', true);
    expect((await store.get('a'))?.favorite).toBe(true);
    await store.remove('b');
    expect((await store.list()).map((r) => r.id)).toEqual(['a']);
  });

  it('旧记录缺 favorite 字段时由迁移补全', async () => {
    const storage = new FakeStorage();
    const legacy = rec('old', '2026-01-01T00:00:00.000Z');
    delete legacy.favorite;
    storage.setItem(CASE_STORAGE_KEY, JSON.stringify({ version: 1, items: [legacy] }));
    const store = new LocalCaseStore(storage);
    expect((await store.get('old'))?.favorite).toBe(false);
  });

  it('内存实现与本地实现行为一致', async () => {
    const store = new MemoryCaseStore();
    await store.save(rec('a', '2026-11-05T10:00:00.000Z'));
    await store.save(rec('b', '2026-11-05T11:00:00.000Z'));
    expect((await store.list()).map((r) => r.id)).toEqual(['b', 'a']);
  });
});
