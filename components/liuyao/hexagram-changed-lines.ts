/**
 * 六爻变卦（之卦）完整六爻装卦与六亲排布工具
 * 遵循《增删卜易》、《卜筮正宗》、《火珠林》正统规制：
 * 1. 变卦的内外卦分别按 64 卦权威纳甲装配干支与五行；
 * 2. 变卦所有六爻（包括变动之爻与安静之爻）的六亲，一律严格以【本卦所属之宫】的五行为基准定六亲（生我者父母、我生者子孙、克我者官鬼、我克者妻财、同我者兄弟）；
 * 3. 彻底杜绝直接复刻本卦静爻导致的变卦静爻六亲错谬。
 */

export interface ChangedHexagramLine {
  position: number;
  stem: string;
  branch: string;
  element: string;
  relation: string;
  is_yang: boolean;
  is_void: boolean;
  display: string;
}

/** 64 卦所属宫位及五行映射 */
export const HEXAGRAM_PALACE_MAP: Record<string, { palace: string; element: string }> = {
  // 乾宫 (金)
  '乾为天': { palace: '乾', element: '金' },
  '天风姤': { palace: '乾', element: '金' },
  '天山遁': { palace: '乾', element: '金' },
  '天地否': { palace: '乾', element: '金' },
  '风地观': { palace: '乾', element: '金' },
  '山地剥': { palace: '乾', element: '金' },
  '火地晋': { palace: '乾', element: '金' },
  '火天大有': { palace: '乾', element: '金' },

  // 坎宫 (水)
  '坎为水': { palace: '坎', element: '水' },
  '水泽节': { palace: '坎', element: '水' },
  '水雷屯': { palace: '坎', element: '水' },
  '水火既济': { palace: '坎', element: '水' },
  '泽火革': { palace: '坎', element: '水' },
  '雷火丰': { palace: '坎', element: '水' },
  '地火明夷': { palace: '坎', element: '水' },
  '地水师': { palace: '坎', element: '水' },

  // 艮宫 (土)
  '艮为山': { palace: '艮', element: '土' },
  '山火贲': { palace: '艮', element: '土' },
  '山天大畜': { palace: '艮', element: '土' },
  '山泽损': { palace: '艮', element: '土' },
  '火泽睽': { palace: '艮', element: '土' },
  '天泽履': { palace: '艮', element: '土' },
  '风泽中孚': { palace: '艮', element: '土' },
  '风山渐': { palace: '艮', element: '土' },

  // 震宫 (木)
  '震为雷': { palace: '震', element: '木' },
  '雷地豫': { palace: '震', element: '木' },
  '雷水解': { palace: '震', element: '木' },
  '雷风恒': { palace: '震', element: '木' },
  '地风升': { palace: '震', element: '木' },
  '水风井': { palace: '震', element: '木' },
  '泽风大过': { palace: '震', element: '木' },
  '泽雷随': { palace: '震', element: '木' },

  // 巽宫 (木)
  '巽为风': { palace: '巽', element: '木' },
  '风天小畜': { palace: '巽', element: '木' },
  '风火家人': { palace: '巽', element: '木' },
  '风雷益': { palace: '巽', element: '木' },
  '天雷无妄': { palace: '巽', element: '木' },
  '火雷噬嗑': { palace: '巽', element: '木' },
  '山雷颐': { palace: '巽', element: '木' },
  '山风蛊': { palace: '巽', element: '木' },

  // 离宫 (火)
  '离为火': { palace: '离', element: '火' },
  '火山旅': { palace: '离', element: '火' },
  '火风鼎': { palace: '离', element: '火' },
  '火水未济': { palace: '离', element: '火' },
  '山水蒙': { palace: '离', element: '火' },
  '风水涣': { palace: '离', element: '火' },
  '天水讼': { palace: '离', element: '火' },
  '天火同人': { palace: '离', element: '火' },

  // 坤宫 (土)
  '坤为地': { palace: '坤', element: '土' },
  '地雷复': { palace: '坤', element: '土' },
  '地泽临': { palace: '坤', element: '土' },
  '地天泰': { palace: '坤', element: '土' },
  '雷天大壮': { palace: '坤', element: '土' },
  '泽天夬': { palace: '坤', element: '土' },
  '水天需': { palace: '坤', element: '土' },
  '水地比': { palace: '坤', element: '土' },

  // 兑宫 (金)
  '兑为泽': { palace: '兑', element: '金' },
  '泽水困': { palace: '兑', element: '金' },
  '泽地萃': { palace: '兑', element: '金' },
  '泽山咸': { palace: '兑', element: '金' },
  '水山蹇': { palace: '兑', element: '金' },
  '地山谦': { palace: '兑', element: '金' },
  '雷山小过': { palace: '兑', element: '金' },
  '雷泽归妹': { palace: '兑', element: '金' },
};

