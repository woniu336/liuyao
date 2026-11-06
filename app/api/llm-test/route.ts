/**
 * 大模型连通性测试（服务端一次性转发）
 * ====================================
 * POST { baseUrl, model, apiKey } → { ok: true, sample } | { ok: false, error }
 *
 * 只发一句极短的问候，用来确认「地址 + 模型 + key」三件事是否对得上。
 * 与解卦一样：key 只在内存里用一次，不落库、不写日志、不回显。
 */

import { normalizeLlmRequest } from '@/lib/llm/server';
import { buildChatRequestBody } from '@/lib/readings/llm-request';
import { buildProviderHeaders } from '@/lib/readings/provider-headers';

const MAX_BODY_BYTES = 8 * 1024;
const TIMEOUT_MS = 20_000;

export async function POST(req: Request): Promise<Response> {
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
