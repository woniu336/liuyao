/**
 * 大模型设置（客户端）
 * ====================
 * 用户自带 key：只存浏览器 localStorage，解卦时随请求发给本站 `/api/read`，
 * 由服务端原样转发到「OpenAI 兼容」的 `/chat/completions`。服务端不落库、不写日志。
 *
 * 为什么按「OpenAI 兼容」做通用层：国内外主流（OpenAI / DeepSeek / Moonshot /
 * 智谱 / 通义 / OpenRouter / SiliconFlow / Ollama / 各类网关）都提供这个协议，
 * 只要填 baseUrl + model + key 就能用，不必为每家写适配。
 */

export const LLM_SETTINGS_KEY = 'liuyao.llm.v1';

export interface LlmSettings {
  /** 预设 id（custom 表示自己填） */
  provider: string;
  /** 不含 /chat/completions 的根地址，如 https://api.deepseek.com/v1 */
  baseUrl: string;
  model: string;
  apiKey: string;
  /** 思考模式：default 不显式传；enabled/disabled 显式开关（DeepSeek 等） */
  thinking?: 'default' | 'enabled' | 'disabled';
  /** 思考强度（部分供应商支持） */
  reasoningEffort?: 'low' | 'high' | 'max';
}

export interface LlmProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  /** 建议模型（第一个作为默认） */
  models: string[];
  /** 是否需要 key（本地 Ollama 不需要） */
  needsKey: boolean;
  hint?: string;
}

export const LLM_PROVIDERS: LlmProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    needsKey: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'],
    needsKey: true,
  },
  {
    id: 'moonshot',
    label: 'Moonshot / Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2-0905-preview', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    needsKey: true,
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.6', 'glm-4-plus', 'glm-4-flash'],
    needsKey: true,
  },
  {
    id: 'dashscope',
    label: '通义千问（DashScope）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    needsKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['deepseek/deepseek-chat', 'anthropic/claude-3.7-sonnet', 'google/gemini-2.5-pro'],
    needsKey: true,
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow 硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
    needsKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama（本机）',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen2.5', 'llama3.1'],
    needsKey: false,
    hint: '本机运行 Ollama 时可用，不需要 key；服务端与 Ollama 需在同一台机器。',
  },
  {
    id: 'custom',
    label: '自定义（任意 OpenAI 兼容接口）',
    baseUrl: '',
    models: [],
    needsKey: true,
    hint: '填到 /v1 为止，例如 https://your-gateway.com/v1',
  },
];

export function findProvider(id: string): LlmProviderPreset | null {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? null;
}

/** 地址归一：去尾斜杠；缺 /v1 的常见网关不自动补，交给用户看清楚 */
export function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

export function isLlmConfigured(s: LlmSettings | null): boolean {
  if (!s) return false;
  if (!normalizeBaseUrl(s.baseUrl) || !s.model.trim()) return false;
  const preset = findProvider(s.provider);
  if (preset && !preset.needsKey) return true;
  return Boolean(s.apiKey.trim());
}

/** 宽松校验：给 UI 提示用；真正的 SSRF 拦截在服务端 */
export function validateLlmSettings(s: LlmSettings): string | null {
  const base = normalizeBaseUrl(s.baseUrl);
  if (!base) return '请填写接口地址（Base URL）';
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return '接口地址不是合法 URL';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '接口地址必须是 http(s)';
  if (!s.model.trim()) return '请填写模型名';
  if (!/^[\w.:/@-]{1,80}$/.test(s.model.trim())) return '模型名含非法字符';
  const preset = findProvider(s.provider);
  if ((!preset || preset.needsKey) && !s.apiKey.trim()) return '请填写 API Key';
  return null;
}

function safeParse(raw: string | null): LlmSettings | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<LlmSettings>;
    if (!o || typeof o !== 'object') return null;
    const provider = typeof o.provider === 'string' ? o.provider : 'custom';
    const baseUrl = typeof o.baseUrl === 'string' ? o.baseUrl : '';
    const model = typeof o.model === 'string' ? o.model : '';
    const apiKey = typeof o.apiKey === 'string' ? o.apiKey : '';
    const thinking =
      o.thinking === 'enabled' || o.thinking === 'disabled' || o.thinking === 'default' ? o.thinking : undefined;
    const reasoningEffort =
      o.reasoningEffort === 'low' || o.reasoningEffort === 'high' || o.reasoningEffort === 'max'
        ? o.reasoningEffort
        : undefined;
    return { provider, baseUrl, model, apiKey, ...(thinking ? { thinking } : {}), ...(reasoningEffort ? { reasoningEffort } : {}) };
  } catch {
    return null;
  }
}

export function loadLlmSettings(): LlmSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    return safeParse(window.localStorage.getItem(LLM_SETTINGS_KEY));
  } catch {
    return null;
  }
}

export function saveLlmSettings(s: LlmSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LLM_SETTINGS_KEY,
      JSON.stringify({ ...s, baseUrl: normalizeBaseUrl(s.baseUrl), model: s.model.trim(), apiKey: s.apiKey.trim() }),
    );
  } catch {
    /* 隐私模式：忽略 */
  }
}

export function clearLlmSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LLM_SETTINGS_KEY);
  } catch {
    /* 忽略 */
  }
}

/** 发给服务端的最小载荷（不含 provider 等 UI 字段） */
export function llmRequestPayload(s: LlmSettings): {
  baseUrl: string;
  model: string;
  apiKey: string;
  thinking?: 'enabled' | 'disabled';
  reasoningEffort?: 'low' | 'high' | 'max';
} {
  return {
    baseUrl: normalizeBaseUrl(s.baseUrl),
    model: s.model.trim(),
    apiKey: s.apiKey.trim(),
    ...(s.thinking === 'enabled' || s.thinking === 'disabled' ? { thinking: s.thinking } : {}),
    ...(s.reasoningEffort ? { reasoningEffort: s.reasoningEffort } : {}),
  };
}
