/**
 * 大模型请求配置（服务端）
 * =========================
 * 用户的大模型设置只存在他自己浏览器里，随请求体一起到达；这里只做三件事：
 *   1. 校验（地址/模型/key 的形态，非法直接 400，不去打上游）；
 *   2. 拦明显的内网地址（防 SSRF），本机 Ollama 放行；
 *   3. 客户端没配置时，退回服务端环境变量（私人部署兜底）。
 *
 * 铁律：key 只在内存里活一次，不落库、不写日志、不回显给客户端。
 */

import { normalizeBaseUrl } from '@/lib/llm/settings';

export interface LlmRequestConfig {
  baseUrl: string;
  model: string;
  key: string;
  thinking?: 'enabled' | 'disabled';
  reasoningEffort?: 'low' | 'high' | 'max';
}

export type LlmNormalizeResult = { ok: true; config: LlmRequestConfig | null } | { ok: false; error: string };

const MODEL_RE = /^[\w.:/@-]{1,80}$/;

/** 明显指向内网的地址（本机回环放行，供 Ollama 使用） */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]') return false;
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function normalizeLlmRequest(input: unknown): LlmNormalizeResult {
  if (input === undefined || input === null) return { ok: true, config: envFallback() };
  if (typeof input !== 'object') return { ok: false, error: 'llm 必须是对象' };

  const o = input as Record<string, unknown>;
  const baseUrl = typeof o.baseUrl === 'string' ? normalizeBaseUrl(o.baseUrl) : '';
  const model = typeof o.model === 'string' ? o.model.trim() : '';
  const apiKey = typeof o.apiKey === 'string' ? o.apiKey.trim() : '';

  if (!baseUrl) return { ok: false, error: '接口地址为空' };
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: false, error: '接口地址不是合法 URL' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: '接口地址必须是 http(s)' };
  }
  if (url.username || url.password) return { ok: false, error: '接口地址不能内嵌账号密码' };
  if (isPrivateHost(url.hostname)) return { ok: false, error: '接口地址不能指向内网' };
  if (baseUrl.length > 300) return { ok: false, error: '接口地址过长' };

  if (!model) return { ok: false, error: '模型名为空' };
  if (!MODEL_RE.test(model)) return { ok: false, error: '模型名含非法字符' };

  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (!apiKey && !isLocal) return { ok: false, error: '缺少 API Key' };
  if (apiKey.length > 400) return { ok: false, error: 'API Key 过长' };

  const thinking = o.thinking === 'enabled' || o.thinking === 'disabled' ? o.thinking : undefined;
  const reasoningEffort =
    o.reasoningEffort === 'low' || o.reasoningEffort === 'high' || o.reasoningEffort === 'max'
      ? o.reasoningEffort
      : undefined;

  return { ok: true, config: { baseUrl, model, key: apiKey, thinking, reasoningEffort } };
}

/** 私人部署兜底：服务端环境变量（客户端没配时才会用到） */
function envFallback(): LlmRequestConfig | null {
  if (typeof process === 'undefined') return null;
  const key = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!key) return null;
  return {
    baseUrl: normalizeBaseUrl(process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'),
    model: process.env.LLM_MODEL || 'deepseek-chat',
    key,
    thinking:
      process.env.LLM_THINKING === 'enabled' || process.env.LLM_THINKING === 'disabled'
        ? process.env.LLM_THINKING
        : undefined,
    reasoningEffort:
      process.env.LLM_REASONING_EFFORT === 'low' ||
      process.env.LLM_REASONING_EFFORT === 'high' ||
      process.env.LLM_REASONING_EFFORT === 'max'
        ? process.env.LLM_REASONING_EFFORT
        : undefined,
  };
}
