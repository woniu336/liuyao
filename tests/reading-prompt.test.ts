import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildLiuyaoPrompt } from '../app/api/read/prompt';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';
import { PROMPT_SPEC } from '../lib/readings/prompt-spec.generated';

const specDoc = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'prompt-liuyao.md'), 'utf8');

const time = castTimeInfo(parseTimeInput('2026-11-05T20:56'));
const chart = castLiuyao(buildLiuyaoInput(time, [7, 7, 8, 9, 7, 8]));
const promptFor = (question: string) => buildLiuyaoPrompt(buildLiuyaoReadingFacts(chart, time, question));

describe('运行时提示词 = 整份规范（原版，不精简）', () => {
  it('system 与 docs/prompt-liuyao.md 逐字一致', () => {
    const { system } = promptFor('我家猫跑丢了');
    expect(system).toBe(specDoc.replace(/\r\n/g, '\n'));
  });

  it('规范生成物与文档同步（改文档必须重新 gen）', () => {
    expect(PROMPT_SPEC).toBe(specDoc.replace(/\r\n/g, '\n'));
  });

  it('规范里的事实层硬约束与八条铁律在位', () => {
    const { system } = promptFor('');
    expect(system).toContain('两层职责与事实层硬约束');
    expect(system).toContain('代码引擎输出是唯一排盘事实来源');
    expect(system).toContain('不得重复计算纳甲、六亲、六神、旬空、世应、动变');
    expect(system).toContain('不得将未提供的数据自行补算为确定事实');
  });

  it('输出仍是四段禅意写法（不要求长篇报告）', () => {
    const { system } = promptFor('');
    expect(system).toContain('一、取用');
    expect(system).toContain('四、应期');
    expect(system).toContain('硬上限 600 字');
    expect(system).toContain('取用约 100 字');
  });

  it('专项规则保持原版细节（不被精简）', () => {
    const { system } = promptFor('');
    // 宠物走失：现实搜寻 7 步 + 猫本命分歧
    expect(system).toContain('现实寻宠行动（优先于卦理）');
    expect(system).toContain('猫犬同位');
    // 婚姻：先辨问法 + 10 步输出顺序
    expect(system).toContain('婚姻专项输出顺序');
    // 家宅：内外卦三书分歧
    expect(system).toContain('存在古籍分歧，不得机械固定');
    // 失物：物类取用表
    expect(system).toContain('舟车衣服用父母');
  });

  it('不含被审计删除的内容（排盘教程 / 自检重算项）', () => {
    const { system } = promptFor('');
    expect(system).not.toContain('六神起法');
    expect(system).not.toContain('# 五、排盘规范');
    expect(system).not.toContain('输入核对与排盘前检查');
    expect(system).not.toContain('尝试重排');
  });
});

describe('user 消息只带盘面事实与问句', () => {
  it('含问句与盘面，且声明事实由引擎排出', () => {
    const { user } = promptFor('这套房子租下来合适吗');
    expect(user).toContain('这套房子租下来合适吗');
    expect(user).toContain('以上事实由引擎确定性排出');
    expect(user).toContain('不要改写事实本身');
  });

  it('不把密钥或 prompt 模板塞进 user', () => {
    const { user } = promptFor('问财运');
    expect(user).not.toMatch(/api[_-]?key|sk-|oc_sk_/i);
  });
});
