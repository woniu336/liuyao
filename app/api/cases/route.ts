import { CaseValidationError, parseCaseRecord } from '@/lib/cases/validate';
import { clientIp, rateLimit, sameOrigin } from '@/lib/server/request';
import { getOrCreateDeviceId } from '@/lib/server/device';
import { getServerCaseStore } from '@/lib/store/server';
import type { CaseRecord } from '@/lib/store/types';

export const dynamic = 'force-dynamic';

const MAX_BODY = 512 * 1024;
const MAX_IMPORT = 200;

function respond(data: unknown, status = 200, setCookie?: string): Response {
  const res = Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (setCookie) res.headers.append('Set-Cookie', setCookie);
  return res;
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) throw new CaseValidationError('请求体过大');
  try {
    const json = JSON.parse(raw || '{}');
    if (!json || typeof json !== 'object') throw new Error();
    return json as Record<string, unknown>;
  } catch {
    throw new CaseValidationError('请求体必须是 JSON 对象');
  }
}

function fail(e: unknown, setCookie?: string): Response {
  if (e instanceof CaseValidationError) return respond({ error: e.message }, 400, setCookie);
  console.error('[cases]', e);
  return respond({ error: '卦例服务异常' }, 500, setCookie);
}

export async function GET(req: Request) {
  const { ownerId, setCookie } = getOrCreateDeviceId(req);
  try {
    if (rateLimit(`cases:get:${clientIp(req)}`, 240, 60_000)) {
      return respond({ error: '请求过于频繁' }, 429, setCookie);
    }
    const url = new URL(req.url);
    const { store, mode } = await getServerCaseStore(ownerId);

    // 客户端用它决定「远端」还是「本地 localStorage」
    if (url.searchParams.get('probe')) return respond({ mode }, 200, setCookie);

    const id = url.searchParams.get('id');
    if (id) {
      const record = await store.get(id);
      return record ? respond({ mode, case: record }, 200, setCookie) : respond({ mode, case: null }, 404, setCookie);
    }

    return respond({ mode, cases: await store.list() }, 200, setCookie);
  } catch (e) {
    return fail(e, setCookie);
  }
}

export async function POST(req: Request) {
  const { ownerId, setCookie } = getOrCreateDeviceId(req);
  if (!sameOrigin(req)) return respond({ error: '跨源请求被拒绝' }, 403, setCookie);
  if (rateLimit(`cases:write:${clientIp(req)}`, 60, 60_000)) {
    return respond({ error: '写入过于频繁，请稍后再试' }, 429, setCookie);
  }

  try {
    const body = await readBody(req);
    const { store, mode } = await getServerCaseStore(ownerId);

    // 批量导入（本地 → 远端迁移），按 id 幂等
    if (Array.isArray(body.cases)) {
      if (body.cases.length > MAX_IMPORT) return respond({ error: `一次最多导入 ${MAX_IMPORT} 条` }, 400, setCookie);
      const records = body.cases.map(parseCaseRecord) as CaseRecord[];
      for (const record of records) await store.save(record);
      return respond({ ok: true, imported: records.length, mode }, 200, setCookie);
    }

    const record = parseCaseRecord(body.record);
    await store.save(record);
    return respond({ ok: true, id: record.id, mode }, 200, setCookie);
  } catch (e) {
    return fail(e, setCookie);
  }
}

export async function PATCH(req: Request) {
  const { ownerId, setCookie } = getOrCreateDeviceId(req);
  if (!sameOrigin(req)) return respond({ error: '跨源请求被拒绝' }, 403, setCookie);
  if (rateLimit(`cases:write:${clientIp(req)}`, 60, 60_000)) {
    return respond({ error: '写入过于频繁，请稍后再试' }, 429, setCookie);
  }
  try {
    const body = await readBody(req);
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new CaseValidationError('缺少 id');
    const { store } = await getServerCaseStore(ownerId);
    await store.setFavorite(id, body.favorite === true);
    return respond({ ok: true }, 200, setCookie);
  } catch (e) {
    return fail(e, setCookie);
  }
}

export async function DELETE(req: Request) {
  const { ownerId, setCookie } = getOrCreateDeviceId(req);
  if (!sameOrigin(req)) return respond({ error: '跨源请求被拒绝' }, 403, setCookie);
  if (rateLimit(`cases:write:${clientIp(req)}`, 60, 60_000)) {
    return respond({ error: '写入过于频繁，请稍后再试' }, 429, setCookie);
  }
  try {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    if (!id) throw new CaseValidationError('缺少 id');
    const { store } = await getServerCaseStore(ownerId);
    await store.remove(id);
    return respond({ ok: true }, 200, setCookie);
  } catch (e) {
    return fail(e, setCookie);
  }
}
