import { describe, expect, it } from 'vitest';
import { buildBoardFromManualTrigrams, buildBoardFromTianDiNumbers } from '../lib/xct/boardBuilder';
import { judgeFullBoard } from '../lib/xct/judgeEngine';
import type { CastTimeInfo } from '../lib/liuyao/ganzhi';
import { buildXctReadingFacts } from '../lib/readings/facts';
import { buildXctPrompt } from '../app/api/read/prompt-xct';
import {
  BIRTH_GENDER_MAP,
  birthGenderByHeaven,
  birthYongGong,
  marriageYongGong,
  parentYongGong,
} from '../lib/xct/yong-gong';
import { calculateYiBian, structureFromPair } from '../lib/xct/yi-bian';

const time: CastTimeInfo = {
  iso: '',
  solarText: '2026年11月5日 15:30',
  lunarText: '二〇二六年 农历九月廿七',
  ganzhiText: '丙午年 戊戌月 癸未日 己未时',
  yearGz: '丙午',
  monthGz: '戊戌',
  dayGz: '癸未',
  hourGz: '己未',
  monthBranch: '戌',
  hourBranch: '未',
};

function factsFor(question: string, opts: Partial<Parameters<typeof buildXctReadingFacts>[4]> = {}) {
  const board = buildBoardFromManualTrigrams('乾', '兑', '离', '坤');
  const judgments = judgeFullBoard(board);
  return buildXctReadingFacts(board, judgments, time, question, { gender: '女', marital: 'married', ...opts });
}

describe('小成图 · 用宫取用', () => {
  it('八宫表覆盖资料里的八类事类', () => {
    expect(BIRTH_GENDER_MAP['乾']).toBe('男');
    expect(BIRTH_GENDER_MAP['坎']).toBe('男');
    expect(BIRTH_GENDER_MAP['巽']).toBe('男');
    expect(BIRTH_GENDER_MAP['兑']).toBe('男');
    expect(BIRTH_GENDER_MAP['坤']).toBe('女');
    expect(BIRTH_GENDER_MAP['离']).toBe('女');
    expect(BIRTH_GENDER_MAP['震']).toBe('女');
    expect(BIRTH_GENDER_MAP['艮']).toBe('女');
  });

  it('生育一律看坤宫，卦象法与中爻法并列', () => {
    expect(birthYongGong().palace).toBe(2);
    const heaven = { 1: '坎', 2: '乾', 3: '震', 4: '巽', 5: '艮', 6: '离', 7: '兑', 8: '坤', 9: '乾' } as never;
    const r = birthGenderByHeaven(heaven);
    expect(r.gua).toBe('乾');
    expect(r.byTrigram).toBe('男');
    expect(r.middleYao.yang).toBe(true);
    expect(r.agree).toBe(true);
  });

  it('已婚男看坤、已婚女看乾；未婚按天盘寻卦', () => {
    const heaven = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '艮', 6: '乾', 7: '兑', 8: '艮', 9: '离' } as never;
    expect(marriageYongGong('男', 'married', heaven)[0].palace).toBe(2);
    expect(marriageYongGong('女', 'married', heaven)[0].palace).toBe(6);
    expect(marriageYongGong('男', 'unmarried', heaven)[0].reason).toContain('巽');
    expect(marriageYongGong('女', 'unmarried', heaven)[0].reason).toContain('震');
    // 天盘无巽/震时退取兑/艮
    const noSeek = { 1: '坎', 2: '坤', 3: '离', 4: '乾', 5: '艮', 6: '乾', 7: '兑', 8: '艮', 9: '离' } as never;
    expect(marriageYongGong('男', 'unmarried', noSeek)[0].palace).toBe(7);
    expect(marriageYongGong('女', 'unmarried', noSeek)[0].palace).toBe(8);
  });

  it('父看乾六、母看坤二', () => {
    expect(parentYongGong('父').palace).toBe(6);
    expect(parentYongGong('母').palace).toBe(2);
  });
});

describe('小成图 · 宜变法（静卦立之卦）', () => {
  it('营数与宜变爻按 55−Σ 之字折返', () => {
    // 六爻全静：7×6 = 42 → 55−42 = 13；路径 12 位往复，第 13 位回到起点 → 初爻
    const r = calculateYiBian([7, 7, 7, 7, 7, 7]);
    expect(r.sum).toBe(42);
    expect(r.movingCount).toBe(0);
    expect(r.position).toBe(1);
    // 14 → 第 2 位
    expect(calculateYiBian([6, 7, 7, 7, 7, 7]).position).toBe(2);
  });

  it('静卦时由宜变爻翻出一爻成之卦', () => {
    const ben = { upper: '乾' as const, lower: '乾' as const };
    const s = structureFromPair(ben, ben);
    expect(s.moving).toEqual([1]);
    expect(s.zhiSource).toBe('yibian');
    // 初爻由阳变阴：乾为天 → 天风姤（下卦乾 111 → 巽 011）
    expect(s.zhi).toEqual({ upper: '乾', lower: '巽' });
    expect(s.yiBian.note).toContain('六爻安静');
  });

  it('有动爻时之卦由动爻定，宜变只是参看', () => {
    // 上卦 乾(1,1,1) → 离(1,0,1)：差在第二爻，即第 5 爻位
    const s = structureFromPair({ upper: '乾' as const, lower: '乾' as const }, { upper: '离' as const, lower: '乾' as const });
    expect(s.moving).toEqual([5]);
    expect(s.zhiSource).toBe('moving');
  });
});

describe('小成图 · prompt', () => {
  const facts = factsFor('我老公今年事业上能不能升职？');
  const { system, user } = buildXctPrompt(facts);

  it('系统提示含八宫表、四段标题与专项', () => {
    expect(system).toContain('八宫取用表');
    expect(system).toContain('一、定宫');
    expect(system).toContain('四、应期');
    expect(system).toContain('阖⟷辟'.slice(0, 1));
    expect(system).toContain('主用宫只取一个');
    expect(system).toContain('旁推');
    expect(system).toContain('反推');
  });

  it('明确禁用未定义概念，且禁止五行六亲', () => {
    expect(system).toContain('本版禁用');
    expect(system).toContain('用宫空亡');
    expect(system).toContain('归藏出伏位');
    expect(system).toContain('卦气旺弱');
    expect(system).toContain('不要引入五行、六亲、世应、旬空');
  });

  it('事实层带九宫、卦→本宫、天盘缺漏，且不含密钥', () => {
    expect(user).toContain('【九宫】');
    expect(user).toContain('【卦→本宫】');
    expect(user).toContain('【天盘出现】');
    expect(user).toContain('【缺席】');
    expect(user).toContain('【求测者】女　已婚');
    expect(user).not.toMatch(/sk-|api[_-]?key/i);
  });

  it('问生育时附坤宫判据（卦象法 + 中爻法）', () => {
    const birthFacts = factsFor('怀孕三个月了，想问是男孩还是女孩？');
    const out = buildXctPrompt(birthFacts).user;
    expect(out).toContain('生育判据（坤宫）');
    expect(out).toContain('卦象法');
    expect(out).toContain('中爻法');
  });

  it('字数与格式约定在系统提示里', () => {
    expect(system).toContain('400–520');
    expect(system).toContain('硬上限 550');
    expect(system).toContain('不要逐站复述');
    expect(system).toContain('不用任何 Markdown 标记');
  });
});
