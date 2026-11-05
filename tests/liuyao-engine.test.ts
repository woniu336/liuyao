import { describe, expect, it } from 'vitest';
import { castLiuyao, HexagramIntegrityError } from '../lib/liuyao/najia';

/**
 * 引擎自证用例（不依赖差分基准）：
 * 与 bazi-web `src/engine/core.py::__main__` 的断言同源，另加天医 / 文昌两条新增神煞。
 */
describe('六爻确定性排盘 · 引擎自证', () => {
  it('丙午年 申月 己丑日 申时 [0,1,1,1,1,1] → 天风姤之乾为天', () => {
    const chart = castLiuyao({
      yearGz: '丙午',
      monthBranch: '申',
      dayGz: '己丑',
      hourBranch: '申',
      coins: [0, 1, 1, 1, 1, 1],
    });
    expect(chart.base.name).toBe('天风姤');
    expect(chart.changed?.name).toBe('乾为天');
    expect(chart.base.palace).toBe('乾');
    expect(chart.movingLines).toEqual([1]);
    // 世爻在初爻，应爻在四爻
    expect(chart.lines[0].isWorld).toBe(true);
    expect(chart.lines[3].isResponse).toBe(true);
    // 己丑日旬空午、未
    expect(chart.voidBranches).toEqual(['午', '未']);
    // 初爻老阴动，纳甲辛丑土
    expect(chart.lines[0]).toMatchObject({ stem: '辛', branch: '丑', element: '土', relation: '父母' });
  });

  it('天医取月建前一位、文昌依日干', () => {
    const chart = castLiuyao({
      yearGz: '丙午',
      monthBranch: '申',
      dayGz: '己丑',
      hourBranch: '申',
      coins: [1, 1, 1, 1, 1, 1],
    });
    expect(chart.shensha.tianyi).toBe('未'); // 申前一位为未
    expect(chart.shensha.wenchang).toBe('酉'); // 己日文昌在酉
    expect(chart.shensha.yima).toBe('亥'); // 丑日（巳酉丑）马在亥
    expect(chart.shensha.taohua).toBe('午');
    expect(chart.shensha.lushen).toBe('午'); // 己禄在午
    expect(chart.shensha.guiren).toEqual(['子', '申']);
  });

  it('神煞落到爻位：天医 / 文昌 / 驿马等按地支挂载', () => {
    const chart = castLiuyao({
      yearGz: '丙午',
      monthBranch: '申',
      dayGz: '己丑',
      hourBranch: '申',
      coins: [1, 1, 1, 1, 1, 1],
    });
    for (const line of chart.lines) {
      if (line.branch === '未') expect(line.stars).toContain('天医');
      if (line.branch === '酉') expect(line.stars).toContain('文昌');
      if (line.branch === '亥') expect(line.stars).toContain('驿马');
    }
  });

  it('缺六亲时自本宫八纯首卦同位挂伏神', () => {
    // 风山渐（艮宫）：正卦缺妻财，伏神丙子水落五爻
    const chart = castLiuyao({
      yearGz: '丙午',
      monthBranch: '申',
      dayGz: '己丑',
      hourBranch: '申',
      coins: [0, 0, 1, 0, 1, 1],
    });
    const hidden = chart.lines.find((l) => l.hiddenSpirit);
    expect(hidden?.position).toBe(5);
    expect(hidden?.hiddenSpirit).toMatchObject({ stem: '丙', branch: '子', relation: '妻财' });
  });

  it('投掷数不合法时 fail-closed 抛错', () => {
    expect(() =>
      castLiuyao({
        yearGz: '丙午',
        monthBranch: '申',
        dayGz: '己丑',
        hourBranch: '申',
        coins: [1, 1, 1, 1, 1],
      }),
    ).toThrow(HexagramIntegrityError);
    expect(() =>
      castLiuyao({
        yearGz: '丙午',
        monthBranch: '申',
        dayGz: '己丑',
        hourBranch: '申',
        coins: [1, 1, 1, 1, 1, 5],
      }),
    ).toThrow(HexagramIntegrityError);
  });
});
