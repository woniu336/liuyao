import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildLiuyaoPrompt, composeSystem } from '../app/api/read/prompt';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';
import { PROMPT_SPEC } from '../lib/readings/prompt-spec.generated';

const specDoc = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'prompt-liuyao.md'), 'utf8').replace(/\r\n/g, '\n');

const time = castTimeInfo(parseTimeInput('2026-11-05T20:56'));
const chart = castLiuyao(buildLiuyaoInput(time, [7, 7, 8, 9, 7, 8]));
const promptFor = (q: string) => buildLiuyaoPrompt(buildLiuyaoReadingFacts(chart, time, q));

describe('运行时提示词 = 整份规范（全量，不选章、不压缩）', () => {
  it('system 恒等于规范全文，与问句无关', () => {
    expect(composeSystem()).toBe(specDoc);
    for (const q of ['', '我家猫跑丢了', '孩子今年高考', '面试完顺便问财运']) {
      expect(promptFor(q).system, `问句「${q}」的 system 不是全量`).toBe(specDoc);
    }
  });

  it('生成物与文档同步（改文档必须重新 gen:prompt）', () => {
    expect(PROMPT_SPEC).toBe(specDoc);
  });

  it('所有专项章都随全量发送（不再有"按问句命中"）', () => {
    const { system } = promptFor('孩子今年高考');
    for (const title of [
      '# 七、人物疾病占专项',
      '# 八、六畜／宠物占专项',
      '# 九、行人、音信与人员走失专项',
      '# 十、婚姻与婚恋专项',
      '# 十一、普通失物与寻物专项',
      '# 十二、求财与经营专项',
      '# 十三、工作、事业与求职专项',
      '# 十四、家宅、房屋与迁移专项',
      '# 十五、学业、升学与职业资格考试专项',
    ]) {
      expect(system, `缺章：${title}`).toContain(title);
    }
  });

  it('事实层硬约束与四段输出要求在位', () => {
    const { system } = promptFor('');
    expect(system).toContain('代码引擎输出是唯一排盘事实来源');
    expect(system).toContain('不得重复计算纳甲、六亲、六神、旬空、世应、动变');
    expect(system).toContain('一、取用');
    expect(system).toContain('四、应期');
    expect(system).toContain('硬上限 600 字');
  });

  it('不含被审计删除的内容', () => {
    const { system } = promptFor('');
    expect(system).not.toContain('六神起法');
    expect(system).not.toContain('# 五、排盘规范');
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
