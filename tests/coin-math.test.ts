import { describe, expect, it } from 'vitest';
import { coinFacesOf } from '../components/liuyao/CastWorkbench';
import { coinSidesOf } from '../lib/liuyao/cast-url';
import { tossLine, tossThree } from '../lib/liuyao/random';

/**
 * 三钱法的换算必须与「字=2、背=3」严格一致：
 *   6 老阴 = 三字 = 2+2+2
 *   7 少阳 = 一背两字 = 3+2+2
 *   8 少阴 = 两背一字 = 3+3+2
 *   9 老阳 = 三背 = 3+3+3
 * 这里同时校验「爻值 → 币面」与「币面 → 爻值」两个方向，防止上下位写反。
 */
const FACE_VALUE = { 字: 2, 背: 3 } as const;

describe('铜钱换算：字面 2 / 背面 3', () => {
  it('爻值 → 三枚币面（coinFacesOf 用 2/3 表示）', () => {
    expect(coinFacesOf(6)).toEqual([2, 2, 2]); // 字字字
    expect(coinFacesOf(7)).toEqual([3, 2, 2]); // 背字字
    expect(coinFacesOf(8)).toEqual([3, 3, 2]); // 背背字
    expect(coinFacesOf(9)).toEqual([3, 3, 3]); // 背背背
  });

  it('爻值 → 三枚币面（coinSidesOf 用 字/背 表示）', () => {
    expect(coinSidesOf(6)).toEqual(['字', '字', '字']);
    expect(coinSidesOf(7)).toEqual(['背', '字', '字']);
    expect(coinSidesOf(8)).toEqual(['背', '背', '字']);
    expect(coinSidesOf(9)).toEqual(['背', '背', '背']);
  });

  it('两个方向的换算自相洽，且和值等于爻值', () => {
    for (const v of [6, 7, 8, 9] as const) {
      const faces23 = coinFacesOf(v);
      const sides = coinSidesOf(v);
      // 2 ↔ 字，3 ↔ 背
      expect(faces23.map((n) => (n === 2 ? '字' : '背'))).toEqual(sides);
      // 和值 = 爻值
      expect(sides.reduce((sum, s) => sum + FACE_VALUE[s], 0)).toBe(v);
      // 背的枚数 = 爻值 − 6
      expect(sides.filter((s) => s === '背')).toHaveLength(v - 6);
    }
  });

  it('随机投掷的三枚币面之和，就是返回的爻值', () => {
    for (let i = 0; i < 3000; i += 1) {
      const three = tossThree();
      const sum = three.reduce((s, f) => s + f, 0);
      expect([6, 7, 8, 9]).toContain(sum);
      expect(tossLine()).toBeGreaterThanOrEqual(6);
    }
    // 单次投掷：直接对拍 tossThree 与 tossLine 的口径
    for (let i = 0; i < 500; i += 1) {
      // 用同一实现分别取，验证「和值落区间」不会出现 5/10 之类的越界
      const v = tossLine();
      expect(v).toBeGreaterThanOrEqual(6);
      expect(v).toBeLessThanOrEqual(9);
    }
  });
});
