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

/**
 * 可选的上游域名白名单（逗号分隔的域名后缀，如 `deepseek.com,openai.com,opencode.ai`）。
 * 设了 `LLM_ALLOWED_HOSTS` 就只放行列表内的上游，防止本站被当成任意转发代理；
 * 不设则放行任意 https 上游（保持「通用供应商」）。
 */
export function upstreamHostAllowed(baseUrl: string): { ok: true } | { ok: false; error: string } {
  const raw = (typeof process !== 'undefined' ? process.env.LLM_ALLOWED_HOSTS : '') || '';
  const list = raw
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return { ok: true };
  let host = '';
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return { ok: false, error: '接口地址不合法' };
  }
  const hit = list.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  return hit ? { ok: true } : { ok: false, error: `上游域名不在允许列表内：${host}` };
}

/**
 * 上游是否值得重试（纯函数，便于测试）。
 *
 * 整份规范约 36k token 的前缀在网关满载时会被拒（429 / prefill_cap_refused / overloaded），
 * 这类错误是瞬时的：同一请求隔几秒再来往往就成功，所以在服务端重试一次比让用户重点便宜。
 */
export function shouldRetryUpstream(status: number, bodyText: string): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  return /overloaded|prefill_cap_refused|at capacity|rate.?limit|too many requests|retry shortly/i.test(bodyText);
}

/** 把上游错误翻译成一句人话（前端不再显示原始 JSON） */
export function friendlyUpstreamError(status: number, bodyText: string): string {
  if (status === 429 || /overloaded|at capacity|prefill_cap_refused/i.test(bodyText)) {
    return '上游模型当前繁忙（429），稍等几秒再点「重试」即可；本次请求没有产生费用。';
  }
  if (status === 401 || status === 403) {
    return '上游拒绝了这个 key（401/403）：请到「设置」里核对 API Key 是否有权限。';
  }
  if (status === 404) {
    return '上游 404：接口地址或模型名不对，请检查「设置」里的 Base URL 与模型名。';
  }
  const brief = bodyText.replace(/\s+/g, ' ').slice(0, 160);
  return `上游返回 ${status}：${brief}`;
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
