/** 请求侧小工具（服务端）：客户端 IP、同源判断。 */

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

/** 写操作 CSRF 兜底：带 Origin 时必须与 Host 同源（curl/服务端调用没有 Origin，放行） */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

/** 极简进程内限流（单 isolate 有效）；上线后换 Cloudflare Rate Limiting */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > max;
}
