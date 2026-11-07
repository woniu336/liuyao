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