/** 64 卦上卦与下卦八卦名对照表 [上卦, 下卦] */
export const UPPER_LOWER_TRIGRAM_MAP: Record<string, [string, string]> = {
  乾为天: ['乾', '乾'], 天风姤: ['乾', '巽'], 天山遁: ['乾', '艮'], 天地否: ['乾', '坤'],
  风地观: ['巽', '坤'], 山地剥: ['艮', '坤'], 火地晋: ['离', '坤'], 火天大有: ['离', '乾'],
  坎为水: ['坎', '坎'], 水泽节: ['坎', '兑'], 水雷屯: ['坎', '震'], 水火既济: ['坎', '离'],
  泽火革: ['兑', '离'], 雷火丰: ['震', '离'], 地火明夷: ['坤', '离'], 地水师: ['坤', '坎'],
  艮为山: ['艮', '艮'], 山火贲: ['艮', '离'], 山天大畜: ['艮', '乾'], 山泽损: ['艮', '兑'],
  火泽睽: ['离', '兑'], 天泽履: ['乾', '兑'], 风泽中孚: ['巽', '兑'], 风山渐: ['巽', '艮'],
  震为雷: ['震', '震'], 雷地豫: ['震', '坤'], 雷水解: ['震', '坎'], 雷风恒: ['震', '巽'],
  地风升: ['坤', '巽'], 水风井: ['坎', '巽'], 泽风大过: ['兑', '巽'], 泽雷随: ['兑', '震'],
  巽为风: ['巽', '巽'], 风天小畜: ['巽', '乾'], 风火家人: ['巽', '离'], 风雷益: ['巽', '震'],
  天雷无妄: ['乾', '震'], 火雷噬嗑: ['离', '震'], 山雷颐: ['艮', '震'], 山风蛊: ['艮', '巽'],
  离为火: ['离', '离'], 火山旅: ['离', '艮'], 火风鼎: ['离', '巽'], 火水未济: ['离', '坎'],
  山水蒙: ['艮', '坎'], 风水涣: ['巽', '坎'], 天水讼: ['乾', '坎'], 天火同人: ['乾', '离'],
  坤为地: ['坤', '坤'], 地雷复: ['坤', '震'], 地泽临: ['坤', '兑'], 地天泰: ['坤', '乾'],
  雷天大壮: ['震', '乾'], 泽天夬: ['兑', '乾'], 水天需: ['坎', '乾'], 水地比: ['坎', '坤'],
  兑为泽: ['兑', '兑'], 泽水困: ['兑', '坎'], 泽地萃: ['兑', '坤'], 泽山咸: ['兑', '艮'],
  水山蹇: ['坎', '艮'], 地山谦: ['坤', '艮'], 雷山小过: ['震', '艮'], 雷泽归妹: ['震', '兑'],
};

