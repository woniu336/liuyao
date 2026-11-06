/**
 * 大模型连通性测试（服务端一次性转发）
 * ====================================
 * POST { baseUrl, model, apiKey } → { ok: true, sample } | { ok: false, error }
 *
 * 只发一句极短的问候，用来确认「地址 + 模型 + key」三件事是否对得上。
 * 与解卦一样：key 只在内存里用一次，不落库、不写日志、不回显。
 */

import { normalizeLlmRequest, upstreamHostAllowed } from '@/lib/llm/server';
import { buildChatRequestBody } from '@/lib/readings/llm-request';
import { buildProviderHeaders } from '@/lib/readings/provider-headers';

const MAX_BODY_BYTES = 8 * 1024;
const TIMEOUT_MS = 20_000;
const RATE = { windowMs: 60_000, max: 10 };
const hits = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE.windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE.max;
}

function crossSite(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(req.url).host;
  } catch {
    return true;
  }
}

export async function POST(req: Request): Promise<Response> {
  if (crossSite(req)) {
    return Response.json({ ok: false, error: '仅接受本站页面发起的测试请求' }, { status: 403 });
  }
  if (rateLimited(clientIp(req))) {
    return Response.json({ ok: false, error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ ok: false, error: '请求体过大' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: '请求体必须是 JSON' }, { status: 400 });
  }

  const resolved = normalizeLlmRequest(body);
  if (!resolved.ok) return Response.json({ ok: false, error: resolved.error }, { status: 400 });
  const config = resolved.config;
  if (config) {
    const allowed = upstreamHostAllowed(config.baseUrl);
    if (!allowed.ok) return Response.json({ ok: false, error: allowed.error }, { status: 403 });
  }
  if (!config) {
    return Response.json({ ok: false, error: '还没有配置大模型' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildProviderHeaders(config.baseUrl, config.key),
      signal: controller.signal,
      body: JSON.stringify(
        buildChatRequestBody({
          model: config.model,
          messages: [{ role: 'user', content: '连通性测试，请只回复两个字：可用' }],
          stream: false,
          maxTokens: 16,
          temperature: 0,
        }),
      ),
    });

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      return Response.json({ ok: false, error: `上游返回 ${res.status}：${text.slice(0, 300)}` });
    }
    let sample = '';
    try {
      const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
      sample = json?.choices?.[0]?.message?.content?.slice(0, 80) ?? '';
    } catch {
      sample = text.slice(0, 80);
    }
    return Response.json({ ok: true, model: config.model, sample });
  } catch (e) {
    const err = e as Error;
    return Response.json({
      ok: false,
      error: err.name === 'AbortError' ? '连接超时（20s）' : `连接失败：${err.message}`,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const dynamic = 'force-dynamic';
