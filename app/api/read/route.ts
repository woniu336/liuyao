/**
 * 解卦流式接口（服务端）
 * ======================
 * POST { facts: ReadingFacts } → SSE（data: {"content": "..."} ... data: [DONE]）
 *
 * 边界：
 *   - 客户端只发盘面事实与问句，**永不**持有 API key；
 *   - prompt 在服务端拼（./prompt.ts），不随客户端下发；
 *   - 未配置 LLM 时明确 501，不退化成假解读。
 *
 * 只用 fetch / Web Streams，没有 node:* 依赖，可直接跑在 Workers（vinext/OpenNext）。
 *
 * 注意：限流用的是模块级内存表，在 Edge isolate 里只在单实例生效。
 * 真正上线时应换成 Cloudflare Rate Limiting 或 D1/KV 计数（见 docs/cloudflare.md）。
 */

import { buildReadingPrompt } from './prompt';
import type { ReadingFacts } from '@/lib/readings/types';
import { getAdminStore } from '@/lib/admin/store';
import {
  SETTING_LLM_ACTIVE,
  type LlmProfile,
  type ReasoningEffort,
  type ThinkingMode,
} from '@/lib/admin/types';
import { buildChatRequestBody } from '@/lib/readings/llm-request';
import { buildProviderHeaders } from '@/lib/readings/provider-headers';

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = { windowMs: 60_000, max: 8 };
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
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE_LIMIT.max;
}

interface LlmConfig {
  key: string;
  baseUrl: string;
  model: string;
  profileLabel?: string;
  thinking?: ThinkingMode;
  reasoningEffort?: ReasoningEffort;
}

function parseThinking(value: string | undefined): ThinkingMode | undefined {
  return value === 'enabled' || value === 'disabled' ? value : undefined;
}

function parseEffort(value: string | undefined): ReasoningEffort | undefined {
  return value === 'low' || value === 'high' || value === 'max' ? value : undefined;
}

interface LlmResolution {
  config: LlmConfig | null;
  /** admin = 后台选定的 profile；env = 传统环境变量兜底 */
  source: 'admin' | 'env' | 'none';
  profileLabel?: string;
  /** admin 模式下 profile 指向的环境变量没配 */
  missingKeyEnv?: string;
}

/**
 * 解析当前生效的 LLM 配置：
 *   1) 后台 `llm_active_id` 指向的 profile（密钥从其 keyEnv 读取，永不入库）；
 *   2) 后台没配 profile 时，退回 LLM_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY。
 */
async function resolveLlmConfig(): Promise<LlmResolution> {
  try {
    const { store } = await getAdminStore();
    const activeId = await store.getSetting<string>(SETTING_LLM_ACTIVE);
    if (activeId) {
      const profiles = await store.listProfiles();
      const profile = profiles.find((p: LlmProfile) => p.id === activeId && p.enabled);
      if (profile) {
        const key = (typeof process !== 'undefined' ? process.env[profile.keyEnv] : '') || '';
        if (!key) {
          return {
            config: null,
            source: 'admin',
            profileLabel: profile.label,
            missingKeyEnv: profile.keyEnv,
          };
        }
        return {
          config: {
            key,
            baseUrl: profile.baseUrl,
            model: profile.model,
            profileLabel: profile.label,
            thinking: profile.thinking,
            reasoningEffort: profile.reasoningEffort,
          },
          source: 'admin',
          profileLabel: profile.label,
        };
      }
    }
  } catch {
    /* 后台存储不可用：继续走环境变量兜底 */
  }

  const key = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!key) return { config: null, source: 'none' };
  return {
    config: {
      key,
      baseUrl: (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
      model: process.env.LLM_MODEL || 'deepseek-chat',
      thinking: parseThinking(process.env.LLM_THINKING),
      reasoningEffort: parseEffort(process.env.LLM_REASONING_EFFORT),
    },
    source: 'env',
  };
}

function validFacts(x: unknown): x is ReadingFacts {
  if (!x || typeof x !== 'object') return false;
  const f = x as Partial<ReadingFacts>;
  if (f.kind === 'liuyao') return Array.isArray((f as never as { lines?: unknown }).lines);
  if (f.kind === 'xct') return Array.isArray((f as never as { palaces?: unknown }).palaces);
  return false;
}

export async function POST(req: Request): Promise<Response> {
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

  const resolution = await resolveLlmConfig();
  const config = resolution.config;
  if (!config) {
    return Response.json(
      {
        error:
          resolution.source === 'admin'
            ? `后台选定的 LLM「${resolution.profileLabel}」缺少密钥：请在服务端设置环境变量 ${resolution.missingKeyEnv}`
            : '解卦服务未配置：请在服务端设置 LLM_API_KEY（可选 LLM_BASE_URL / LLM_MODEL），或在后台添加并启用 LLM profile。客户端不会持有密钥。',
        configured: false,
        source: resolution.source,
      },
      { status: 501 },
    );
  }

  const { system, user } = buildReadingPrompt(facts);

  let upstream: Response;
  try {
    upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildProviderHeaders(config.baseUrl, config.key),
      body: JSON.stringify(
        buildChatRequestBody({
          model: config.model,
          thinking: config.thinking,
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
