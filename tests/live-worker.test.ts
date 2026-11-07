/**
 * 线上 Worker 端到端回归（默认跳过）
 * ================================
 * 用途：验证**已部署**的 Worker 用的是最新提示词与默认关闭思考。
 * 运行：LIUYAO_LIVE_KEY=oc_sk_xxx npx vitest run tests/live-worker.test.ts
 */
import { describe, expect, it } from 'vitest';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';

const KEY = process.env.LIUYAO_LIVE_KEY;
const BASE = process.env.LIUYAO_LIVE_SITE || 'https://zhanbu.lufei.de';

const time = castTimeInfo(parseTimeInput('2026-11-07T15:30'));
const chart = castLiuyao(buildLiuyaoInput(time, [8, 7, 9, 8, 7, 8]));

const live = KEY ? describe : describe.skip;

live('已部署 Worker：解卦链路', () => {
  it('宠物走失问句 → 200 且返回四段正文（说明整份规范 + 关闭思考已生效）', async () => {
    const facts = buildLiuyaoReadingFacts(chart, time, '我家猫昨天从阳台跑丢了，还能找回来吗');
    const res = await fetch(`${BASE}/api/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({
        facts,
        llm: { baseUrl: 'https://opencode.ai/zen/go/v1', model: 'deepseek-v4.1-flash', apiKey: KEY },
      }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    const out = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => {
        try {
          return (JSON.parse(l.slice(5).trim()) as { content?: string }).content ?? '';
        } catch {
          return '';
        }
      })
      .join('');
    console.log('\n--- 线上 Worker 输出 ---\n' + out);
    expect(out).toMatch(/一、取用/);
    expect(out).toMatch(/四、应期/);
    expect(out).toMatch(/子孙/);
    expect(out.length).toBeGreaterThan(300);
  }, 240_000);

  it('高考问句 → 200 且按学业专项分层（子孙为主体、父母文书、官鬼录取）', async () => {
    const facts = buildLiuyaoReadingFacts(chart, time, '孩子今年高考，能不能上本科，志愿怎么填');
    const res = await fetch(`${BASE}/api/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({
        facts,
        llm: { baseUrl: 'https://opencode.ai/zen/go/v1', model: 'deepseek-v4.1-flash', apiKey: KEY },
      }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    const out = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => {
        try {
          return (JSON.parse(l.slice(5).trim()) as { content?: string }).content ?? '';
        } catch {
          return '';
        }
      })
      .join('');
    console.log('\n--- 线上 Worker · 学业 ---\n' + out);
    expect(out).toMatch(/一、取用/);
    expect(out).toMatch(/四、应期/);
    expect(out).toMatch(/子孙/);
    expect(out).toMatch(/父母|文书|试卷/);
    expect(out).toMatch(/官鬼|录取/);
  }, 240_000);
});
