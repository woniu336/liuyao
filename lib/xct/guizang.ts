import { Trigram, HexagramPair } from './types';
import { TRIGRAM_BITS } from './constants';

/**
 * 将 3 个布尔/数字爻位转换为卦名
 * [初爻, 二爻, 三爻] (1为阳，0为阴)
 */
export function bitsToTrigram(bits: [number, number, number]): Trigram {
  for (const [trigram, b] of Object.entries(TRIGRAM_BITS)) {
    if (b[0] === bits[0] && b[1] === bits[1] && b[2] === bits[2]) {
      return trigram as Trigram;
    }
  }
  return '乾';
}

/**
 * 归藏法：两卦逐爻异或（同性为阴0，异性为阳1）
 * 归藏易核心算子：3-bit XOR
 */
export function guizang(t1: Trigram, t2: Trigram): Trigram {
  const b1 = TRIGRAM_BITS[t1];
  const b2 = TRIGRAM_BITS[t2];
  const res: [number, number, number] = [
    b1[0] === b2[0] ? 0 : 1,
    b1[1] === b2[1] ? 0 : 1,
    b1[2] === b2[2] ? 0 : 1,
  ];
  return bitsToTrigram(res);
}

/**
 * 四卦连环归藏：(t1 ^ t2) ^ (t3 ^ t4)
 */
export function guizangFour(t1: Trigram, t2: Trigram, t3: Trigram, t4: Trigram): Trigram {
  const g12 = guizang(t1, t2);
  const g34 = guizang(t3, t4);
  return guizang(g12, g34);
}

/**
 * 求重卦的互卦
 * 下互：二、三、四爻；上互：三、四、五爻
 */
export function calculateHuGua(hex: HexagramPair): HexagramPair {
  const lowerBits = TRIGRAM_BITS[hex.lower];
  const upperBits = TRIGRAM_BITS[hex.upper];
  // 6 爻自下而上排列 [1, 2, 3, 4, 5, 6] 对应索引 [0, 1, 2, 3, 4, 5]
  const sixLines = [...lowerBits, ...upperBits];

  // 下互取 2, 3, 4 爻（索引 1, 2, 3）
  const lowerHuBits: [number, number, number] = [sixLines[1], sixLines[2], sixLines[3]];
  // 上互取 3, 4, 5 爻（索引 2, 3, 4）
  const upperHuBits: [number, number, number] = [sixLines[2], sixLines[3], sixLines[4]];

  return {
    lower: bitsToTrigram(lowerHuBits),
    upper: bitsToTrigram(upperHuBits),
  };
}
