import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SPECIALTIES, detectSpecialty, specialtyBlock, type Specialty } from '../lib/readings/specialties';
import { buildLiuyaoPrompt } from '../app/api/read/prompt';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildLiuyaoInput, castTimeInfo, parseTimeInput } from '../lib/liuyao/ganzhi';
import { castLiuyao } from '../lib/liuyao/najia';

const specDoc = fs.readFileSync(
  path.resolve(__dirname, '..', 'docs', 'prompt-liuyao.md'),
  'utf8',
);

describe('问句 → 专项路由', () => {
  const cases: [string, Specialty][] = [
    ['我家猫昨天从阳台跑丢了，还能找回来吗', 'lostPet'],
    ['狗走失了三天', 'lostPet'],
    ['我父亲住院了，这个病要紧吗', 'illness'],
    ['这份工作面试能过吗，什么时候收到 offer', 'career'],
    ['这笔欠款什么时候能到账', 'wealth'],
    ['想问我俩还能复合吗', 'marriage'],
    ['他出差半个月了，什么时候回来', 'traveler'],
    ['手机昨天丢了，还能找到吗', 'lostItem'],
    ['这套房子租下来合适吗，押金能退吗', 'home'],
    ['今年整体运势如何', 'general'],
    ['', 'general'],
  ];

  for (const [q, want] of cases) {
    it(`「${q || '(空)'}」→ ${want}`, () => {
      expect(detectSpecialty(q)).toBe(want);
    });
  }
});

describe('专项要点与规范文档不脱节', () => {
  it('每个专项都标注了规范里真实存在的章号', () => {
    for (const [id, s] of Object.entries(SPECIALTIES)) {
      if (!s) continue;
      // 章号形如 §七 / §八.4.2，取 § 后的章名去文档里核对
      const chapterName = s.chapter.replace(/^§/, '').split('.')[0];
      expect(specDoc, `${id} 的章号 ${s.chapter} 在规范中找不到`).toContain(chapterName);
    }
  });

  it('general 不注入任何内容', () => {
    expect(SPECIALTIES.general).toBeNull();
    expect(specialtyBlock('general')).toBe('');
  });

  it('每节要点都含取用、禁忌、输出三块（防止被删成一句话）', () => {
    for (const [id, s] of Object.entries(SPECIALTIES)) {
      if (!s) continue;
      expect(s.brief, `${id} 缺「用神」`).toContain('用神');
      expect(s.brief, `${id} 缺「禁」`).toContain('禁');
      expect(s.brief.length, `${id} 过短`).toBeGreaterThan(150);
    }
  });
});

describe('buildLiuyaoPrompt 真的注入了专项', () => {
  const time = castTimeInfo(parseTimeInput('2026-11-05T20:56'));
  const chart = castLiuyao(buildLiuyaoInput(time, [7, 7, 8, 9, 7, 8]));

  const promptFor = (question: string) => {
    const facts = buildLiuyaoReadingFacts(chart, time, question);
    return buildLiuyaoPrompt(facts);
  };

  it('问宠物走失 → system 里带宠物专项，且不含求财专项', () => {
    const { system } = promptFor('我家猫跑丢了还能找回来吗');
    expect(system).toContain('本问专项要点（宠物走失');
    expect(system).toContain('子孙＝宠物本身');
    expect(system).not.toContain('本问为求财／经营占');
  });

  it('问欠款 → 带求财专项', () => {
    const { system } = promptFor('这笔欠款什么时候到账');
    expect(system).toContain('本问为求财／经营占');
    expect(system).toContain('妻财＝财务结果');
  });

  it('无问句 → 不注入专项，仍是四段约束', () => {
    const { system } = promptFor('');
    expect(system).not.toContain('本问专项要点');
    expect(system).toContain('段首必须是下面四行原文');
  });

  it('注入后仍受字数约束（< 3200）', () => {
    const { system } = promptFor('这份工作面试能过吗');
    expect(system.length).toBeLessThan(3200);
  });
});
