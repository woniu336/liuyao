import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteCaseStore } from '../lib/store/remote';
import type { CaseRecord } from '../lib/store/types';

const record: CaseRecord = {
  id: 'abcdefgh-1234',
  schema: 1,
  kind: 'liuyao',
  createdAt: '2026-11-05T05:00:00.000Z',
  timeInput: '2026-11-05T12:02',
  question: '测试',
  gender: '男',
  input: { kind: 'liuyao', method: 'coin', coins: [7, 7, 7, 7, 7, 7], question: '', gender: '男' },
  summary: { primary: '乾为天', changed: null },
};

const calls: { url: string; method: string; body?: string }[] = [];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  calls.length = 0;
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined });
    if (u.includes('id=missing')) return new Response('', { status: 404 });
    if (u.includes('?probe=1')) return Response.json({ mode: 'd1' });
    if (!u.includes('id=')) return Response.json({ mode: 'd1', cases: [record], case: record });
    return Response.json({ mode: 'd1', case: record });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('远端卦例存储（客户端）', () => {
  it('list 走 GET /api/cases', async () => {
    const store = new RemoteCaseStore();
    expect(await store.list()).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: '/api/cases', method: 'GET' });
    expect(store.mode).toBe('remote');
  });

  it('get：404 返回 null，命中返回记录', async () => {
    const store = new RemoteCaseStore();
    expect(await store.get('missing')).toBeNull();
    expect((await store.get('abcdefgh-1234'))?.id).toBe(record.id);
  });

  it('save / remove / setFavorite / importAll 的方法与体正确', async () => {
    const store = new RemoteCaseStore();
    await store.save(record);
    await store.remove(record.id);
    await store.setFavorite(record.id, true);
    await store.importAll([record]);

    expect(calls[0]).toMatchObject({ url: '/api/cases', method: 'POST' });
    expect(JSON.parse(calls[0].body!)).toEqual({ record });
    expect(calls[1].method).toBe('DELETE');
    expect(calls[1].url).toContain('id=abcdefgh-1234');
    expect(calls[2].method).toBe('PATCH');
    expect(JSON.parse(calls[2].body!)).toEqual({ id: record.id, favorite: true });
    expect(JSON.parse(calls[3].body!)).toEqual({ cases: [record] });
  });

  it('服务端报错时抛出可读错误', async () => {
    globalThis.fetch = vi.fn(async () => Response.json({ error: '写入过于频繁' }, { status: 429 })) as typeof fetch;
    const store = new RemoteCaseStore();
    await expect(store.save(record)).rejects.toThrow('写入过于频繁');
  });
});
