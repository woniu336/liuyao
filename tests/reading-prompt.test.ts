import { describe, expect, it } from 'vitest';
import { castLiuyao } from '../lib/liuyao/najia';
import type { CastTimeInfo } from '../lib/liuyao/ganzhi';
import { buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildReadingPrompt } from '../app/api/read/prompt';

const time: CastTimeInfo = {
  iso: '',
  solarText: '2026年11月5日 12:02',
  lunarText: '二〇二六年 农历九月廿七',
  ganzhiText: '丙午年 戊申月 己丑日 庚午时',
  yearGz: '丙午',
  monthGz: '戊申',
  dayGz: '己丑',
  hourGz: '庚午',
  monthBranch: '申',
  hourBranch: '午',
};

function factsOf(coins: number[]) {
  const chart = castLiuyao({
    yearGz: '丙午',
    monthBranch: '申',
    dayGz: '己丑',
    hourBranch: '午',
    coins,
  });
  return buildLiuyaoReadingFacts(chart, time, '测试');
}

describe('解卦 prompt（精简版）', () => {
  const facts = factsOf([0, 1, 1, 1, 1, 1]);
  const { system, user } = buildReadingPrompt(facts);

  it('系统提示已经压到千字级，且明确「不重排盘」', () => {
    expect(system.length).toBeLessThan(1600);
    expect(system).toContain('不要重排盘');
    expect(system).toContain('不断死');
    expect(system).toContain('应期');
  });

  it('移除了排盘教程、病占专项、报告式自检', () => {
    expect(system).not.toContain('六神起法');
    expect(system).not.toContain('排盘规范');
    expect(system).not.toContain('病占专项');
    expect(system).not.toContain('自检清单');
    expect(system).not.toContain('输入核对');
    expect(system).not.toContain('复盘');
  });

  it('用户消息带盘面事实、十三神煞与经文，且不含翻译注文', () => {
    expect(user).toContain('天风姤');
    expect(user).toContain('【十三神煞】');
    expect(user).toContain('劫煞');
    expect(user).toContain('【经文】');
    expect(user).toContain('卦辞');
    expect(user).toContain('初六');
    expect(user).not.toContain('翻译：');
    expect(user).not.toContain('象征：');
  });

  it('输出要求是四段禅意写法，不要求长篇报告', () => {
    expect(system).toContain('一、取用');
    expect(system).toContain('四、应期');
    expect(system).toContain('500–800 字');
    expect(system).not.toContain('输出格式');
  });

  it('神煞取值与盘面同源（来自 shensha.ts，而非模型自算）', () => {
    const f = factsOf([1, 1, 1, 1, 1, 1]);
    expect(f.shensha.guiren).toBe('子、申');
    expect(f.shensha.yima).toBe('亥');
    expect(f.shensha.taohua).toBe('午');
    expect(f.shensha.tianyi).toBe('未');
    expect(f.shensha.wenchang).toBe('酉');
    expect(f.oracle.baseGuaCi).toBe('元亨利贞。');
  });

  it('六爻全动时带用九/用六', () => {
    const allYang = factsOf([9, 9, 9, 9, 9, 9]);
    expect(allYang.oracle.yong?.title).toBe('用九');
    expect(allYang.oracle.yong?.text).toContain('用九');
  });
});
