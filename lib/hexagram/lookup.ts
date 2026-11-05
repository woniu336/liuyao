/**
 * 64 卦文王卦序、掩码与全称对照表（客户端完全安全，零 node:fs 依赖，仅 3.8KB）
 */

export interface HexLookupEntry {
  kw: number;
  n: string;
  p: string;
  en: string;
  fullName: string;
}

export const HEXAGRAM_LOOKUP: Record<number, HexLookupEntry> = {
  0: { kw: 2, n: '坤', p: 'kūn', en: 'The Receptive', fullName: '坤为地' },
  1: { kw: 24, n: '复', p: 'fù', en: 'Return (The Turning Point)', fullName: '地雷复' },
  2: { kw: 7, n: '师', p: 'shī', en: 'The Army', fullName: '地水师' },
  3: { kw: 19, n: '临', p: 'lín', en: 'Approach', fullName: '地泽临' },
  4: { kw: 15, n: '谦', p: 'qiān', en: 'Modesty', fullName: '地山谦' },
  5: { kw: 36, n: '明夷', p: 'míng yí', en: 'Darkening of the Light', fullName: '地火明夷' },
  6: { kw: 46, n: '升', p: 'shēng', en: 'Pushing Upward', fullName: '地风升' },
  7: { kw: 11, n: '泰', p: 'tài', en: 'Peace', fullName: '地天泰' },
  8: { kw: 16, n: '豫', p: 'yù', en: 'Enthusiasm', fullName: '雷地豫' },
  9: { kw: 51, n: '震', p: 'zhèn', en: 'The Arousing (Shock, Thunder)', fullName: '震为雷' },
  10: { kw: 40, n: '解', p: 'xiè', en: 'Deliverance', fullName: '雷水解' },
  11: { kw: 54, n: '归妹', p: 'guī mèi', en: 'The Marrying Maiden', fullName: '雷泽归妹' },
  12: { kw: 62, n: '小过', p: 'xiǎo guò', en: 'Preponderance of the Small', fullName: '雷山小过' },
  13: { kw: 55, n: '丰', p: 'fēng', en: 'Abundance [Fullness]', fullName: '雷火丰' },
  14: { kw: 32, n: '恒', p: 'héng', en: 'Duration', fullName: '雷风恒' },
  15: { kw: 34, n: '大壮', p: 'dà zhuàng', en: 'The Power of the Great', fullName: '雷天大壮' },
  16: { kw: 8, n: '比', p: 'bǐ', en: 'Holding Together [Union]', fullName: '水地比' },
  17: { kw: 3, n: '屯', p: 'zhūn', en: 'Difficulty at the Beginning', fullName: '水雷屯' },
  18: { kw: 29, n: '坎', p: 'kǎn', en: 'The Abysmal (Water)', fullName: '坎为水' },
  19: { kw: 60, n: '节', p: 'jié', en: 'Limitation', fullName: '水泽节' },
  20: { kw: 39, n: '蹇', p: 'jiǎn', en: 'Obstruction', fullName: '水山蹇' },
  21: { kw: 63, n: '既济', p: 'jì jì', en: 'After Completion', fullName: '水火既济' },
  22: { kw: 48, n: '井', p: 'jǐng', en: 'The Well', fullName: '水风井' },
  23: { kw: 5, n: '需', p: 'xū', en: 'Waiting (Nourishment)', fullName: '水天需' },
  24: { kw: 45, n: '萃', p: 'cuì', en: 'Gathering Together [Massing]', fullName: '泽地萃' },
  25: { kw: 17, n: '随', p: 'suí', en: 'Following', fullName: '泽雷随' },
  26: { kw: 47, n: '困', p: 'kùn', en: 'Oppression (Exhaustion)', fullName: '泽水困' },
  27: { kw: 58, n: '兑', p: 'duì', en: 'The Joyous, Lake', fullName: '兑为泽' },
  28: { kw: 31, n: '咸', p: 'xián', en: 'Influence (Wooing)', fullName: '泽山咸' },
  29: { kw: 49, n: '革', p: 'gé', en: 'Revolution (Molting)', fullName: '泽火革' },
  30: { kw: 28, n: '大过', p: 'dà guò', en: 'Preponderance of the Great', fullName: '泽风大过' },
  31: { kw: 43, n: '夬', p: 'guài', en: 'Break-through (Resoluteness)', fullName: '泽天夬' },
  32: { kw: 23, n: '剥', p: 'bō', en: 'Splitting Apart', fullName: '山地剥' },
  33: { kw: 27, n: '颐', p: 'yí', en: 'The Corners of the Mouth (Providing Nourishment)', fullName: '山雷颐' },
  34: { kw: 4, n: '蒙', p: 'méng', en: 'Youthful Folly', fullName: '山水蒙' },
  35: { kw: 41, n: '损', p: 'sǔn', en: 'Decrease', fullName: '山泽损' },
  36: { kw: 52, n: '艮', p: 'gèn', en: 'Keeping Still, Mountain', fullName: '艮为山' },
  37: { kw: 22, n: '贲', p: 'bì', en: 'Grace', fullName: '山火贲' },
  38: { kw: 18, n: '蛊', p: 'gǔ', en: 'Work on What Has Been Spoiled [Decay]', fullName: '山风蛊' },
  39: { kw: 26, n: '大畜', p: 'dà chù', en: 'The Taming Power of the Great', fullName: '山天大畜' },
  40: { kw: 35, n: '晋', p: 'jìn', en: 'Progress', fullName: '火地晋' },
  41: { kw: 21, n: '噬嗑', p: 'shì kè', en: 'Biting Through', fullName: '火雷噬嗑' },
  42: { kw: 64, n: '未济', p: 'wèi jì', en: 'Before Completion', fullName: '火水未济' },
  43: { kw: 38, n: '睽', p: 'kuí', en: 'Opposition', fullName: '火泽睽' },
  44: { kw: 56, n: '旅', p: 'lǚ', en: 'The Wanderer', fullName: '火山旅' },
  45: { kw: 30, n: '离', p: 'lí', en: 'The Clinging, Fire', fullName: '离为火' },
  46: { kw: 50, n: '鼎', p: 'dǐng', en: 'The Caldron', fullName: '火风鼎' },
  47: { kw: 14, n: '大有', p: 'dà yǒu', en: 'Possession in Great Measure', fullName: '火天大有' },
  48: { kw: 20, n: '观', p: 'guān', en: 'Contemplation (View)', fullName: '风地观' },
  49: { kw: 42, n: '益', p: 'yì', en: 'Increase', fullName: '风雷益' },
  50: { kw: 59, n: '涣', p: 'huàn', en: 'Dispersion [Dissolution]', fullName: '风水涣' },
  51: { kw: 61, n: '中孚', p: 'zhōng fú', en: 'Inner Truth', fullName: '风泽中孚' },
  52: { kw: 53, n: '渐', p: 'jiàn', en: 'Development (Gradual Progress)', fullName: '风山渐' },
  53: { kw: 37, n: '家人', p: 'jiā rén', en: 'The Family [The Clan]', fullName: '风火家人' },
  54: { kw: 57, n: '巽', p: 'xùn', en: 'The Gentle (The Penetrating, Wind)', fullName: '巽为风' },
  55: { kw: 9, n: '小畜', p: 'xiǎo chù', en: 'The Taming Power of the Small', fullName: '风天小畜' },
  56: { kw: 12, n: '否', p: 'pǐ', en: 'Standstill [Stagnation]', fullName: '天地否' },
  57: { kw: 25, n: '无妄', p: 'wú wàng', en: 'Innocence (The Unexpected)', fullName: '天雷无妄' },
  58: { kw: 6, n: '讼', p: 'sòng', en: 'Conflict', fullName: '天水讼' },
  59: { kw: 10, n: '履', p: 'lǚ', en: 'Treading [Conduct]', fullName: '天泽履' },
  60: { kw: 33, n: '遁', p: 'dùn', en: 'Retreat', fullName: '天山遁' },
  61: { kw: 13, n: '同人', p: 'tóng rén', en: 'Fellowship with Men', fullName: '天火同人' },
  62: { kw: 44, n: '姤', p: 'gòu', en: 'Coming to Meet', fullName: '天风姤' },
  63: { kw: 1, n: '乾', p: 'qián', en: 'The Creative', fullName: '乾为天' },
};

