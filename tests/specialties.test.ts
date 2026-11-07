import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { QUICK_REF, quickRefBlock } from '../lib/readings/specialties';
import { buildLiuyaoPrompt } from '../app/api/read/prompt';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';

const specDoc = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'prompt-liuyao.md'), 'utf8');

describe('专项速查层（常驻，不依赖用户选择）', () => {
  it('覆盖规范里已建立的 9 个专项', () => {
    expect(QUICK_REF).toHaveLength(9);
    const names = QUICK_REF.map((s) => s.name);
    for (const want of ['人物疾病', '六畜／宠物', '宠物走失', '行人／寻人', '婚姻婚恋', '普通失物', '求财经营', '工作事业', '家宅迁移']) {
      expect(names, `缺专项：${want}`).toContain(want);
    }
  });

  it('每条都标注了规范里真实存在的章号', () => {
    for (const s of QUICK_REF) {
      const chapterName = s.chapter.replace(/^§/, '').split('.')[0];
      expect(specDoc, `${s.name} 的章号 ${s.chapter} 在规范中找不到`).toContain(chapterName);
      // 专项名也要能在规范里找到（防止代码里改名、文档没跟上）
      expect(specDoc, `${s.name} 在规范中找不到`).toContain(s.name.replace('／', '／'));
    }
  });

  it('每条都有「用神」与「忌」，且不是空话', () => {
    for (const s of QUICK_REF) {
      expect(s.use.length, `${s.name} 的 use 过短`).toBeGreaterThan(15);
      expect(s.ban.length, `${s.name} 的 ban 过短`).toBeGreaterThan(10);
    }
  });

  it('块内自带逃生门（不属于任何专项时不硬套）', () => {
    const block = quickRefBlock();
    expect(block).toContain('专项速查');
    expect(block).toContain('不要硬套');
    expect(block.length).toBeLessThan(1600);
  });
});

describe('buildLiuyaoPrompt：速查层常驻，四段与字数不变', () => {
  const time = castTimeInfo(parseTimeInput('2026-11-05T20:56'));
  const chart = castLiuyao(buildLiuyaoInput(time, [7, 7, 8, 9, 7, 8]));
  const promptFor = (question: string) =>
    buildLiuyaoPrompt(buildLiuyaoReadingFacts(chart, time, question));

  it('任何问句都带速查层（不需要选择、不依赖关键词）', () => {
    for (const q of ['', '今年整体运势如何', '我家猫跑丢了', '面试完顺便问这个月财运']) {
      const { system } = promptFor(q);
      expect(system).toContain('专项速查');
      expect(system).toContain('宠物走失');
      expect(system).toContain('求财经营');
    }
  });

  it('事实层铁律与四段约束仍在', () => {
    const { system } = promptFor('我家猫跑丢了还能找回吗');
    expect(system).toContain('事实层铁律');
    expect(system).toContain('不重算、不改写');
    expect(system).toContain('段首必须是下面四行原文');
    expect(system).toContain('硬上限 600 字');
  });

  it('总长度受控（通用 1930 + 速查 ≤1600）', () => {
    const { system } = promptFor('这套房子租下来合适吗');
    expect(system.length).toBeLessThan(3600);
  });
});
