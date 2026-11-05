import type { ReasoningEffort, ThinkingMode } from '@/lib/admin/types';

/**
 * 组装 chat/completions 请求体（纯函数，便于测试）。
 *
 * 思考模式（DeepSeek）：
 *   - `thinking: {type: "enabled"|"disabled"}`；不传则由模型默认（deepseek-flash 默认开）
 *   - `reasoning_effort: "low"|"high"|"max"`
 *   - 思考模式下 temperature 会被忽略；这里仍保留低温度，供非思考模型使用
 */
export interface ChatBodyConfig {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  thinking?: ThinkingMode;
  reasoningEffort?: ReasoningEffort;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export function buildChatRequestBody(cfg: ChatBodyConfig): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    stream: cfg.stream !== false,
    temperature: cfg.temperature ?? 0.3,
    max_tokens: cfg.maxTokens ?? 4096,
    messages: cfg.messages,
  };

  if (cfg.thinking === 'enabled' || cfg.thinking === 'disabled') {
    body.thinking = { type: cfg.thinking };
  }
  if (cfg.reasoningEffort) {
    body.reasoning_effort = cfg.reasoningEffort;
  }

  return body;
}