/**
 * 根据掩码查卦象简明信息
 */
export function lookupByMask(mask: number): HexLookupEntry | null {
  return HEXAGRAM_LOOKUP[mask] ?? null;
}

/**
 * 根据文王卦序查掩码 (1..64)
 */
export function maskByKw(kw: number): number | null {
  for (let mask = 0; mask < 64; mask++) {
    if (HEXAGRAM_LOOKUP[mask]?.kw === kw) return mask;
  }
  return null;
}

export interface ResolvedHexagramInfo {
  kw: number;
  name: string;
  fullName: string;
  mask: number;
}

/**
 * 将任意卦名（如"天泽履"、"履卦"、"履"）、文王卦序或掩码解析为统一的标准卦象元数据
 */
export function resolveHexagramInfo(
  input: string | number | undefined | null
): ResolvedHexagramInfo | null {
  if (input === undefined || input === null || input === '') return null;

  // 1. 如果是纯数字（文王卦序 1..64）
  const num = typeof input === 'number' ? input : Number(input);
  if (!isNaN(num) && num >= 1 && num <= 64) {
    const mask = maskByKw(num);
    if (mask !== null) {
      const entry = HEXAGRAM_LOOKUP[mask];
      if (entry) {
        return { kw: entry.kw, name: entry.n, fullName: entry.fullName, mask };
      }
    }
  }

  // 2. 如果是字符串名称
  const str = String(input).trim().replace(/卦$/, '');

  for (let mask = 0; mask < 64; mask++) {
    const entry = HEXAGRAM_LOOKUP[mask];
    if (entry.fullName === str || entry.n === str || entry.fullName.includes(str) || str.includes(entry.n)) {
      return {
        kw: entry.kw,
        name: entry.n,
        fullName: entry.fullName,
        mask,
      };
    }
  }

  return null;
}
