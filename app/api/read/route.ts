/**
 * 解卦流式接口（服务端）
 * ======================
 * POST { facts: ReadingFacts, llm?: { baseUrl, model, apiKey, thinking?, reasoningEffort? } }
 *   → SSE（data: {"content": "..."} ... data: {"done":true}）
 *
 * 边界：
 *   - 大模型配置（含 key）**只存在用户浏览器的 localStorage**，每次请求随 body 带上；
 *     服务端只在内存里用它转发一次，不落库、不写日志、不回显；
 *   - 请求体里的 key 只对本次上游调用有效，转发完即随请求对象一起被回收；
 *   - 没有客户端配置时，退回服务端环境变量（自建/私人部署的兜底），仍未配置则明确 501；
 *   - prompt 在服务端拼（./prompt.ts），不随客户端下发。
 *
 * 只用 fetch / Web Streams，没有 node:* 依赖，可直接跑在 Workers（vinext/OpenNext）。
 *
 * 注意：限流用的是模块级内存表，在 Edge isolate 里只在单实例生效。
 * 真正上线时应换成 Cloudflare Rate Limiting 或 D1/KV 计数（见 docs/cloudflare.md）。
 */

import { buildLiuyaoPrompt } from './prompt';
import type { ReadingFacts } from '@/lib/readings/types';
import { buildChatRequestBody } from '@/lib/readings/llm-request';
import { buildProviderHeaders } from '@/lib/readings/provider-headers';
import { normalizeLlmRequest, upstreamHostAllowed, type LlmRequestConfig } from '@/lib/llm/server';

const MAX_BODY_BYTES = 64 * 1024;
/** 分钟窗 + 小时窗双限：分钟挡突发，小时挡刷量（进程内计数，多实例时偏松，正式上限交给 CF 边缘限流） */
const RATE_LIMIT = { windowMs: 60_000, max: 8, hourMs: 3_600_000, hourMax: 60 };
const hits = new Map<string, { count: number; resetAt: number; hourCount: number; hourResetAt: number }>();

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
  if (!cur) {
    hits.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT.windowMs,
      hourCount: 1,
      hourResetAt: now + RATE_LIMIT.hourMs,
    });
    return false;
  }
  if (cur.resetAt < now) {
    cur.count = 1;
    cur.resetAt = now + RATE_LIMIT.windowMs;
  } else {
    cur.count += 1;
  }
  if (cur.hourResetAt < now) {
    cur.hourCount = 1;
    cur.hourResetAt = now + RATE_LIMIT.hourMs;
  } else {
    cur.hourCount += 1;
  }
  return cur.count > RATE_LIMIT.max || cur.hourCount > RATE_LIMIT.hourMax;
}

/** 只接受本站页面发起的调用：带了 Origin 却不是本站，直接拒（挡住别的网站拿本站当转发口） */
function crossSite(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(req.url).host;
  } catch {
    return true;
  }
}

function validFacts(x: unknown): x is ReadingFacts {
  if (!x || typeof x !== 'object') return false;
  const f = x as Partial<ReadingFacts>;
  if (f.kind !== 'liuyao') return false;
  return Array.isArray((f as never as { lines?: unknown }).lines);
}

export async function POST(req: Request): Promise<Response> {
  if (crossSite(req)) {
    return Response.json({ error: '仅接受本站页面发起的解卦请求' }, { status: 403 });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: '盘面事实过大' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }

  const facts = (body as { facts?: unknown })?.facts;
  if (!validFacts(facts)) {
    return Response.json({ error: 'facts 不合法：需要 kind 与其对应的盘面事实' }, { status: 400 });
  }

  const resolved = normalizeLlmRequest((body as { llm?: unknown })?.llm);
  if (!resolved.ok) {
    return Response.json({ error: resolved.error, configured: false }, { status: 400 });
  }
  const config: LlmRequestConfig | null = resolved.config;
  if (config) {
    const allowed = upstreamHostAllowed(config.baseUrl);
    if (!allowed.ok) {
      return Response.json({ error: allowed.error, configured: false }, { status: 403 });
    }
  }
  if (!config) {
    return Response.json(
      {
        error: '还没有配置大模型：点右上角「设置」填入接口地址、模型与 API Key（只保存在本机浏览器）。',
        configured: false,
      },
      { status: 501 },
    );
  }

  const { system, user } = buildLiuyaoPrompt(facts);

  let upstream: Response;
  try {
    upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildProviderHeaders(config.baseUrl, config.key),
      body: JSON.stringify(
        buildChatRequestBody({
          model: config.model,
          // 整份规范约 36k token：若模型默认开思考，会把输出预算全吃掉（实测 content 为空、finish_reason=length）。
          // 本产品只要 400–550 字正文，默认关闭思考；用户在「设置」里显式开启才传 enabled。
          thinking: config.thinking ?? 'disabled',
          reasoningEffort: config.reasoningEffort,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      ),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    return Response.json({ error: `上游模型不可达：${(e as Error).message}` }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(
      `data: ${JSON.stringify({ error: `上游模型返回 ${upstream.status}：${text.slice(0, 200)}` })}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
    );
  }

  const upstreamBody = upstream.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* 客户端断开 */
        }
      };
      const sendComment = (text: string) => {
        try {
          controller.enqueue(encoder.encode(`: ${text}\n\n`));
        } catch {
          /* 客户端断开 */
        }
      };

      // 思考模式首字可能要几十秒，中间任何一跳（浏览器/代理/网关）都可能因空闲断流。
      // SSE 注释帧不进入客户端解析，只用来保持连接；顺带把「还在想」告诉前端。
      let lastActivity = Date.now();
      const heartbeat = setInterval(() => {
        if (Date.now() - lastActivity > 8_000) {
          lastActivity = Date.now();
          sendComment('keep-alive');
        }
      }, 8_000);
      sendComment('open');

      let buffer = '';
      const reader = upstreamBody.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx = buffer.indexOf('\n\n');
          while (idx >= 0) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            idx = buffer.indexOf('\n\n');

            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const content = json?.choices?.[0]?.delta?.content;
                if (typeof content === 'string' && content) {
                  lastActivity = Date.now();
                  send({ content });
                }
              } catch {
                /* 上游心跳/非 JSON 行，忽略 */
              }
            }
          }
        }
        send({ done: true });
      } catch (e) {
        send({ error: (e as Error).message });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* 已关闭 */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export const dynamic = 'force-dynamic';
