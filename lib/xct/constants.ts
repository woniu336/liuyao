import { Trigram, PalaceNumber, FourImagesMode, EightVerdicts } from './types';

/** 八卦三爻二进制定义 [初爻, 二爻, 三爻] (1为阳爻，0为阴爻) */
export const TRIGRAM_BITS: Record<Trigram, [number, number, number]> = {
  乾: [1, 1, 1],
  兑: [1, 1, 0],
  离: [1, 0, 1],
  震: [1, 0, 0],
  巽: [0, 1, 1],
  坎: [0, 1, 0],
  艮: [0, 0, 1],
  坤: [0, 0, 0],
};

/** 八卦卦名列表 */
export const ALL_TRIGRAMS: Trigram[] = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

/** 后天八卦九宫地盘映射 */
export const PALACE_TO_GUA: Record<PalaceNumber, string> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  5: '中',
  6: '乾',
  7: '兑',
  8: '艮',
  9: '离',
};

/** 后天八卦各卦对应的地盘本宫号 */
export const GUA_TO_PALACE: Record<Trigram, PalaceNumber> = {
  坎: 1,
  坤: 2,
  震: 3,
  巽: 4,
  乾: 6,
  兑: 7,
  艮: 8,
  离: 9,
};

/** 九宫中文名 */
export const PALACE_NAMES: Record<PalaceNumber, string> = {
  1: '坎一宫',
  2: '坤二宫',
  3: '震三宫',
  4: '巽四宫',
  5: '中五宫',
  6: '乾六宫',
  7: '兑七宫',
  8: '艮八宫',
  9: '离九宫',
};

/** 宫位五行属性 */
export const PALACE_WUXING: Record<PalaceNumber, string> = {
  1: '水',
  2: '土',
  3: '木',
  4: '木',
  5: '土',
  6: '金',
  7: '金',
  8: '土',
  9: '火',
};

/** 八卦阴阳：阳卦(乾震坎艮)为true，阴卦(坤巽离兑)为false */
export const TRIGRAM_YANG: Record<Trigram, boolean> = {
  乾: true,
  震: true,
  坎: true,
  艮: true,
  坤: false,
  巽: false,
  离: false,
  兑: false,
};

/**
 * 八卦升降律（霍斐然小成图公理）：
 * 乾震艮升，坤巽兑降；
 * 水火互根，离火独升，坎水独降。
 * 升为 true，降为 false。
 */
export const TRIGRAM_RISING: Record<Trigram, boolean> = {
  乾: true,
  震: true,
  艮: true,
  离: true, // 离虽阴卦，其性炎上，独升
  坤: false,
  巽: false,
  兑: false,
  坎: false, // 坎虽阳卦，其性润下，独降
};

/** 先天八卦数起卦映射 */
export const XIAN_TIAN_NUMBER: Record<number, Trigram> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
};

/** 天地数配卦映射（小成图独门配卦：天一乾、地二坤、天三艮、地四兑、天五坎、地六离、天七震、地八巽、天九乾、地十坤） */
export const TIAN_DI_NUMBER_TO_GUA: Record<number, Trigram> = {
  1: '乾',
  2: '坤',
  3: '艮',
  4: '兑',
  5: '坎',
  6: '离',
  7: '震',
  8: '巽',
  9: '乾',
  10: '坤',
  0: '坤',
};

/** 高亨宜变法往复循环路径 (初至上、上至初折返往复) */
export const GAO_HENG_PATH = [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1];

