/**
 * 高亨宜变法（小成图 · 铜钱起卦专用）
 * =====================================
 * 依据《霍氏周易正解》/ 资料 `xiao_cheng_tu_master_knowledge_base.md` §4.3：
 *   三钱六掷成六爻（老阳 9、少阳 7、少阴 8、老阴 6）。
 *   遇「多爻变动」或「六爻安静」时，用小成图融合的高亨宜变法取宜变之爻。
 *   天地之数五十有五，减去六爻营数之和（55 − Σ），
 *   沿 [初,二,三,四,五,上,上,五,四,三,二,初] 之字折返巡查，数尽定爻位。
 *
 * 与本仓库六爻体系的边界：
 *   - 六爻的动爻即「本卦与之卦同位阴阳相异」；
 *   - 小成图只需要「本卦 + 之卦」这对结构原料，因此：
 *       有动爻 → 之卦由动爻定；
 *       六爻安静 → 无之卦，用宜变之爻翻一爻立之卦（资料 §4.3 的口径）；
 *       多爻动 → 之卦仍由动爻定，宜变爻只作参看（不夺动爻之实，避免自造规则）。
 *
 * 注意：宜变法在六爻体系里是「取哪一爻辞为断」的口径，与小成图无关；
 * 小成图只借它来获得一个可立的之卦与一条可核对的盘面注记。
 */

import { TRIGRAM_BITS } from './constants';
import type { HexagramPair, Trigram } from './types';

export interface YiBianResult {
  /** 宜变之爻（1..6）；无则 null */
  position: number | null;
  /** 营数之和 */
  sum: number;
  /** 动爻数量（推定，由本卦与之卦同位比较而来） */
  movingCount: number;
  note: string;
}

const PATH = [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1] as const;
const YAO_NAMES = ['初', '二', '三', '四', '五', '上'];

export function calculateYiBian(ying: number[]): YiBianResult {
  const movingCount = ying.filter((v) => v === 9 || v === 6).length;
  const sum = ying.reduce((a, b) => a + b, 0);

  if (movingCount === 6) {
    return { position: null, sum, movingCount, note: '六爻皆动，无宜变，之卦由六爻尽变而定' };
  }

  const remainder = 55 - sum;
  const idx = ((remainder - 1) % 12 + 12) % 12;
  const position = PATH[idx];
  return {
    position,
    sum,
    movingCount,
    note: `营数合 ${sum} · 55 − ${sum} = ${remainder} · 之字往复止于第${YAO_NAMES[position - 1]}爻`,
  };
}

function bitsOf(pair: HexagramPair): number[] {
  return [...TRIGRAM_BITS[pair.lower], ...TRIGRAM_BITS[pair.upper]];
}

function pairOf(bits: number[]): HexagramPair {
  const toTrigram = (b: number[]): Trigram => {
    const key = b.join('');
    const found = (Object.keys(TRIGRAM_BITS) as Trigram[]).find((t) => TRIGRAM_BITS[t].join('') === key);
    if (!found) throw new Error(`非法三爻：${key}`);
    return found;
  };
  return { lower: toTrigram(bits.slice(0, 3)), upper: toTrigram(bits.slice(3, 6)) };
}

/** 动爻位（1..6）：本卦与之卦同位阴阳相异者 */
export function movingPositions(ben: HexagramPair, zhi: HexagramPair): number[] {
  const a = bitsOf(ben);
  const b = bitsOf(zhi);
  return a.flatMap((bit, i) => (bit !== b[i] ? [i + 1] : []));
}

/** 由本卦与动爻（或宜变爻）翻爻得之卦 */
export function flipTo(pair: HexagramPair, positions: number[]): HexagramPair {
  const bits = bitsOf(pair);
  for (const p of positions) {
    if (p < 1 || p > 6) throw new RangeError(`爻位越界：${p}`);
    bits[p - 1] = bits[p - 1] === 1 ? 0 : 1;
  }
  return pairOf(bits);
}

export interface CastStructure {
  ben: HexagramPair;
  /** 之卦；静卦时由宜变爻翻出 */
  zhi: HexagramPair;
  moving: number[];
  yiBian: YiBianResult;
  /** 之卦的来源：动爻 / 宜变法（静卦） */
  zhiSource: 'moving' | 'yibian';
}

/**
 * 由「本卦 + 之卦」推回六爻营数与动爻（手动指定模式用）。
 * 静卦（两卦相同）时，营数全为静爻（7/8），宜变法给出宜变之爻，据此立之卦。
 */
export function structureFromPair(ben: HexagramPair, zhi: HexagramPair): CastStructure {
  const moving = movingPositions(ben, zhi);
  const benBits = bitsOf(ben);

  const ying = benBits.map((bit, i) => {
    const isMoving = moving.includes(i + 1);
    if (bit === 1) return isMoving ? 9 : 7;
    return isMoving ? 6 : 8;
  });

  const yiBian = calculateYiBian(ying);

  if (moving.length === 0) {
    // 静卦：之卦由宜变之爻翻出（资料 §4.3）。无宜变（理论不发生）则原地不动。
    const target = yiBian.position ? [yiBian.position] : [];
    return {
      ben,
      zhi: target.length ? flipTo(ben, target) : zhi,
      moving: target,
      yiBian: {
        ...yiBian,
        note: `${yiBian.note} · 六爻安静，取宜变之爻立之卦`,
      },
      zhiSource: 'yibian',
    };
  }

  return { ben, zhi, moving, yiBian, zhiSource: 'moving' };
}

/** 由投掷值（6/7/8/9，初→上）得本卦与之卦 */
export function structureFromCoins(coins: number[]): CastStructure {
  if (coins.length !== 6) throw new Error('coins 必须为 6 个值');
  const benBits = coins.map((c) => {
    if (c === 7 || c === 9) return 1;
    if (c === 6 || c === 8) return 0;
    throw new Error(`非法投掷值：${c}`);
  });
  const moving = coins.flatMap((c, i) => (c === 6 || c === 9 ? [i + 1] : []));
  const ben = pairOf(benBits);
  const yiBian = calculateYiBian(coins);
  const zhi = flipTo(ben, moving.length ? moving : yiBian.position ? [yiBian.position] : []);
  return {
    ben,
    zhi,
    moving: moving.length ? moving : yiBian.position ? [yiBian.position] : [],
    yiBian: moving.length
      ? yiBian
      : { ...yiBian, note: `${yiBian.note} · 六爻安静，取宜变之爻立之卦` },
    zhiSource: moving.length ? 'moving' : 'yibian',
  };
}
