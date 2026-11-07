import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SPEC_CHAPTERS, CORE_CHAPTER_IDS, OUTPUT_CHAPTER_ID, OUTPUT_FORMATS } from '../lib/readings/prompt-spec.generated';

const spec = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'prompt-liuyao.md'), 'utf8').replace(/\r\n/g, '\n');

/** 中文数字 → 序号，用于比较章节顺序 */
const NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九',
  '二十', '二十一', '二十二', '二十三'];

describe('提示词章节结构自洽（防顺延漏改）', () => {
  it('章节编号从零起连续，且与正文标题一致', () => {
    const ids = Object.keys(SPEC_CHAPTERS);
    expect(ids).toEqual(NUMS.slice(0, ids.length));
    for (const id of ids) {
      expect(SPEC_CHAPTERS[id].startsWith('# ' + id + '、'), `第 ${id} 章标题不匹配`).toBe(true);
    }
  });

  it('正文里引用的「第X章 / §X」都存在', () => {
    const ids = new Set(Object.keys(SPEC_CHAPTERS));
    // 只校验落在本文档编号范围内（零..二十三）的引用；
    // 像「《易林补遗》第六十章」这种外部书章号不参与校验。
    const inRange = new Set(NUMS);
    const bad: string[] = [];
    for (const m of spec.matchAll(/第([零一二三四五六七八九十]+)章/g)) {
      if (inRange.has(m[1]) && !ids.has(m[1])) bad.push(m[0]);
    }
    for (const m of spec.matchAll(/§([零一二三四五六七八九十]+)/g)) {
      if (inRange.has(m[1]) && !ids.has(m[1])) bad.push(m[0]);
    }
    expect(bad, `引用了不存在的章号：${[...new Set(bad)].join('、')}`).toEqual([]);
  });

  it('核心章都是真实存在的章，且不含专项章', () => {
    const ids = new Set(Object.keys(SPEC_CHAPTERS));
    for (const id of CORE_CHAPTER_IDS) expect(ids.has(id), `核心章 ${id} 不存在`).toBe(true);
    // 专项章（七~十五）不得出现在核心列表里
    for (const id of ['七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五']) {
      expect(CORE_CHAPTER_IDS, `专项章 ${id} 混进了核心章`).not.toContain(id);
    }
  });

  it('输出格式章存在，且 A~J 十个清单齐全', () => {
    expect(Object.keys(SPEC_CHAPTERS)).toContain(OUTPUT_CHAPTER_ID);
    expect(Object.keys(OUTPUT_FORMATS)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
    expect(SPEC_CHAPTERS[OUTPUT_CHAPTER_ID]).toContain('## J. 学业、升学与资格考试专项');
  });

  it('学业专项独立成章，含事项分类 / 用神 / 流程 / 应期 / 安全边界', () => {
    const edu = SPEC_CHAPTERS['十五'];
    expect(edu).toContain('学业、升学与职业资格考试专项');
    for (const must of ['三轴用神', '事项分类', '推演流程', '应期', '安全与现实边界', '严禁的机械断法', '子孙的双重语义']) {
      expect(edu, `学业章缺「${must}」`).toContain(must);
    }
  });
});
