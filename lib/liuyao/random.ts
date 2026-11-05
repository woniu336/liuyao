/**
 * 起卦随机源（密码学级）
 * =======================
 * 铁律：起卦的每一次投掷都必须来自 Web Crypto（`crypto.getRandomValues`），
 * 不得使用 `Math.random()` —— 后者是 PRNG，可被预测、可复现，断卦结果就失去意义。
 *
 * 均匀性：币面只有「字 / 背」两态。这里不用 `x % 2`（会引入模偏差），
 * 而是**逐位取用 Uint32 的最低有效位**（2^32 可整除 2，天然无偏），
 * 每次调用取 32 枚币面，用完再取，避免频繁系统调用。
 *
 * 可核查：`tossStats()` 会统计字/背与 6/7/8/9 的分布，界面可展示实测频率，
 * 让"是不是真随机"可被用户自己验证，而不是靠信任。
 */

export type CoinFace = 2 | 3; // 2 = 字（阴）, 3 = 背（阳）
export type TossValue = 6 | 7 | 8 | 9;

const hasCrypto = () =>
  typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function';

let bitBuffer: number[] = [];

function nextBits(count: number): number[] {
  if (!hasCrypto()) {
    // 环境不支持 Web Crypto（极旧浏览器 / 非安全上下文）时**必须失败**，
    // 绝不静默回落到 Math.random —— 那会让"随机"变成一句空话。
    throw new Error(
      '当前环境不支持 Web Crypto（crypto.getRandomValues）。起卦需要加密级随机数，请用 https 或更新的浏览器打开。',
    );
  }
  const out: number[] = [];
  while (out.length < count) {
    if (bitBuffer.length === 0) {
      const buf = new Uint32Array(16); // 一次取 16×32 = 512 位
      crypto.getRandomValues(buf);
      for (const word of buf) {
        for (let i = 0; i < 32; i += 1) bitBuffer.push((word >>> i) & 1);
      }
    }
    out.push(bitBuffer.pop() as number);
  }
  return out;
}

/** 单枚铜钱：字(2) / 背(3)，各 50%，无模偏差 */
export function tossCoin(): CoinFace {
  return nextBits(1)[0] === 1 ? 3 : 2;
}

/** 三钱一掷 */
export function tossThree(): [CoinFace, CoinFace, CoinFace] {
  return [tossCoin(), tossCoin(), tossCoin()];
}

/** 三钱一掷 → 爻值（6 老阴 / 7 少阳 / 8 少阴 / 9 老阳） */
export function tossLine(): TossValue {
  const [a, b, c] = tossThree();
  return (a + b + c) as TossValue;
}

/** 连续 n 掷（用于「一键起卦」），一次取足随机位 */
export function tossLines(n: number): TossValue[] {
  if (n <= 0) return [];
  const bits = nextBits(n * 3);
  const out: TossValue[] = [];
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    for (let k = 0; k < 3; k += 1) sum += bits[i * 3 + k] === 1 ? 3 : 2;
    out.push(sum as TossValue);
  }
  return out;
}

/**
 * 0–9 的 n 个数字（小成图「随口报数」用）。
 * 采用拒绝采样：Uint32 不能整除 10，直接取模会有偏差；
 * 这里只接受 < 4294967290（= 2^32 − 6，10 的整数倍）的采样值，其余重采。
 */
export function secureDigits(n: number): string[] {
  if (!hasCrypto()) throw new Error('当前环境不支持 Web Crypto，无法生成加密级随机数。');
  const out: string[] = [];
  const LIMIT = 4294967290; // 10 的倍数，且小于 2^32
  while (out.length < n) {
    const buf = new Uint32Array(Math.max(8, n - out.length));
    crypto.getRandomValues(buf);
    for (const v of buf) {
      if (v >= LIMIT) continue; // 拒绝采样，保证均匀
      out.push(String(v % 10));
      if (out.length === n) break;
    }
  }
  return out;
}

export interface TossStats {
  total: number;
  /** 字面（2）出现次数 */
  faceCounts: Record<2 | 3, number>;
  /** 爻值分布 */
  valueCounts: Record<TossValue, number>;
  /** 字面占比（理想 0.5），用于展示"是否均匀" */
  faceRatio: number;
  /** 与理论值的最大偏差（百分点） */
  maxDeviation: number;
}

const IDEAL: Record<TossValue, number> = {
  6: 1 / 8, // 三枚皆字
  7: 3 / 8, // 一背两字（三阳）
  8: 3 / 8, // 两背一字
  9: 1 / 8, // 三枚皆背
};

/** 自证随机性：真跑 n 次，给出实测分布与偏差 */
export function tossStats(rounds = 3000): TossStats {
  const faceCounts: Record<2 | 3, number> = { 2: 0, 3: 0 };
  const valueCounts: Record<TossValue, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };

  for (let i = 0; i < rounds; i += 1) {
    const bits = nextBits(3);
    let sum = 0;
    for (const b of bits) {
      const face: 2 | 3 = b === 1 ? 3 : 2;
      faceCounts[face] += 1;
      sum += face;
    }
    valueCounts[sum as TossValue] += 1;
  }

  const totalFaces = rounds * 3;
  const faceRatio = faceCounts[2] / totalFaces;
  const maxDeviation = Math.max(
    ...([6, 7, 8, 9] as TossValue[]).map((v) => Math.abs(valueCounts[v] / rounds - IDEAL[v]) * 100),
  );

  return { total: rounds, faceCounts, valueCounts, faceRatio, maxDeviation };
}
