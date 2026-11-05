/**
 * 六十四卦索引与检索（手动指定用）
 * ================================
 * 手动指定的交互改成「可输入的下拉」：直接打字过滤，或用方向键在列表里挑。
 * 这里只提供纯数据与纯函数，UI 在 components/cast/GuaCombobox.tsx。
 */

import { SIXTY_FOUR_HEXAGRAMS, type TrigramName } from '@/lib/liuyao/najia';

export interface GuaEntry {
  binary: string;
  /** 全名，如「天风姤」 */
  name: string;
  /** 简称，如「姤」 */
  short: string;
  palace: TrigramName;
  rank: number;
  upper: string;
  lower: string;
}

const TRIGRAM_NAME: Record<string, string> = {
  '111': '乾',
  '110': '兑',
  '101': '离',
  '100': '震',
  '011': '巽',
  '010': '坎',
  '001': '艮',
  '000': '坤',
};

export const ALL_GUA: GuaEntry[] = Object.entries(SIXTY_FOUR_HEXAGRAMS).map(([binary, info]) => ({
  binary,
  name: info.name,
  // 「乾为天」→「乾」；「天风姤」→「姤」
  short: info.name.length >= 3 ? info.name.slice(2) : info.name,
  palace: info.palace,
  rank: info.rank,
  upper: TRIGRAM_NAME[binary.slice(3, 6)] ?? '',
  lower: TRIGRAM_NAME[binary.slice(0, 3)] ?? '',
}));

/** 八宫顺序（乾坎艮震巽离坤兑），用于列表排序 */
const PALACE_ORDER: TrigramName[] = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑'];

export const ALL_GUA_SORTED: GuaEntry[] = [...ALL_GUA].sort(
  (a, b) => PALACE_ORDER.indexOf(a.palace) - PALACE_ORDER.indexOf(b.palace) || a.rank - b.rank,
);

export function guaByBinary(binary: string): GuaEntry | undefined {
  return ALL_GUA.find((g) => g.binary === binary);
}

/** 两卦逐爻比对 → 动爻位（1..6，自初爻起） */
export function movingBetween(benBinary: string, zhiBinary: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < 6; i += 1) if (benBinary[i] !== zhiBinary[i]) out.push(i + 1);
  return out;
}

/** 由上下卦（三爻二进制串）拼 6 位二进制：初爻在下 */
export function binaryOf(upper: string, lower: string): string {
  return `${lower}${upper}`;
}

/**
 * 检索：全名、简称、宫名、上下卦组合（如「乾上兑下」）都能命中。
 * 空串返回全部（按八宫序）。
 */
export function searchGua(query: string): GuaEntry[] {
  const q = query.trim();
  if (!q) return ALL_GUA_SORTED;
  const lower = q.toLowerCase();
  return ALL_GUA_SORTED.filter((g) => {
    if (g.name.includes(q)) return true;
    if (g.short === q || g.short.includes(q)) return true;
    if (`${g.palace}宫`.includes(q)) return true;
    if (`${g.upper}上${g.lower}下`.includes(q)) return true;
    if (g.binary.includes(q.replace(/[^01]/g, '')) && /^[01]+$/.test(q)) return true;
    if (g.name.toLowerCase().includes(lower)) return true;
    return false;
  });
}
