import { describe, expect, it } from 'vitest';
import { buildChatRequestBody } from '../lib/readings/llm-request';

const messages = [
  { role: 'system' as const, content: 'sys' },
  { role: 'user' as const, content: 'usr' },
];

describe('LLM 请求体', () => {
  it('默认不显式传 thinking，流式、4096 tokens', () => {
    const body = buildChatRequestBody({ model: 'deepseek-flash', messages });
    expect(body).toMatchObject({ model: 'deepseek-flash', stream: true, max_tokens: 4096, temperature: 0.3 });
    expect(body).not.toHaveProperty('thinking');
    expect(body).not.toHaveProperty('reasoning_effort');
  });

  it('开启思考并指定强度', () => {
    const body = buildChatRequestBody({
      model: 'deepseek-flash',
      messages,
      thinking: 'enabled',
      reasoningEffort: 'high',
    });
    expect(body.thinking).toEqual({ type: 'enabled' });
    expect(body.reasoning_effort).toBe('high');
  });

  it('显式关闭思考', () => {
    const body = buildChatRequestBody({ model: 'deepseek-flash', messages, thinking: 'disabled' });
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body).not.toHaveProperty('reasoning_effort');
  });

  it('测试连通用的非流式小请求', () => {
    const body = buildChatRequestBody({
      model: 'deepseek-flash',
      messages,
      stream: false,
      temperature: 0,
      maxTokens: 256,
      thinking: 'enabled',
    });
    expect(body).toMatchObject({ stream: false, temperature: 0, max_tokens: 256 });
  });
});
