/**
 * 六爻排盘差分测试：与 bazi-web 原 Python 引擎（src/engine/core.py）逐案对齐。
 *
 * 基准文件由 tests/generate_python_baseline.py 生成，覆盖：
 *   A. 全部 4096 种三钱投掷组合（固定丙午年 / 申月 / 己丑日 / 申时）
 *   B. 600 组随机年/月/日/时与投掷（覆盖十神起例、神煞、旬空全干支）
 *
 * canonical 指纹字段与原引擎一一对应；任何一处纳甲、世应、六亲、六神、
 * 伏神、旬空、月卦身、驿马桃花禄神贵人差异都会导致哈希不同。
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { castLiuyao, type LiuyaoChart } from '../lib/liuyao/najia';

interface BaselineCase {
  i: number;
  year_gz: string;
  month_b: string;
  day_gz: string;
  hour_b: string;
  coins: number[];
  hash: string;
}

const baseline = JSON.parse(
  readFileSync(path.resolve(__dirname, 'fixtures/python-baseline.json'), 'utf8'),
) as { engine: string; count: number; cases: BaselineCase[] };

/** 与原引擎逐字段对应的 canonical 串（顺序不可改） */
function canonical(chart: LiuyaoChart): string {
  const s = chart.shensha;
  const parts: string[] = [
    chart.base.name,
    chart.changed?.name ?? '',
    chart.movingLines.join(','),
    chart.voidBranches[0],
    chart.voidBranches[1],
    chart.monthBody.branch,
    String(chart.monthBody.position),
    s.yima,
    s.taohua,
    s.lushen,
    s.guiren.join(','),
  ];
  for (const ln of chart.lines) {
    const hid = ln.hiddenSpirit
      ? `${ln.hiddenSpirit.stem}${ln.hiddenSpirit.branch}${ln.hiddenSpirit.element}${ln.hiddenSpirit.relation}/${ln.hiddenSpirit.flyRelationDesc}`
      : '';
    const ch = ln.changedLine
      ? `${ln.changedLine.stem}${ln.changedLine.branch}${ln.changedLine.element}${ln.changedLine.relation}`
      : '';
    parts.push(
      [
        String(ln.position),
        ln.isWorld ? '1' : '0',
        ln.isResponse ? '1' : '0',
        `${ln.stem}${ln.branch}${ln.element}`,
        ln.relation,
        ln.isMoving ? '1' : '0',
        ln.sixGod,
        hid,
        ch,
      ].join('|'),
    );
  }
  return parts.join('|');
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

describe('六爻确定性排盘 · 与原 Python 引擎对齐', () => {
  it('基准文件可供比对', () => {
    expect(baseline.count).toBeGreaterThan(4000);
    expect(baseline.cases.length).toBe(baseline.count);
  });

  it('全部基准案 canonical 指纹一致', () => {
    const mismatches: string[] = [];
    for (const c of baseline.cases) {
      const chart = castLiuyao({
        yearGz: c.year_gz,
        monthBranch: c.month_b as never,
        dayGz: c.day_gz,
        hourBranch: c.hour_b as never,
        coins: c.coins,
      });
      const got = sha256(canonical(chart));
      if (got !== c.hash) {
        mismatches.push(
          `#${c.i} ${c.year_gz}/${c.month_b}/${c.day_gz}/${c.hour_b} coins=${c.coins.join('')}`,
        );
      }
    }
    expect(mismatches.slice(0, 20)).toEqual([]);
  });
});
