import { describe, expect, it } from 'vitest';
import {
  LLM_PROVIDERS,
  findProvider,
  isLlmConfigured,
  llmRequestPayload,
  normalizeBaseUrl,
  validateLlmSettings,
  type LlmSettings,
} from '../lib/llm/settings';
import { friendlyUpstreamError, normalizeLlmRequest, shouldRetryUpstream, upstreamHostAllowed } from '../lib/llm/server';

const deepseek: LlmSettings = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1/',
  model: ' deepseek-chat ',
  apiKey: 'sk-test',
};

describe('大模型设置（只存本机浏览器）', () => {
  it('预置供应商 id 唯一，地址形态合理', () => {
    const ids = LLM_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of LLM_PROVIDERS) {
      if (p.id === 'custom') continue;
      const url = new URL(p.baseUrl);
      expect(['https:', 'http:']).toContain(url.protocol);
      if (p.id !== 'ollama') expect(url.protocol).toBe('https:');
      expect(p.models.length).toBeGreaterThan(0);
    }
    expect(findProvider('ollama')?.needsKey).toBe(false);
    expect(findProvider('nope')).toBeNull();
  });

  it('地址归一：去尾斜杠，不发散', () => {
    expect(normalizeBaseUrl(' https://a.com/v1// ')).toBe('https://a.com/v1');
    expect(normalizeBaseUrl('')).toBe('');
  });

  it('是否已配置：本地模型可无 key，云端必须有', () => {
    expect(isLlmConfigured(deepseek)).toBe(true);
    expect(isLlmConfigured({ ...deepseek, apiKey: '' })).toBe(false);
    expect(isLlmConfigured({ provider: 'ollama', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5', apiKey: '' })).toBe(true);
    expect(isLlmConfigured(null)).toBe(false);
    expect(isLlmConfigured({ ...deepseek, model: '  ' })).toBe(false);
  });

  it('校验文案：地址 / 模型 / key 三类问题', () => {
    expect(validateLlmSettings({ ...deepseek, baseUrl: '' })).toContain('接口地址');
    expect(validateLlmSettings({ ...deepseek, baseUrl: 'not a url' })).toContain('URL');
    expect(validateLlmSettings({ ...deepseek, baseUrl: 'ftp://a.com' })).toContain('http');
    expect(validateLlmSettings({ ...deepseek, model: '' })).toContain('模型');
    expect(validateLlmSettings({ ...deepseek, model: '模型 带空格' })).toContain('非法');
    expect(validateLlmSettings({ ...deepseek, apiKey: '' })).toContain('API Key');
    expect(validateLlmSettings(deepseek)).toBeNull();
  });

  it('发给服务端的载荷不含供应商等 UI 字段，且已归一', () => {
    const payload = llmRequestPayload({ ...deepseek, thinking: 'default', reasoningEffort: 'high' });
    expect(payload).toEqual({
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      apiKey: 'sk-test',
      reasoningEffort: 'high',
    });
    expect('provider' in payload).toBe(false);
  });
});

describe('服务端校验（防打内网 / 形态硬约束）', () => {
  const ok = { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: 'sk-x' };

  it('合法配置通过', () => {
    const r = normalizeLlmRequest(ok);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config).toMatchObject({ baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  });

  it('协议与地址形态', () => {
    expect(normalizeLlmRequest({ ...ok, baseUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(normalizeLlmRequest({ ...ok, baseUrl: 'file:///etc/passwd' }).ok).toBe(false);
    expect(normalizeLlmRequest({ ...ok, baseUrl: 'https://user:pass@a.com/v1' }).ok).toBe(false);
    expect(normalizeLlmRequest({ ...ok, baseUrl: '' }).ok).toBe(false);
  });

  it('内网地址被拦，本机 Ollama 放行', () => {
    for (const host of ['10.0.0.5', '192.168.1.9', '172.20.0.1', '169.254.169.254', 'foo.internal']) {
      expect(normalizeLlmRequest({ ...ok, baseUrl: `https://${host}/v1` }).ok).toBe(false);
    }
    const local = normalizeLlmRequest({ baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5', apiKey: '' });
    expect(local.ok).toBe(true);
  });

  it('模型与 key 的硬约束', () => {
    expect(normalizeLlmRequest({ ...ok, model: '' }).ok).toBe(false);
    expect(normalizeLlmRequest({ ...ok, model: 'a b' }).ok).toBe(false);
    expect(normalizeLlmRequest({ ...ok, apiKey: '' }).ok).toBe(false);
    expect(normalizeLlmRequest({ ...ok, apiKey: 'x'.repeat(401) }).ok).toBe(false);
  });

  it('可选上游白名单：LLM_ALLOWED_HOSTS 决定放行范围', () => {
    const saved = process.env.LLM_ALLOWED_HOSTS;
    try {
      delete process.env.LLM_ALLOWED_HOSTS;
      expect(upstreamHostAllowed('https://any.example.com/v1').ok).toBe(true);

      process.env.LLM_ALLOWED_HOSTS = 'deepseek.com, opencode.ai';
      expect(upstreamHostAllowed('https://api.deepseek.com/v1').ok).toBe(true);
      expect(upstreamHostAllowed('https://opencode.ai/zen/go/v1').ok).toBe(true);
      const denied = upstreamHostAllowed('https://evil.example.com/v1');
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.error).toContain('evil.example.com');
      // 后缀匹配不能把 deepseek.com.evil.com 放进来
      expect(upstreamHostAllowed('https://deepseek.com.evil.com/v1').ok).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.LLM_ALLOWED_HOSTS;
      else process.env.LLM_ALLOWED_HOSTS = saved;
    }
  });

  it('上游瞬时错误要重试，客户端错误不重试', () => {
    // 网关满载/限流 → 重试
    expect(shouldRetryUpstream(429, '')).toBe(true);
    expect(shouldRetryUpstream(503, '')).toBe(true);
    expect(shouldRetryUpstream(500, '{"message":"[overloaded] retry shortly"}')).toBe(true);
    expect(shouldRetryUpstream(400, '{"message":"[prefill_cap_refused] the cell is at capacity"}')).toBe(true);
    // key 错、模型名错 → 不重试
    expect(shouldRetryUpstream(401, 'invalid api key')).toBe(false);
    expect(shouldRetryUpstream(404, 'model not found')).toBe(false);
    expect(shouldRetryUpstream(400, 'invalid request')).toBe(false);
  });

  it('上游错误翻成人话（不把 JSON 直接丢给用户）', () => {
    expect(friendlyUpstreamError(429, '')).toContain('繁忙');
    expect(friendlyUpstreamError(200, '[overloaded]')).toContain('繁忙');
    expect(friendlyUpstreamError(401, 'x')).toContain('API Key');
    expect(friendlyUpstreamError(404, 'x')).toContain('Base URL');
    expect(friendlyUpstreamError(400, 'bad thing')).toContain('400');
  });

  it('没传 llm 时退回服务端环境变量（没配就是 null）', () => {
    const r = normalizeLlmRequest(undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config === null || typeof r.config.baseUrl === 'string').toBe(true);
  });
});
