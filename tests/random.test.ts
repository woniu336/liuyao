import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { secureDigits, tossCoin, tossLine, tossLines, tossStats, tossThree } from '../lib/liuyao/random';

/**
 * 起卦随机性测试。
 *
 * 这里不是"跑一次看看"——而是把「加密级来源」与「分布是否均匀」两条都钉死：
 *   1. 每条路径都必须经过 crypto.getRandomValues（用 spy 证明）；
 *   2. 大样本分布与理论值卡方检验通过（字/背 1:1，爻值 1:3:3:1）；
 *   3. 环境缺少 Web Crypto 时必须抛错，绝不静默回落 Math.random。
 */
describe('起卦随机源', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('使用 Web Crypto，且每次投掷都真的取随机数', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    tossCoin();
    tossThree();
    tossLine();
    tossLines(6);
    secureDigits(4);
    expect(spy).toHaveBeenCalled();
  });

  it('投掷结果只可能是 2/3 与 6/7/8/9', () => {
    for (let i = 0; i < 500; i += 1) {
      expect([2, 3]).toContain(tossCoin());
      const line = tossLine();
      expect([6, 7, 8, 9]).toContain(line);
    }
    expect(tossLines(4)).toHaveLength(4);
    expect(secureDigits(9).every((d) => /^[0-9]$/.test(d))).toBe(true);
  });

  it('爻值理论分布严格为 6:1/8 · 7:3/8 · 8:3/8 · 9:1/8', async () => {
    const { __idealDistribution } = await import('../lib/liuyao/random');
    expect(__idealDistribution()).toEqual({ 6: 0.125, 7: 0.375, 8: 0.375, 9: 0.125 });
  });

  it('大样本爻值分布通过卡方检验（df=3，阈值 16.27≈p0.001）', () => {
    const rounds = 40_000;
    const counts: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
    for (const v of tossLines(rounds)) counts[v] += 1;

    const expected: Record<number, number> = {
      6: rounds / 8,
      7: (rounds * 3) / 8,
      8: (rounds * 3) / 8,
      9: rounds / 8,
    };
    const chi2 = [6, 7, 8, 9].reduce(
      (sum, v) => sum + (counts[v] - expected[v]) ** 2 / expected[v],
      0,
    );
    // 同时给出实测占比，便于人工核对（4 万掷时单类别标准误约 0.1–0.16pp）
    const ratio = (v: number) => counts[v] / rounds;
    expect(Math.abs(ratio(6) - 0.125)).toBeLessThan(0.008);
    expect(Math.abs(ratio(7) - 0.375)).toBeLessThan(0.012);
    expect(Math.abs(ratio(8) - 0.375)).toBeLessThan(0.012);
    expect(Math.abs(ratio(9) - 0.125)).toBeLessThan(0.008);
    expect(chi2).toBeLessThan(16.27);
  });

  it('大样本分布均匀（字背 1:1，爻值 1:3:3:1）', () => {
    const s = tossStats(20_000);
    // 字面占比应逼近 0.5（2 万掷 ≈ 6 万枚，标准误约 0.2%，放宽到 1% 仍能抓住系统性偏差）
    expect(Math.abs(s.faceRatio - 0.5)).toBeLessThan(0.01);
    // 各爻值相对理论值的偏差
    expect(s.maxDeviation).toBeLessThan(1.5);
    expect(s.valueCounts[7]).toBeGreaterThan(s.valueCounts[6]);
    expect(s.valueCounts[8]).toBeGreaterThan(s.valueCounts[9]);
  });

  it('拒绝采样：0–9 分布通过卡方检验（df=9）', () => {
    // 2 万个数字：期望每数字 2000，卡方自由度 9。
    // 阈值取 30（p≈0.0004）：既不会偶发报红，又能抓住真实偏差。
    const counts = new Array(10).fill(0);
    for (let round = 0; round < 2000; round += 1) {
      for (const d of secureDigits(10)) counts[Number(d)] += 1;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    const expected = total / 10;
    const chi2 = counts.reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, 0);
    expect(total).toBe(20_000);
    expect(chi2).toBeLessThan(30);
  });

  it('缺少 Web Crypto 时 fail-closed，不回落 Math.random', () => {
    const original = globalThis.crypto;
    // 模拟不支持的环境
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      expect(() => tossCoin()).toThrow(/Web Crypto/);
      expect(() => secureDigits(1)).toThrow(/Web Crypto/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});

describe('起卦路径不得使用 Math.random（守卫生效）', () => {
  const root = path.resolve(__dirname, '..');
  const guarded = [
    'components/liuyao/CastWorkbench.tsx',
    'components/xct/XiaoChengTuView.tsx',
    'lib/liuyao/random.ts',
  ];

  it('源码里没有 Math.random（注释除外）', () => {
    const stripComments = (code: string) => {
      const noBlock = code.replace(/\/\*[\s\S]*?\*\//g, '');
      return noBlock
        .split(String.fromCharCode(10))
        .filter((line) => !line.trimStart().startsWith('//'))
        .join(String.fromCharCode(10));
    };

    for (const rel of guarded) {
      const code = stripComments(readFileSync(path.join(root, rel), 'utf8'));
      expect(code, `${rel} 仍在使用 Math.random`).not.toMatch(/Math\.random/);
    }
  });
});