/** 地支列表 */
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 64 卦重卦名称速查矩阵 [上卦][下卦] */
export const SIXTY_FOUR_HEXAGRAMS: Record<Trigram, Record<Trigram, string>> = {
  乾: {
    乾: '乾为天',
    兑: '天泽履',
    离: '天火同人',
    震: '天雷无妄',
    巽: '天风姤',
    坎: '天水讼',
    艮: '天山遁',
    坤: '天地否',
  },
  兑: {
    乾: '泽天夬',
    兑: '兑为泽',
    离: '泽火革',
    震: '泽雷随',
    巽: '泽风大过',
    坎: '泽水困',
    艮: '泽山咸',
    坤: '泽地萃',
  },
  离: {
    乾: '火天大有',
    兑: '火泽睽',
    离: '离为火',
    震: '火雷噬嗑',
    巽: '火风鼎',
    坎: '火水未济',
    艮: '火山旅',
    坤: '火地晋',
  },
  震: {
    乾: '雷天大壮',
    兑: '雷泽归妹',
    离: '雷火丰',
    震: '震为雷',
    巽: '雷风恒',
    坎: '雷水解',
    艮: '雷山小过',
    坤: '雷地豫',
  },
  巽: {
    乾: '风天小畜',
    兑: '风泽中孚',
    离: '风火家人',
    震: '风雷益',
    巽: '巽为风',
    坎: '风水涣',
    艮: '风山渐',
    坤: '风地观',
  },
  坎: {
    乾: '水天需',
    兑: '水泽节',
    离: '水火既济',
    震: '水雷屯',
    巽: '水风井',
    坎: '坎为水',
    艮: '水山蹇',
    坤: '水地比',
  },
  艮: {
    乾: '山天大畜',
    兑: '山泽损',
    离: '山火贲',
    震: '山雷颐',
    巽: '山风蛊',
    坎: '山水蒙',
    艮: '艮为山',
    坤: '山地剥',
  },
  坤: {
    乾: '地天泰',
    兑: '地泽临',
    离: '地火明夷',
    震: '地雷复',
    巽: '地风升',
    坎: '地水师',
    艮: '地山谦',
    坤: '坤为地',
  },
};

/** 四象与八断决断字典 */
export const FOUR_IMAGES_VERDICTS: Record<
  FourImagesMode,
  { matched: EightVerdicts; unmatched: EightVerdicts; note: string }
> = {
  阖: {
    matched: '吉',
    unmatched: '凶',
    note: '向心，天地交合收敛（如地天泰，天地交而万物通）',
  },
  辟: {
    matched: '害',
    unmatched: '利',
    note: '离心，天地背离散开（如天地否，天地不交而万物不通）',
  },
  往: {
    matched: '亨',
    unmatched: '悔',
    note: '上升外引，向外发展推进；悔为吉之渐，历经波折转为吉',
  },
  来: {
    matched: '贞',
    unmatched: '吝',
    note: '下降内引，向内收聚回归；贞为正固守常，吝为阻滞不足',
  },
};

/** 天盘寻卦标准巡查顺序 (原著宗法) */
export const SEEK_ORDER: PalaceNumber[] = [9, 1, 3, 7, 4, 2, 8, 6];

/** 八卦对待相错映射 (旁推法：天地定位、山泽通气、雷风相薄、水火不相射) */
export const OPPOSITE_TRIGRAM: Record<Trigram, Trigram> = {
  乾: '坤',
  坤: '乾',
  艮: '兑',
  兑: '艮',
  震: '巽',
  巽: '震',
  坎: '离',
  离: '坎',
};

/** 后天八卦数映射（坎1、坤2、震3、巽4、乾6、兑7、艮8、离9） */
export const HOU_TIAN_NUMBER: Record<number, Trigram> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  6: '乾',
  7: '兑',
  8: '艮',
  9: '离',
};

/** 卦名转后天数 */
export const GUA_TO_HOU_TIAN_NUMBER: Record<Trigram, number> = {
  坎: 1,
  坤: 2,
  震: 3,
  巽: 4,
  乾: 6,
  兑: 7,
  艮: 8,
  离: 9,
};

/** 卦名转先天数 */
export const GUA_TO_XIAN_TIAN_NUMBER: Record<Trigram, number> = {
  乾: 1,
  兑: 2,
  离: 3,
  震: 4,
  巽: 5,
  坎: 6,
  艮: 7,
  坤: 8,
};

/**
 * 后天八卦九宫所配地支映射：
 * 坎一宫：子
 * 艮八宫：丑、寅
 * 震三宫：卯
 * 巽四宫：辰、巳
 * 离九宫：午
 * 坤二宫：未、申
 * 兑七宫：酉
 * 乾六宫：戌、亥
 * 中五宫：寄旺于四季辰戌丑未
 */
export const PALACE_TO_BRANCHES: Record<PalaceNumber, string[]> = {
  1: ['子'],
  2: ['未', '申'],
  3: ['卯'],
  4: ['辰', '巳'],
  5: ['辰', '戌', '丑', '未'],
  6: ['戌', '亥'],
  7: ['酉'],
  8: ['丑', '寅'],
  9: ['午'],
};

/** 地支所属后天八宫映射 */
export const BRANCH_TO_PALACE: Record<string, PalaceNumber> = {
  '子': 1,
  '丑': 8,
  '寅': 8,
  '卯': 3,
  '辰': 4,
  '巳': 4,
  '午': 9,
  '未': 2,
  '申': 2,
  '酉': 7,
  '戌': 6,
  '亥': 6,
};