/** 八卦纳甲装卦规则：宫名 -> { 内卦三爻(初/二/三), 外卦三爻(四/五/六) } */
export const NAJIA_RULES: Record<string, { inner: [string, string, string][]; outer: [string, string, string][] }> = {
  乾: {
    inner: [['甲', '子', '水'], ['甲', '寅', '木'], ['甲', '辰', '土']],
    outer: [['壬', '午', '火'], ['壬', '申', '金'], ['壬', '戌', '土']],
  },
  坎: {
    inner: [['戊', '寅', '木'], ['戊', '辰', '土'], ['戊', '午', '火']],
    outer: [['戊', '申', '金'], ['戊', '戌', '土'], ['戊', '子', '水']],
  },
  艮: {
    inner: [['丙', '辰', '土'], ['丙', '午', '火'], ['丙', '申', '金']],
    outer: [['丙', '戌', '土'], ['丙', '子', '水'], ['丙', '寅', '木']],
  },
  震: {
    inner: [['庚', '子', '水'], ['庚', '寅', '木'], ['庚', '辰', '土']],
    outer: [['庚', '午', '火'], ['庚', '申', '金'], ['庚', '戌', '土']],
  },
  巽: {
    inner: [['辛', '丑', '土'], ['辛', '亥', '水'], ['辛', '酉', '金']],
    outer: [['辛', '未', '土'], ['辛', '巳', '火'], ['辛', '卯', '木']],
  },
  离: {
    inner: [['己', '卯', '木'], ['己', '丑', '土'], ['己', '亥', '水']],
    outer: [['己', '酉', '金'], ['己', '未', '土'], ['己', '巳', '火']],
  },
  坤: {
    inner: [['乙', '未', '土'], ['乙', '巳', '火'], ['乙', '卯', '木']],
    outer: [['癸', '丑', '土'], ['癸', '亥', '水'], ['癸', '酉', '金']],
  },
  兑: {
    inner: [['丁', '巳', '火'], ['丁', '卯', '木'], ['丁', '丑', '土']],
    outer: [['丁', '亥', '水'], ['丁', '酉', '金'], ['丁', '未', '土']],
  },
};

/** 八卦爻画极性（初爻、二爻、三爻，true 为阳，false 为阴） */
export const TRIGRAM_YANG_LINES: Record<string, [boolean, boolean, boolean]> = {
  乾: [true, true, true],
  兑: [true, true, false],
  离: [true, false, true],
  震: [true, false, false],
  巽: [false, true, true],
  坎: [false, true, false],
  艮: [false, false, true],
  坤: [false, false, false],
};

/** 本宫五行 -> 爻五行 -> 六亲 严整关系对照表 */
export const ELEMENT_TO_RELATION: Record<string, Record<string, string>> = {
  金: { 金: '兄弟', 水: '子孙', 木: '妻财', 火: '官鬼', 土: '父母' },
  木: { 木: '兄弟', 火: '子孙', 土: '妻财', 金: '官鬼', 水: '父母' },
  水: { 水: '兄弟', 木: '子孙', 火: '妻财', 土: '官鬼', 金: '父母' },
  火: { 火: '兄弟', 土: '子孙', 金: '妻财', 水: '官鬼', 木: '父母' },
  土: { 土: '兄弟', 金: '子孙', 水: '妻财', 木: '官鬼', 火: '父母' },
};

/**
 * 计算变卦（之卦）完整 6 爻（动爻与静爻俱全）的标准纳甲、五行与依本宫排定的六亲
 * @param hexagramInfo 本卦与变卦基础信息（包含 base_name, changed_name, palace）
 * @param lines 6 爻列表数据
 * @param voidBranches 旬空地支列表
 * @returns 映射 position (1..6) 到 ChangedHexagramLine 对象的 Map
 */
