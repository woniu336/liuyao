/**
 * 线上模型回归（可选，默认跳过）
 * ==============================
 * 用途：用真实供应商验证「整份规范 + 专项规则」是否真的被模型用上（专项命中）。
 *
 * 运行方式（不把 key 写进仓库）：
 *   LIUYAO_LIVE_KEY=oc_sk_xxx LIUYAO_LIVE_MODEL=deepseek-v4.1-flash \
 *   npx vitest run tests/live-specialty.test.ts
 *
 * 断言只做"是否按专项口径作答"的粗筛（避免把模型措辞当成契约）：
 *   - 四段标题齐全；
 *   - 宠物走失：提到「子孙」且不出现"肯定被偷/必能找回"这类绝对话；
 *   - 求财：提到「妻财」或「财爻」，且不承诺收益率。
 */
import { describe, expect, it } from 'vitest';
import { buildLiuyaoPrompt } from '../app/api/read/prompt';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';

const KEY = process.env.LIUYAO_LIVE_KEY;
const MODEL = process.env.LIUYAO_LIVE_MODEL || 'deepseek-v4.1-flash';
const BASE = process.env.LIUYAO_LIVE_BASE || 'https://opencode.ai/zen/go/v1';

const time = castTimeInfo(parseTimeInput('2026-11-07T15:30'));
const chart = castLiuyao(buildLiuyaoInput(time, [8, 7, 9, 8, 7, 8]));

/** 网关在 36k 前缀满载时会返回 prefill_cap_refused，重试即可（最多 2 次，间隔 30s） */
async function ask(question: string, retry = 2): Promise<string> {
  const { system, user } = buildLiuyaoPrompt(buildLiuyaoReadingFacts(chart, time, question));
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
      'x-opencode-session': `liuyao-test-${Date.now()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      temperature: 0.3,
      max_tokens: 2000,
      // 整份规范 36k token，若开思考会把输出预算全吃掉（实测 content 为空、finish_reason=length）
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number };
    error?: unknown;
  };
  const content = json.choices?.[0]?.message?.content;
  if (content) return content;
  const raw = JSON.stringify(json.error ?? json);
  if (retry > 0 && /prefill_cap_refused|overloaded|429/.test(raw)) {
    await new Promise((r) => setTimeout(r, 30_000));
    return ask(question, retry - 1);
  }
  throw new Error(`上游异常：${raw}`);
}

const live = KEY ? describe : describe.skip;

live('真实模型：专项是否命中', () => {
  it('宠物走失 → 以子孙为主、不给绝对承诺', async () => {
    const out = await ask('我家猫昨天从阳台跑丢了，还能找回来吗');
    console.log('\n--- 宠物走失 ---\n' + out);
    expect(out).toMatch(/一、取用/);
    expect(out).toMatch(/四、应期/);
    expect(out).toMatch(/子孙/);
    expect(out).not.toMatch(/肯定被偷|一定是被偷|必能找回|保证找回/);
  }, 180_000);

  it('求财 → 妻财为主用，不承诺收益', async () => {
    const out = await ask('这笔欠款这个月能到账吗');
    console.log('\n--- 求财 ---\n' + out);
    expect(out).toMatch(/一、取用/);
    expect(out).toMatch(/妻财|财爻/);
    expect(out).not.toMatch(/保证.{0,4}收益|必涨|一定回本/);
  }, 180_000);
});
