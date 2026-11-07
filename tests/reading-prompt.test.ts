import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildLiuyaoPrompt, composeSystem } from '../app/api/read/prompt';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';
import { PROMPT_SPEC } from '../lib/readings/prompt-spec.generated';

const specDoc = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'prompt-liuyao.md'), 'utf8').replace(/\r\n/g, '\n');
const approxTokens = (s: string) => Math.round(s.length / 1.5);

describe('运行时 = 核心章 + 命中专项章（整章原样，不精简）', () => {
  it('生成物与规范文档同步（改文档必须重新 gen:prompt）', () => {
    expect(PROMPT_SPEC).toBe(specDoc);
  });

  it('无问句：只发核心章，不含任何专项章', () => {
    const sys = composeSystem('');
    expect(sys).toContain('# 零、两层职责与事实层硬约束');
    expect(sys).toContain('# 六、通用断卦原则');
    expect(sys).toContain('# 十八、输出格式');
    for (const t of ['# 七、人物疾病占专项', '# 八、六畜／宠物占专项', '# 九、行人', '# 十、婚姻', '# 十一、普通失物', '# 十二、求财', '# 十三、工作', '# 十四、家宅']) {
      expect(sys, `不该带专项：${t}`).not.toContain(t);
    }
    expect(sys).toContain('一、取用');
    expect(sys).toContain('硬上限 600 字');
  });

  it('宠物走失：输出顺序里不再有「现实提醒置顶」，四段外壳优先', () => {
    const sys = composeSystem('我家猫跑丢了');
    expect(sys).not.toContain('**现实行动提醒**：明确不要等卦');
    expect(sys).toContain('不单独设“现实提醒”置顶');
    expect(sys).toContain('唯一例外：人物疾病／六畜出现急症征象时，第一句必须先提醒就医');
  });

  it('宠物走失：只带 §八（含走失子节），不带求财章', () => {
    const sys = composeSystem('我家猫昨天从阳台跑丢了，还能找回来吗');
    expect(sys).toContain('# 八、六畜／宠物占专项');
    expect(sys).toContain('现实寻宠行动（优先于卦理）');
    expect(sys).toContain('**猫取寅**');
    expect(sys).toContain('传本待核、仅备查');
    expect(sys).not.toContain('# 十二、求财与经营专项');
  });

  it('复合问句多命中：面试 + 财运 → 同时带 §十三 与 §十二', () => {
    const sys = composeSystem('面试完等消息，顺便问这个月财运');
    expect(sys).toContain('# 十三、工作、事业与求职专项');
    expect(sys).toContain('# 十二、求财与经营专项');
  });

  it('无专项覆盖（学业）：只发核心章，不硬套', () => {
    const sys = composeSystem('孩子今年高考能不能上本科');
    expect(sys).toContain('# 六、通用断卦原则');
    expect(sys).not.toContain('# 七、人物疾病占专项');
    expect(sys).not.toContain('# 十三、工作、事业与求职专项');
  });

  it('入选的每一章都与规范逐字一致（抽样首尾）', () => {
    const sys = composeSystem('我家猫跑丢了');
    for (const marker of ['# 零、两层职责与事实层硬约束', '# 八、六畜／宠物占专项', '# 二十、自检清单']) {
      const start = specDoc.indexOf(marker);
      expect(start, `规范里找不到 ${marker}`).toBeGreaterThan(-1);
      const head = specDoc.slice(start, start + 120);
      expect(sys, `${marker} 的首段被改动了`).toContain(head);
    }
  });

  it('体积明显小于全量（核心 < 全量 40%，命中专项后仍 < 全量 75%）', () => {
    const core = composeSystem('');
    const withPet = composeSystem('我家猫跑丢了');
    console.log(
      `\n核心 ${core.length} 字(≈${approxTokens(core)} tok) · +宠物章 ${withPet.length} 字(≈${approxTokens(withPet)} tok) · 全量 ${PROMPT_SPEC.length} 字(≈${approxTokens(PROMPT_SPEC)} tok)`,
    );
    expect(core.length).toBeLessThan(PROMPT_SPEC.length * 0.4);
    expect(withPet.length).toBeLessThan(PROMPT_SPEC.length * 0.75);
  });
});

describe('buildLiuyaoPrompt：user 只带事实与问句', () => {
  const time = castTimeInfo(parseTimeInput('2026-11-05T20:56'));
  const chart = castLiuyao(buildLiuyaoInput(time, [7, 7, 8, 9, 7, 8]));
  const promptFor = (q: string) => buildLiuyaoPrompt(buildLiuyaoReadingFacts(chart, time, q));

  it('system 由 composeSystem 组装，user 含问句与事实声明', () => {
    const { system, user } = promptFor('这套房子租下来合适吗');
    expect(system).toBe(composeSystem('这套房子租下来合适吗'));
    expect(system).toContain('# 十四、家宅、房屋与迁移专项');
    expect(user).toContain('这套房子租下来合适吗');
    expect(user).toContain('以上事实由引擎确定性排出');
    expect(user).not.toMatch(/api[_-]?key|sk-|oc_sk_/i);
  });

  it('事实层硬约束与四段要求始终在位', () => {
    const { system } = promptFor('');
    expect(system).toContain('代码引擎输出是唯一排盘事实来源');
    expect(system).toContain('不得重复计算纳甲、六亲、六神、旬空、世应、动变');
    expect(system).toContain('一、取用');
    expect(system).toContain('四、应期');
  });

  it('不含被审计删除的内容', () => {
    const { system } = promptFor('');
    expect(system).not.toContain('六神起法');
    expect(system).not.toContain('# 五、排盘规范');
    expect(system).not.toContain('尝试重排');
  });
});
