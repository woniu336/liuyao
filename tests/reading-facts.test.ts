import { describe, expect, it } from 'vitest';
import { castLiuyao } from '../lib/liuyao/najia';
import type { CastTimeInfo } from '../lib/liuyao/ganzhi';
import { buildXctReadingFacts, buildLiuyaoReadingFacts } from '../lib/readings/facts';
import { buildBoardFromManualTrigrams } from '../lib/xct/boardBuilder';
import { judgeFullBoard } from '../lib/xct/judgeEngine';
import { traceZhengTuiChain } from '../lib/xct/dagTracker';

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

describe('解卦事实层', () => {
  it('六爻 facts 只含盘面事实，六爻分列且可 JSON 往返', () => {
    const chart = castLiuyao({
      yearGz: '丙午',
      monthBranch: '申',
      dayGz: '己丑',
      hourBranch: '午',
      coins: [0, 1, 1, 1, 1, 1],
    });
    const facts = buildLiuyaoReadingFacts(chart, time, '此事可否推进');
    expect(facts.lines).toHaveLength(6);
    expect(facts.base.name).toBe('天风姤');
    expect(facts.changed?.name).toBe('乾为天');
    expect(facts.voidBranches).toEqual(['午', '未']);
    expect(facts.question).toBe('此事可否推进');
    // 事实层不得夹带任何密钥/配置字段
    const text = JSON.stringify(facts);
    expect(text).not.toMatch(/api[_-]?key|sk-|token|secret|password/i);
    expect(JSON.parse(text)).toEqual(facts);
  });

  it('问句超长截断到 500 字', () => {
    const chart = castLiuyao({
      yearGz: '丙午',
      monthBranch: '申',
      dayGz: '己丑',
      hourBranch: '午',
      coins: [1, 1, 1, 1, 1, 1],
    });
    const facts = buildLiuyaoReadingFacts(chart, time, '问'.repeat(800));
    expect(facts.question.length).toBe(500);
  });

  it('小成图 facts 含九宫与正推链，卦名与本/之图一致', () => {
    const board = buildBoardFromManualTrigrams('乾', '兑', '离', '坤');
    const judgments = judgeFullBoard(board);
    const chain = traceZhengTuiChain(board, 5);
    const facts = buildXctReadingFacts(board, judgments, chain, time, '');
    expect(facts.palaces).toHaveLength(9);
    expect(facts.ben.name).toBe('天泽履');
    expect(facts.zhi.name).toBe('火地晋');
    expect(facts.center).toBe(board.center);
    expect(facts.chain.path.length).toBeGreaterThan(0);
    const text = JSON.stringify(facts);
    expect(text).not.toMatch(/api[_-]?key|sk-|token|secret|password/i);
  });
});
