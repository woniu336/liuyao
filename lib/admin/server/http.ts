import { AdminValidationError } from './validate';

const MAX_BODY = 64 * 1024;

/** 管理端统一 JSON 响应：一律不缓存 */
export function adminJson(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

export async function readJsonBody(req: Request): Promise<unknown> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) throw new AdminValidationError('请求体过大');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new AdminValidationError('请求体必须是 JSON');
  }
}

/** 统一异常映射：校验错 400，其余 500（不把堆栈丢给前端） */
export function adminError(e: unknown): Response {
  if (e instanceof AdminValidationError) return adminJson({ error: e.message }, 400);
  const message = e instanceof Error ? e.message : String(e);
  console.error('[admin]', e);
  return adminJson({ error: `后台操作失败：${message}` }, 500);
}