export function getChangedHexagramLinesMap(
  hexagramInfo: {
    base_name: string;
    changed_name?: string;
    palace?: string;
  },
  lines: Array<{
    position: number;
    is_yang: boolean;
    is_moving: boolean;
    relation?: string;
    element?: string;
    stem?: string;
    branch?: string;
    changed_line?: {
      stem?: string;
      branch?: string;
      element?: string;
      relation?: string;
      is_void?: boolean;
    };
  }>,
  voidBranches: string[] = []
): Map<number, ChangedHexagramLine> {
  const result = new Map<number, ChangedHexagramLine>();
  const changedName = hexagramInfo.changed_name?.trim();
  const hasMoving = lines.some((l) => l.is_moving);

  // 无变卦或无动爻时返回空 Map
  if (!changedName || !hasMoving) {
    return result;
  }

  // 1. 获取变卦的上下卦
  let upperTrigram = '';
  let lowerTrigram = '';

  if (UPPER_LOWER_TRIGRAM_MAP[changedName]) {
    [upperTrigram, lowerTrigram] = UPPER_LOWER_TRIGRAM_MAP[changedName];
  } else {
    // 降级推算：按动爻极性反转生成变卦二进制，并解析上下卦
    const sorted = [...lines].sort((a, b) => a.position - b.position);
    const cBits = sorted.map((l) => (l.is_moving ? !l.is_yang : l.is_yang));
    const lowerBin = `${cBits[0] ? '1' : '0'}${cBits[1] ? '1' : '0'}${cBits[2] ? '1' : '0'}`;
    const upperBin = `${cBits[3] ? '1' : '0'}${cBits[4] ? '1' : '0'}${cBits[5] ? '1' : '0'}`;
    const BIN_TO_TRI: Record<string, string> = {
      '111': '乾', '110': '兑', '101': '离', '100': '震',
      '011': '巽', '010': '坎', '001': '艮', '000': '坤',
    };
    lowerTrigram = BIN_TO_TRI[lowerBin] || '坤';
    upperTrigram = BIN_TO_TRI[upperBin] || '坤';
  }

  const innerNajia = NAJIA_RULES[lowerTrigram]?.inner;
  const outerNajia = NAJIA_RULES[upperTrigram]?.outer;
  if (!innerNajia || !outerNajia) {
    return result;
  }

  const fullNajia = [...innerNajia, ...outerNajia]; // length 6, corresponding to positions 1..6

  // 2. 获取本卦所属之宫的五行（变卦六亲依本卦所属之宫为准）
  let palaceElement = '';
  const palaceInfo = HEXAGRAM_PALACE_MAP[hexagramInfo.base_name];
  if (palaceInfo) {
    palaceElement = palaceInfo.element;
  } else if (hexagramInfo.palace) {
    const cleanP = hexagramInfo.palace.replace('宫', '').trim();
    const PALACE_TO_ELEM: Record<string, string> = {
      乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土',
    };
    palaceElement = PALACE_TO_ELEM[cleanP] || '';
  }

  // 降级：从本卦已有爻推断本宫五行
  if (!palaceElement) {
    for (const l of lines) {
      if (l.relation === '兄弟' && l.element) {
        palaceElement = l.element;
        break;
      }
    }
  }
  if (!palaceElement) {
    palaceElement = '木'; // 安全保底
  }

  const relMap = ELEMENT_TO_RELATION[palaceElement] || ELEMENT_TO_RELATION['木'];
  const lowerYangs = TRIGRAM_YANG_LINES[lowerTrigram] || [false, false, false];
  const upperYangs = TRIGRAM_YANG_LINES[upperTrigram] || [false, false, false];
  const fullYangs = [...lowerYangs, ...upperYangs];

  for (let i = 0; i < 6; i++) {
    const pos = i + 1;
    const [stem, branch, elem] = fullNajia[i];
    const rel = relMap[elem] || '变爻';
    const isYang = fullYangs[i];
    const isVoid = voidBranches.includes(branch);

    // 若该爻为动爻且原数据中已提供 changed_line，融合其特定状态
    const origLine = lines.find((l) => l.position === pos);
    const finalRel = origLine?.is_moving && origLine.changed_line?.relation ? origLine.changed_line.relation : rel;
    const finalStem = origLine?.is_moving && origLine.changed_line?.stem ? origLine.changed_line.stem : stem;
    const finalBranch = origLine?.is_moving && origLine.changed_line?.branch ? origLine.changed_line.branch : branch;
    const finalElem = origLine?.is_moving && origLine.changed_line?.element ? origLine.changed_line.element : elem;

    result.set(pos, {
      position: pos,
      stem: finalStem,
      branch: finalBranch,
      element: finalElem,
      relation: finalRel,
      is_yang: isYang,
      is_void: isVoid,
      display: `${finalRel}${finalStem}${finalBranch}${finalElem}`,
    });
  }

  return result;
}
